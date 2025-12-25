import { Worker, Job } from "bullmq";
import pMap from "p-map";
import fs from "fs/promises";
import path from "path";
import { redis } from "../lib/redis";
import { getInstallationOctokit } from "../utils/octokit";
import { prisma } from "../lib/prisma";

// Define the contract for the job data
export interface RepoIndexingData {
  installationId: number;
  owner: string;
  repo: string;
  repoId: string;
  installationOwnerId: string; // Required for multi-tenant isolation
}

const BASE_DIR = path.resolve(__dirname, "../../indexed_repos");

new Worker(
  "repo-index",
  async (job: Job<RepoIndexingData>) => {
    const { installationId, owner, repo, repoId, installationOwnerId } = job.data;

    // Senior Move: Validation Guard Clause
    // Never trust that the producer sent the right data.
    if (!repoId || !installationOwnerId) {
      console.error("❌ Missing critical identifiers for job:", job.id);
      return; 
    }

    console.log(`🚀 Starting download for: ${owner}/${repo}`);

    // Create an isolated path for this specific repository
    // Format: BASE_DIR/tenant_UUID/repo_UUID
    const repoRoot = path.join(
      BASE_DIR,
      `tenant_${installationOwnerId}`,
      `repo_${repoId}`
    );

    try {
      // 1️⃣ Update state to DOWNLOADING
      await prisma.repository.update({
        where: { id: repoId },
        data: { indexingStatus: "DOWNLOADING" },
      });

      const octokit = getInstallationOctokit(installationId);

      // 2️⃣ Get default branch
      const { data: repoData } = await octokit.repos.get({ owner, repo });
      const defaultBranch = repoData.default_branch;

      // 3️⃣ Fetch repo tree
      const { data: treeData } = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: defaultBranch,
        recursive: "1",
      });

      // 4️⃣ Idempotency Check: Clean the folder before starting
      // This ensures a failed/retried job doesn't have stale files
      await fs.rm(repoRoot, { recursive: true, force: true });
      await fs.mkdir(repoRoot, { recursive: true });

      // 5️⃣ Fetch and write files with controlled concurrency
      await pMap(
        treeData.tree,
        async (node: any) => {
          if (node.type !== "blob") return;

          try {
            const { data } = await octokit.repos.getContent({
              owner,
              repo,
              path: node.path,
              ref: defaultBranch,
            });

            if (!("content" in data) || !data.content) return;

            const filePath = path.join(repoRoot, node.path);
            
            // Ensure subdirectories exist
            await fs.mkdir(path.dirname(filePath), { recursive: true });

            const content = Buffer.from(data.content, "base64").toString("utf-8");
            await fs.writeFile(filePath, content, "utf-8");
          } catch (err) {
            console.warn(`⚠️ Failed to download file: ${node.path}`);
          }
        },
        { concurrency: 5 }
      );

      // 6️⃣ Update state to DOWNLOADED
      await prisma.repository.update({
        where: { id: repoId },
        data: { indexingStatus: "DOWNLOADED" },
      });

      console.log(`✅ Isolation complete. Files secured at: ${repoRoot}`);
    } catch (error: any) {
      console.error(`❌ Worker Error for ${repoId}:`, error);

      // 7️⃣ Update state to FAILED
      await prisma.repository.update({
        where: { id: repoId },
        data: { 
          indexingStatus: "FAILED",
          errorMessage: error.message || "Unknown error during download"
        },
      });

      throw error; // Let BullMQ handle the retry
    }
  },
  {
    connection: redis,
    concurrency: 2, // Limits CPU/Network load
  }
);