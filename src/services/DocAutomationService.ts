import { Octokit } from "@octokit/rest";
import { determineTargetPath } from "../utils/pathPicker";

interface AutomationConfig {
  installationId: number;
  octokit: Octokit;
  sourceRepo: string;
  sourcePrNumber: number;
  docsRepoOwner: string;
  docsRepoName: string;
  docText: string;
  filesForAI: any[];
}

export class DocAutomationService {
  static async pushUpdateToDocsRepo(config: AutomationConfig) {
    const { octokit, docsRepoOwner, docsRepoName, filesForAI, docText, sourceRepo, sourcePrNumber } = config;

    let docsConfig = "";
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner: docsRepoOwner,
        repo: docsRepoName,
        path: "docs.json",
      });

      if (!Array.isArray(fileData) && "content" in fileData) {
        docsConfig = Buffer.from(fileData.content, 'base64').toString();
      }
    } catch (e) {
      console.log("[DocAutomation] No docs.json found, AI will propose a new path.");
    }

    const targetPath = await determineTargetPath(docsConfig, filesForAI);

    const branchName = `docs/update-${sourcePrNumber}-${Date.now()}`;
    
    const { data: repo } = await octokit.repos.get({ owner: docsRepoOwner, repo: docsRepoName });
    const baseBranch = repo.default_branch;

    const { data: ref } = await octokit.git.getRef({
      owner: docsRepoOwner,
      repo: docsRepoName,
      ref: `heads/${baseBranch}`,
    });

    await octokit.git.createRef({
      owner: docsRepoOwner,
      repo: docsRepoName,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha,
    });

    await octokit.repos.createOrUpdateFileContents({
      owner: docsRepoOwner,
      repo: docsRepoName,
      path: targetPath,
      message: `docs: update from ${sourceRepo} PR #${sourcePrNumber}`,
      content: Buffer.from(docText).toString("base64"),
      branch: branchName,
    });

    const { data: newPr } = await octokit.pulls.create({
      owner: docsRepoOwner,
      repo: docsRepoName,
      title: `Docs Update: ${sourceRepo} #${sourcePrNumber}`,
      head: branchName,
      base: baseBranch,
      body: `Automated documentation update for ${sourceRepo} PR #${sourcePrNumber}.\n\nThis update targets: \`${targetPath}\``,
    });

    return { prUrl: newPr.html_url, targetPath, prNumber: newPr.number };
  }
}