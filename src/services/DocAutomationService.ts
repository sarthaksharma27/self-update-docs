import { Octokit } from "@octokit/rest";
import path from "path"; 

interface AutomationConfig {
  installationId: number;
  octokit: Octokit;
  sourceRepo: string;
  sourcePrNumber: number;
  docsRepoOwner: string;
  docsRepoName: string;
  docText: string;      // This is now the SURGICALLY MERGED content
  targetPath: string;   // SENIOR MOVE: Pass the pre-calculated path here
  isHybrid: boolean; 
  fileSha?: string;
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
      targetPath // Use the path passed from index.ts
    } = config;

    console.log(`\n[🚀 DocAutomationService] Starting push for PR #${sourcePrNumber}`);
    console.log(`[Target] Writing to: ${docsRepoOwner}/${docsRepoName} at path: ${targetPath}`);

    const branchName = `docs/update-${sourcePrNumber}-${Date.now()}`;
    
    // --- Git Handshake ---
    const { data: repo } = await octokit.repos.get({ owner: docsRepoOwner, repo: docsRepoName });
    const baseBranch = repo.default_branch;

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
    // Because docText is already merged by the AI, we just write it.
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