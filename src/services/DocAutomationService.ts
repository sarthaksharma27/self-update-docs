import { Octokit } from "@octokit/rest";
import { determineTargetPath } from "../utils/pathPicker";
import path from "path"; 

interface AutomationConfig {
  installationId: number;
  octokit: Octokit;
  sourceRepo: string;
  sourcePrNumber: number;
  docsRepoOwner: string;
  docsRepoName: string;
  docText: string;
  filesForAI: any[];
  isHybrid: boolean; 
}

export class DocAutomationService {
  static async pushUpdateToDocsRepo(config: AutomationConfig) {
    const { octokit, docsRepoOwner, docsRepoName, filesForAI, docText, sourceRepo, sourcePrNumber, isHybrid } = config;

    console.log(`\n[🚀 DocAutomationService] Starting push for PR #${sourcePrNumber}`);
    console.log(`[Config] Hybrid Mode: ${isHybrid} | Target: ${docsRepoOwner}/${docsRepoName}`);

    // SENIOR MOVE: Determine the subfolder. 
    const docsRoot = isHybrid ? "docs" : "";
    const configPath = path.join(docsRoot, "docs.json").replace(/\\/g, '/');

    console.log(`[Pathing] Documentation Root: "${docsRoot || "root"}"`);
    console.log(`[Pathing] Looking for Mintlify config at: "${configPath}"`);

    let docsConfig = "";
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner: docsRepoOwner,
        repo: docsRepoName,
        path: configPath,
      });

      if (!Array.isArray(fileData) && "content" in fileData) {
        docsConfig = Buffer.from(fileData.content, 'base64').toString();
        console.log(`[GitHub] ✅ Successfully loaded docs.json (${docsConfig.length} bytes)`);
      }
    } catch (e) {
      console.log(`[GitHub] ⚠️ No docs.json found at ${configPath}. AI will rely on file names only.`);
    }

    // 1. Determine the path suggested by AI
    console.log(`[AI] Asking pathPicker to suggest a target file...`);
    const suggestedPath = await determineTargetPath(docsConfig, filesForAI);
    
    console.log(`[AI] 🤖 AI Suggestion: "${suggestedPath}"`);

    // 2. Final Path Construction
    const finalTargetPath = path.join(docsRoot, suggestedPath).replace(/\\/g, '/');
    console.log(`[Pathing] 📍 Final Computed Path: "${finalTargetPath}"`);

    const branchName = `docs/update-${sourcePrNumber}-${Date.now()}`;
    
    // --- Git Handshake Logs ---
    console.log(`[GitHub] Fetching repo default branch...`);
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

    // 3. Update File
    console.log(`[GitHub] Uploading file content to "${finalTargetPath}" on branch "${branchName}"...`);
    await octokit.repos.createOrUpdateFileContents({
      owner: docsRepoOwner,
      repo: docsRepoName,
      path: finalTargetPath,
      message: `docs: update from ${sourceRepo} PR #${sourcePrNumber}`,
      content: Buffer.from(docText).toString("base64"),
      branch: branchName,
    });

    // 4. Create PR
    console.log(`[GitHub] Opening Pull Request...`);
    const { data: newPr } = await octokit.pulls.create({
      owner: docsRepoOwner,
      repo: docsRepoName,
      title: `Docs Update: ${sourceRepo} #${sourcePrNumber}`,
      head: branchName,
      base: baseBranch,
      body: `Automated documentation update for ${sourceRepo} PR #${sourcePrNumber}.\n\nThis update targets: \`${finalTargetPath}\``,
    });

    console.log(`[DocAutomationService] ✅ Process complete. PR: ${newPr.html_url}`);

    return { prUrl: newPr.html_url, targetPath: finalTargetPath, prNumber: newPr.number };
  }
}