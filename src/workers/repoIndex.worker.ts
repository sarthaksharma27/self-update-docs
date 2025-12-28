import { Worker, Job } from "bullmq";
import pMap from "p-map";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
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

const BASE_DIR = path.resolve(__dirname, "../../indexed_repos");

function runIndexingContainer(repoRoot: string, repoId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dockerArgs = [
      "run", "--rm",
      "-v", `${repoRoot}:/workspace`,
      "--env-file", path.join(process.cwd(), "cocoindex/.env"),
      "-e", `REPO_ID=${repoId}`,
      "cocoindex-indexer:latest",
      "-f"
    ];

    console.log(`Launching container for repo: ${repoId}`);
    
    const child = spawn("docker", dockerArgs);

    child.stdout.on("data", (data) => console.log(`[Docker]: ${data}`));
    child.stderr.on("data", (data) => console.error(`[Docker-Err]: ${data}`));

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Docker process exited with code ${code}`));
    });
  });
}

new Worker(
  "repo-index",
  async (job: Job<RepoIndexingData>) => {
    const { installationId, owner, repo, repoId, installationOwnerId } = job.data;

    if (!repoId || !installationOwnerId) {
      console.error("Missing critical identifiers for job:", job.id);
      return; 
    }

    const repoRoot = path.join(BASE_DIR, `tenant_${installationOwnerId}`, `repo_${repoId}`);

    try {
      await prisma.repository.update({
        where: { id: repoId },
        data: { indexingStatus: "DOWNLOADING" },
      });

      const octokit = getInstallationOctokit(installationId);
      const { data: repoData } = await octokit.repos.get({ owner, repo });
      const { data: treeData } = await octokit.git.getTree({
        owner, repo, tree_sha: repoData.default_branch, recursive: "1",
      });

      await fs.rm(repoRoot, { recursive: true, force: true });
      await fs.mkdir(repoRoot, { recursive: true });

      await pMap(treeData.tree, async (node: any) => {
        if (node.type !== "blob") return;
        const { data } = await octokit.repos.getContent({
          owner, repo, path: node.path, ref: repoData.default_branch,
        });
        if (!("content" in data) || !data.content) return;
        const filePath = path.join(repoRoot, node.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, Buffer.from(data.content, "base64").toString("utf-8"));
      }, { concurrency: 5 });

      await prisma.repository.update({
        where: { id: repoId },
        data: { indexingStatus: "DOWNLOADED" },
      });

      await prisma.repository.update({
        where: { id: repoId },
        data: { indexingStatus: "INDEXING" },
      });

      await runIndexingContainer(repoRoot, repoId);

      await prisma.repository.update({
        where: { id: repoId },
        data: { 
          indexingStatus: "COMPLETED",
          lastIndexedAt: new Date(),
          errorMessage: null
        },
      });

      console.log(`✅ Indexing Pipeline Finished for ${owner}/${repo}`);

    } catch (error: any) {
      console.error(`Worker Error for ${repoId}:`, error);
      await prisma.repository.update({
        where: { id: repoId },
        data: { 
          indexingStatus: "FAILED",
          errorMessage: error.message || "Unknown pipeline error"
        },
      });
      throw error; 
    }
  },
  { connection: redis, concurrency: 2 }
);