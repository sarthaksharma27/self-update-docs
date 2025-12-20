import { Worker } from "bullmq";
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

    // 5️⃣ Log file paths
    console.log(`Found ${files.length} indexable files:`);
    files.forEach((f: any) => console.log(f.path));
  },
  {
    connection: redis,
    concurrency: 2,
  }
);
