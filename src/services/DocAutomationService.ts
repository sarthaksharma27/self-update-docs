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

/**
 * DocAutomationService handles the cross-repository workflow of 
 * moving documentation from the Main repo to the Docs repo.
 */
export class DocAutomationService {
  /**
   * Orchestrates the discovery of the target file and the creation of the PR.
   */
  static async pushUpdateToDocsRepo(config: AutomationConfig) {
    const { octokit, docsRepoOwner, docsRepoName, filesForAI, docText, sourceRepo, sourcePrNumber } = config;

    // 1. Discover existing docs structure (docs.json)
    let docsConfig = "";
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner: docsRepoOwner,
        repo: docsRepoName,
        path: "docs.json",
      });

      // Type narrowing to satisfy the compiler
      if (!Array.isArray(fileData) && "content" in fileData) {
        docsConfig = Buffer.from(fileData.content, 'base64').toString();
      }
    } catch (e) {
      console.log("[DocAutomation] No docs.json found, AI will propose a new path.");
    }

    // 2. Use AI to find where this change belongs
    const targetPath = await determineTargetPath(docsConfig, filesForAI);

    // 3. Git Automation: Branch -> Commit -> PR
    const branchName = `docs/update-${sourcePrNumber}-${Date.now()}`;
    
    // Get default branch (main/master)
    const { data: repo } = await octokit.repos.get({ owner: docsRepoOwner, repo: docsRepoName });
    const baseBranch = repo.default_branch;

    const { data: ref } = await octokit.git.getRef({
      owner: docsRepoOwner,
      repo: docsRepoName,
      ref: `heads/${baseBranch}`,
    });

    // Create New Branch
    await octokit.git.createRef({
      owner: docsRepoOwner,
      repo: docsRepoName,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha,
    });

    // Create/Update the File
    await octokit.repos.createOrUpdateFileContents({
      owner: docsRepoOwner,
      repo: docsRepoName,
      path: targetPath,
      message: `docs: update from ${sourceRepo} PR #${sourcePrNumber}`,
      content: Buffer.from(docText).toString("base64"),
      branch: branchName,
    });

    // Open the Pull Request
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