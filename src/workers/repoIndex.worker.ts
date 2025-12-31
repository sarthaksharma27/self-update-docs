import { Worker, Job } from "bullmq";
import pMap from "p-map";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process"; 
import { ContainerAppsAPIClient } from "@azure/arm-appcontainers"; 
import { DefaultAzureCredential } from "@azure/identity"; 
import { redis } from "../lib/redis";
import { getInstallationOctokit } from "../utils/octokit";
import { prisma } from "../lib/prisma";

export interface RepoIndexingData {
  installationId: number;
  owner: string;
  repo: string;
  repoId: string;
  installationOwnerId: string;
}

const IS_PROD = process.env.NODE_ENV === "production";
const BASE_DIR = process.env.STORAGE_MOUNT_PATH || path.resolve(__dirname, "../../indexed_repos");

// -----------------------------------------------------------------------------
// STRATEGY 2: AZURE JOB (Orchestration Logic)
// -----------------------------------------------------------------------------
async function runIndexingAzure(): Promise<void> {
  const credential = new DefaultAzureCredential({
    managedIdentityClientId: process.env.AZURE_CLIENT_ID 
  });

  const client = new ContainerAppsAPIClient(credential, process.env.AZURE_SUBSCRIPTION_ID!);
  
  try {
    // SENIOR MOVE: Trigger with an empty overrides object {}.
    // This tells Azure: "Start the job exactly as it is defined in the Portal."
    // This preserves our /workspace volumes and mounts 100% of the time.
    await client.jobs.beginStartAndWait(
      process.env.AZURE_RESOURCE_GROUP!, 
      "cocoindex-indexer-job",
      {} 
    );
    console.log(`🚀 [AZURE] Job signal sent using stable infrastructure.`);
  } catch (err: any) {
    console.error("❌ [AZURE] Start failed:", err.message);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// THE MAIN WORKER
// -----------------------------------------------------------------------------
new Worker(
  "repo-index",
  async (job: Job<RepoIndexingData>) => {
    const { installationId, owner, repo, repoId, installationOwnerId } = job.data;

    if (!repoId || !installationOwnerId) return;

    const relativePath = `tenant_${installationOwnerId}/repo_${repoId}`;
    const repoRoot = path.join(BASE_DIR, relativePath);

    try {
      console.log(`⏱️  Starting Pipeline for ${owner}/${repo}`);

      // 1. Set Status to DOWNLOADING
      await prisma.repository.update({  
        where: { id: repoId },
        data: { indexingStatus: "DOWNLOADING" },
      });

      // 2. Pre-flight check: Is the file share actually there?
      await fs.access(BASE_DIR).catch(() => {
        throw new Error(`CRITICAL: Storage mount ${BASE_DIR} is not accessible.`);
      });

      const octokit = getInstallationOctokit(installationId);
      const { data: repoData } = await octokit.repos.get({ owner, repo });
      const { data: treeData } = await octokit.git.getTree({
        owner, repo, tree_sha: repoData.default_branch, recursive: "1",
      });

      // 3. Prepare Filesystem
      await fs.rm(repoRoot, { recursive: true, force: true });
      await fs.mkdir(repoRoot, { recursive: true });

      // 4. Parallel Download (Concurrency 10 is the senior "sweet spot" for GitHub API)
      let fileCount = 0;
      await pMap(treeData.tree, async (node: any) => {
        if (node.type !== "blob") return;
        const { data } = await octokit.repos.getContent({
          owner, repo, path: node.path, ref: repoData.default_branch,
        });
        if (!("content" in data) || !data.content) return;
        
        const filePath = path.join(repoRoot, node.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, Buffer.from(data.content, "base64").toString("utf-8"));
        fileCount++;
      }, { concurrency: 10 });

      console.log(`✅  Success: Wrote ${fileCount} files to ${repoRoot}`);

      // 5. UPDATE STATE TO 'INDEXING'
      // The Python main.py will look for this status to know what to process.
      await prisma.repository.update({
        where: { id: repoId },
        data: { indexingStatus: "INDEXING" },
      });

      if (IS_PROD) {
        await runIndexingAzure();
      } else {
        console.log(`🏠  [LOCAL] Triggering local indexer for repo_${repoId}`);
        await runIndexingLocal(repoRoot, repoId);
      }

      // Note: In Prod, we don't mark as 'COMPLETED' here anymore. 
      // The Python Job should do that once it finishes the embeddings!
      if (!IS_PROD) {
        await prisma.repository.update({
          where: { id: repoId },
          data: { indexingStatus: "COMPLETED", lastIndexedAt: new Date() },
        });
      }

    } catch (error: any) {
      console.error(`❌  Worker Error:`, error);
      await prisma.repository.update({
        where: { id: repoId },
        data: { indexingStatus: "FAILED", errorMessage: error.message },
      });
      throw error; 
    }
  },
  { connection: redis, concurrency: IS_PROD ? 5 : 2 }
);

function runIndexingLocal(repoRoot: string, repoId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const dockerArgs = ["run", "--rm", "-v", `${path.resolve(repoRoot)}:/workspace`, "-e", `REPO_ID=${repoId}`, "cocoindex-indexer:latest", "-f"];
      const child = spawn("docker", dockerArgs);
      child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`Exit ${code}`)));
    });
}