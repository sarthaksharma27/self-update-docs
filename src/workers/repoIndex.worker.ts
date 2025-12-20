import { Worker } from "bullmq";
import pMap from "p-map";
import fs from "fs/promises";
import path from "path";
import { redis } from "../lib/redis";
import { getInstallationOctokit } from "../utils/octokit";

const BASE_DIR = path.resolve(
  __dirname,
  "../../indexed_repos"
);

new Worker(
  "repo-index",
  async (job) => {
    const { installationId, owner, repo } = job.data;

    console.log("Indexing repo:", owner, repo);

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

    console.log("Repo written to disk:", repoRoot);
  },
  {
    connection: redis,
    concurrency: 2,
  }
);
