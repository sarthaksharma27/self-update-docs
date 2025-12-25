import { Worker } from "bullmq";
import pMap from "p-map";
import fs from "fs/promises";
import path from "path";
import { redis } from "../lib/redis";
import { getInstallationOctokit } from "../utils/octokit";
import { prisma } from "../lib/prisma"; // Assuming prisma is exported here

const BASE_DIR = path.resolve(
  __dirname,
  "../../indexed_repos"
);

new Worker(
  "repo-index",
  async (job) => {
    // Note: Ensure repoId is passed in job.data from the backend route
    const { installationId, owner, repo, repoId } = job.data;

    console.log("Indexing repo:", owner, repo);

    try {
      // 1️⃣ Update state to DOWNLOADING
      await prisma.repository.update({
        where: { id: repoId },
        data: { indexingStatus: "DOWNLOADING" },
      });

      const octokit = getInstallationOctokit(installationId);

      // 1️⃣ Get default branch
      const { data: repoData } = await octokit.repos.get({ owner, repo });
      const defaultBranch = repoData.default_branch;

      // 2️⃣ Fetch repo tree
      const { data: treeData } = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: defaultBranch,
        recursive: "1",
      });

      const repoRoot = path.join(
        BASE_DIR,
        `installation_${installationId}`,
        `${owner}_${repo}`
      );

      // 3️⃣ Fetch and write files
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
            await fs.mkdir(path.dirname(filePath), { recursive: true });

            const content = Buffer.from(
              data.content,
              "base64"
            ).toString("utf-8");

            await fs.writeFile(filePath, content, "utf-8");
          } catch (err) {
            console.warn(`Failed: ${node.path}`);
          }
        },
        { concurrency: 5 }
      );

      // 4️⃣ Update state to DOWNLOADED
      await prisma.repository.update({
        where: { id: repoId },
        data: { indexingStatus: "DOWNLOADED" },
      });

      console.log("Repo written to disk and marked as DOWNLOADED:", repoRoot);
    } catch (error: any) {
      console.error("Worker Error:", error);

      // 5️⃣ Update state to FAILED if any step fails
      await prisma.repository.update({
        where: { id: repoId },
        data: { 
          indexingStatus: "FAILED",
          errorMessage: error.message || "Unknown error during download"
        },
      });

      throw error; // Re-throw for BullMQ retry logic
    }
  },
  {
    connection: redis,
    concurrency: 2,
  }
);