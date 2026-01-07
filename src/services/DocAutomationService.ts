import { Octokit } from "@octokit/rest";
import path from "path"; 

interface AutomationConfig {
  installationId: number;
  octokit: Octokit;
  sourceRepo: string;
  sourcePrNumber: number;
  docsRepoOwner: string;
  docsRepoName: string;
  docText: string;      
  targetPath: string;   
  isHybrid: boolean; 
  fileSha?: string;
  baseBranch: string; // <--- SENIOR MOVE: Receive branch from caller
}

export class DocAutomationService {
  static async pushUpdateToDocsRepo(config: AutomationConfig) {
    const { 
      octokit, 
      docsRepoOwner, 
      docsRepoName, 
      docText, 
      sourceRepo, 
      sourcePrNumber, 
      targetPath,
      baseBranch // Use the passed branch
    } = config;

    console.log(`\n[🚀 DocAutomationService] Starting push for PR #${sourcePrNumber}`);
    console.log(`[Target] Writing to: ${docsRepoOwner}/${docsRepoName} at path: ${targetPath} on branch: ${baseBranch}`);

    const branchName = `docs/update-${sourcePrNumber}-${Date.now()}`;
    
    // --- Git Handshake ---
    // REMOVED: Redundant octokit.repos.get call. We already know the branch.

    console.log(`[GitHub] Creating new branch: "${branchName}" from "${baseBranch}"...`);
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

    // 3. Update File (Atomic Write)
    console.log(`[GitHub] Uploading surgically merged content to "${targetPath}"...`);
    await octokit.repos.createOrUpdateFileContents({
      owner: docsRepoOwner,
      repo: docsRepoName,
      path: targetPath,
      message: `docs: surgical update from ${sourceRepo} PR #${sourcePrNumber}`,
      content: Buffer.from(docText).toString("base64"),
      branch: branchName,
      sha: config.fileSha, // Use existing SHA if updating
    });

    // 4. Create PR
    const { data: newPr } = await octokit.pulls.create({
      owner: docsRepoOwner,
      repo: docsRepoName,
      title: `Docs Update: ${sourceRepo} #${sourcePrNumber}`,
      head: branchName,
      base: baseBranch,
      body: `Automated surgical documentation update for ${sourceRepo} PR #${sourcePrNumber}.\n\nThis update targets: \`${targetPath}\``,
    });

    console.log(`[DocAutomationService] ✅ Process complete. PR: ${newPr.html_url}`);

    return { prUrl: newPr.html_url, targetPath, prNumber: newPr.number };
  }
}