import { Worker } from "bullmq";
import pMap from "p-map";
import { redis } from "../lib/redis";
import { getInstallationOctokit } from "../utils/octokit";
import { isIndexableFile } from "../utils/isIndexableFile";

new Worker(
  "repo-index",
  async (job) => {
    const { installationId, owner, repo } = job.data;
    console.log("Indexing repo:", owner, repo);

    // 1️⃣ Get authenticated Octokit for this installation
    const octokit = getInstallationOctokit(installationId);

    // 2️⃣ Fetch the default branch of the repo
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;

    // 3️⃣ Fetch full repo tree recursively
    const { data: treeData } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: defaultBranch,
      recursive: "1",
    });

    // 4️⃣ Filter indexable files
    const files = treeData.tree.filter(
      (f: any) => f.type === "blob" && isIndexableFile(f.path)
    );
    console.log(`Found ${files.length} indexable files.`);

    // 5️⃣ Fetch content of each file concurrently (limit concurrency to avoid rate limits)
    await pMap(
      files,
      async (file) => {
        try {
          const { data: fileData } = await octokit.repos.getContent({
            owner,
            repo,
            path: file.path,
            ref: defaultBranch,
          });

          if ("content" in fileData && fileData.content) {
            // Decode Base64 content
            const content = Buffer.from(fileData.content, "base64").toString("utf-8");
            
            // Log a preview (first 200 chars) of the file
            console.log(`File: ${file.path}`);
            console.log(content.slice(0, 200));
            console.log("----");
          }
        } catch (err) {
          console.warn(`Failed to fetch ${file.path}:`, (err as Error).message);
        }
      },
      { concurrency: 5 } // safely fetch 5 files at a time
    );
  },
  {
    connection: redis,
    concurrency: 2,
  }
);
