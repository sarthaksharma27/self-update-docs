import express from "express";
import bodyParser from "body-parser";
import { getPullRequestFiles, verifySignature } from "./utils/github";
import { classifyDocRelevance } from "./utils/aiClassifier";
import { summarizeDiff } from "./utils/diffSummary";
import { generateDocUpdate } from "./utils/docGenerator";
import { prisma } from './lib/prisma';
import { getInstallationOctokit } from "./utils/octokit";
import { enqueueRepoIndexingJob } from "./queues/enqueueRepoIndexingJob";
import authRoutes from "./routes/auth";
import authCallbackRoutes from "./routes/authCallback";
import cookieParser from "cookie-parser";
import { RepositoryType } from "@prisma/client";

import cors from "cors";
import { DocAutomationService } from "./services/DocAutomationService";

const app = express();
const PORT = 8000;

app.set('trust proxy', 1); 

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://self-update-docs.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(
  bodyParser.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(cookieParser()); 

app.use("/auth", authRoutes);
app.use("/auth", authCallbackRoutes);


app.get("/github/setup", async (req, res) => {
  const { installation_id, setup_action } = req.query;
  const installationId = Number(installation_id);
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

  console.log(`[Setup] Triggered: Action=${setup_action}, ID=${installationId}`);

  if (!installationId || isNaN(installationId)) {
    return res.redirect(`${FRONTEND_URL}/dashboard?error=invalid_installation`);
  }

  const cookies = req.cookies as { gh_user?: string; gh_account_type?: string };
  let githubLogin = cookies.gh_user;
  const githubAccountType = cookies.gh_account_type || "User";

  if (!githubLogin) {
    console.warn(`[Setup] Cookie missing for ID ${installationId}. Attempting recovery...`);
    
    let recoveredOwner = await prisma.installationOwner.findUnique({
      where: { githubInstallationId: installationId },
      select: { githubLogin: true }
    });

    if (!recoveredOwner) {
      console.log("[Setup] First recovery attempt failed. Waiting for webhook sync...");
      await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s delay
      
      recoveredOwner = await prisma.installationOwner.findUnique({
        where: { githubInstallationId: installationId },
        select: { githubLogin: true }
      });
    }

    if (recoveredOwner) {
      githubLogin = recoveredOwner.githubLogin;
      console.log(`[Setup] Identity recovered via DB: ${githubLogin}`);
    }
  }

  if (!githubLogin) {
    console.warn("[Setup] Identity recovery failed after retry. Redirecting to dashboard fallback.");
    return res.redirect(`${FRONTEND_URL}/dashboard?setup=pending&id=${installationId}`);
  }

  try {
    await prisma.installationOwner.upsert({
      where: { githubLogin: githubLogin },
      update: { 
        githubInstallationId: installationId,
        isActive: true,
        uninstalledAt: null 
      },
      create: {
        githubLogin: githubLogin,
        githubInstallationId: installationId,
        githubAccountType: githubAccountType, 
        isActive: true
      }
    });

    console.log(`[Setup] Successfully linked ${githubLogin} to installation ${installationId}`);
    return res.redirect(`${FRONTEND_URL}/dashboard?setup=success&id=${installationId}`);
    
  } catch (error) {
    console.error("[Setup] Prisma Upsert Error:", error);
    return res.redirect(`${FRONTEND_URL}/dashboard?error=sync_delayed`);
  }
});

app.patch("/api/repositories/:repoId/type", async (req, res) => {
  const githubLogin = req.cookies.gh_user;
  const { repoId } = req.params;
  const { type } = req.body;

  console.log(`[PATCH] Request received for Repo: ${repoId}`);
  console.log(`[PATCH] Cookie User: ${githubLogin || "MISSING"}`);
  console.log(`[PATCH] Body Type: ${type}`);

  if (!githubLogin) {
    console.error("[PATCH] Error: No gh_user cookie found in request.");
    return res.status(401).json({ error: "Unauthorized: No session cookie found" });
  }

  const validTypes: RepositoryType[] = ["MAIN", "DOCS", "IGNORE", "HYBRID"];
  const upperType = type?.toUpperCase() as RepositoryType;

  if (!validTypes.includes(upperType)) {
    console.error(`[PATCH] Error: Invalid type received: ${type}`);
    return res.status(400).json({ error: "Invalid repository type" });
  }

  try {
    const repository = await prisma.repository.findFirst({
      where: {
        id: repoId,
        installationOwner: {
          githubLogin: githubLogin,
        },
      },
    });

    if (!repository) {
      console.error(`[PATCH] Error: Repo ${repoId} not found for user ${githubLogin}`);
      return res.status(404).json({ 
        error: "Repository not found or access denied",
        debug: { repoId, githubLogin } 
      });
    }

    const updatedRepo = await prisma.repository.update({
      where: { id: repoId },
      data: { type: upperType },
    });

    console.log(`[PATCH] Success: Updated ${repository.name} to ${upperType}`);
    
    return res.json({
      message: "Repository type updated successfully",
      repository: updatedRepo,
    });
  } catch (error) {
    console.error("[PATCH] Prisma Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/user/repositories", async (req, res) => {
  const githubLogin = req.cookies.gh_user;
  if (!githubLogin) return res.status(401).json({ error: "Unauthorized" });

  try {
    const owner = await prisma.installationOwner.findUnique({
      where: { githubLogin },
      include: {
        repositories: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!owner) return res.status(404).json({ error: "Installation not found" });

    return res.json({
      repositories: owner.repositories,
      status: owner.isActive ? "active" : "inactive"
    });
  } catch (error) {
    console.error("Fetch Repos Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/indexing/start", async (req: any, res) => {
  try {
    const ghUser = req.cookies?.gh_user;

    if (!ghUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const installationOwner = await prisma.installationOwner.findUnique({
      where: { githubLogin: ghUser },
      include: { 
        repositories: true 
      },
    });

    if (!installationOwner || !installationOwner.repositories) {
      return res.status(404).json({ error: "Installation not found" });
    }

    const repos = installationOwner.repositories;
    const mainRepos = repos.filter(r => r.type === "MAIN");
    const docsRepos = repos.filter(r => r.type === "DOCS");
    const hybridRepos = repos.filter(r => r.type === "HYBRID");

    let targetRepo;
    let isHybrid = false;

    if (hybridRepos.length === 1) {
      targetRepo = hybridRepos[0];
      isHybrid = true;
    } else if (mainRepos.length === 1 && docsRepos.length === 1) {
      targetRepo = mainRepos[0];
    } else {
      return res.status(400).json({
        error: "Configuration Incomplete",
        message: "Please mark exactly one HYBRID repository OR one MAIN and one DOCS repository.",
      });
    }

    if (targetRepo.indexingStatus === "COMPLETED") {
      return res.status(409).json({ 
        message: "This repository is already indexed." 
      });
    }

    try {
      await enqueueRepoIndexingJob({
        installationId: installationOwner.githubInstallationId,
        owner: targetRepo.owner,
        repo: targetRepo.name,
        repoId: targetRepo.id,
        installationOwnerId: installationOwner.id,
        isHybrid
      });
      
      console.log(`Job enqueued: ${targetRepo.name}`);
    } catch (queueError) {
      console.error("Queue Error:", queueError);
      return res.status(503).json({ error: "Queue service unavailable" });
    }

    const successWorkflowMessage = 
      `Manicule is now indexing your main repository (${targetRepo.name}). ` +
      `We will automatically generate and sync Pull Requests to your documentation repository (${docsRepos[0].name}) ` +
      `whenever new changes are merged into the main branch.`;

    return res.status(200).json({
      success: true,
      title: "Pipeline Activated",
      message: successWorkflowMessage,
    });

  } catch (error) {
    console.error("Indexing start error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});


app.post("/github/webhook", async (req: any, res) => {
  const signature = req.headers["x-hub-signature-256"] as string;

  if (!verifySignature(req.rawBody, signature)) {
    return res.status(401).send("Invalid signature");
  }

  const event = req.headers["x-github-event"];
  const installation = req.body.installation;

 if (event === "installation" && req.body.action === "created") {
  const installation = req.body.installation;
  const repositories = req.body.repositories;

  if (!repositories || repositories.length === 0) {
    console.warn("No repositories in installation payload");
    return res.sendStatus(200);
  }

  const githubLogin =
    typeof installation.account === "object"
      ? installation.account.login
      : installation.account;

  const githubAccountType =
    typeof installation.account === "object"
      ? installation.account.type
      : installation.accountType;

  const repoData = repositories.map((repo: any) => {
    const [owner, name] = repo.full_name.split("/");
    return { owner, name };
  });

  const existing = await prisma.installationOwner.findUnique({
    where: {
      githubInstallationId: installation.id,
    },
  });

  if (existing) {
    await prisma.installationOwner.update({
      where: { id: existing.id },
      data: {
        isActive: true,
        uninstalledAt: null,
      },
    });

    console.log(
      "Reactivated installation for account:",
      githubLogin
    );

    return res.sendStatus(200);
  }

  await prisma.installationOwner.create({
    data: {
      githubInstallationId: installation.id,
      githubLogin,
      githubAccountType,
      isActive: true,
      repositories: {
        createMany: {
          data: repoData,
        },
      },
    },
  });

  console.log(`Created new installation for ${githubLogin} with ${repoData.length} repositories`);

  return res.sendStatus(200);
}

  if (event === "installation" && req.body.action === "deleted") {
    const installationId = installation.id;

    await prisma.installationOwner.updateMany({
      where: { githubInstallationId: installationId },
      data: { isActive: false, uninstalledAt: new Date() },
    });

    console.log("Client deactivated:", installationId);
    return res.sendStatus(200);
  }

  if (event === "pull_request") {
  const { action, pull_request: pr, repository: githubRepo, installation } = req.body;

  const isBotPR = pr.user.type === "Bot" || pr.head.ref.startsWith("docs/update-");
  
  if (isBotPR) {
    console.log(`[Webhook] 🤖 Bot-generated PR detected (#${pr.number}). Skipping to prevent infinite loop.`);
    return res.sendStatus(200);
  }

  // Trace 1: Entry point
  console.log(`\n[📡 Webhook Received] Action: ${action} | Repo: ${githubRepo.full_name} | PR: #${pr.number}`);

  if (!["opened", "synchronize"].includes(action)) {
    console.log(`[Webhook] Ignoring action: ${action}`);
    return res.sendStatus(200);
  }

  const installationId = installation.id;
  const repoOwner = githubRepo.owner.login;
  const repoName = githubRepo.name;

  // Trace 2: Database Lookup
  console.log(`[DB] Looking up installation owner for ID: ${installationId}...`);
  const ownerData = await prisma.installationOwner.findUnique({
    where: { githubInstallationId: installationId },
    include: { 
      repositories: { 
        where: { 
          owner: repoOwner, 
          name: repoName, 
          type: { in: ["MAIN", "HYBRID"] } 
        } 
      } 
    },
  });

  if (!ownerData || ownerData.repositories.length === 0) {
    console.log(`[Webhook] ❌ Skipping: Repo ${repoOwner}/${repoName} is NOT registered as MAIN or HYBRID.`);
    return res.sendStatus(200); 
  }

  const triggeringRepo = ownerData.repositories[0];
  const internalRepoId = triggeringRepo.id; 
  const isHybrid = triggeringRepo.type === "HYBRID";
  
  // Trace 3: Identity Confirmed
  console.log(`[Webhook] ✅ Found Registered Repo. Type: ${triggeringRepo.type} | ID: ${internalRepoId}`);

  const octokit = getInstallationOctokit(installationId);

  // Trace 4: GitHub File Fetching
  console.log(`[GitHub] Fetching file list for PR #${pr.number}...`);
  const { data: files } = await octokit.pulls.listFiles({
    owner: repoOwner,
    repo: repoName,
    pull_number: pr.number,
  });

  const filesForAI = files.map((f) => ({
    filename: f.filename,
    status: f.status,
    patch: f.patch || "",
  }));
  console.log(`[GitHub] Retrieved ${filesForAI.length} files.`);

  // Trace 5: AI Relevance
  console.log(`[AI] Running Relevance Analysis...`);
  const analysis = await classifyDocRelevance(filesForAI);
  console.log(`[AI] Relevant: ${analysis.doc_relevant} | Confidence: ${analysis.confidence} | Reason: ${analysis.reason}`);

  if (!analysis.doc_relevant || analysis.confidence < 0.6) {
    console.log(`[AI] ⏩ Skipping doc generation: Not relevant enough.`);
    return res.sendStatus(200);
  }

  const diffSummary = summarizeDiff(filesForAI);
  console.log("[AI] Diff Summary Generated.");
  
  const docText = await generateDocUpdate(internalRepoId, diffSummary);
  console.log(`[AI] Doc Update Content Generated (${docText.length} chars).`);

  // Trace 6: Routing Logic
  let targetOwner: string;
  let targetName: string;

  if (isHybrid) {
    console.log(`[Route] 🔄 HYBRID Mode detected. Target is SAME repo: ${repoOwner}/${repoName}`);
    targetOwner = repoOwner;
    targetName = repoName;
  } else {
    console.log(`[Route] 🛤️ MAIN Mode detected. Searching for separate DOCS repo...`);
    const docsRepoRecord = await prisma.repository.findFirst({
      where: { 
        installationOwnerId: ownerData.id, 
        type: "DOCS" 
      }
    });

    if (!docsRepoRecord) {
      console.error(`[Route] ❌ Error: Standard Mode active but no DOCS repo record found in DB.`);
      return res.sendStatus(200);
    }

    targetOwner = docsRepoRecord.owner;
    targetName = docsRepoRecord.name;
    console.log(`[Route] Found Target DOCS Repo: ${targetOwner}/${targetName}`);
  }

  // Trace 7: Final Execution
  if (targetOwner && targetName) {
    try {
      console.log(`[Service] Triggering DocAutomationService for ${targetOwner}/${targetName}...`);
      const result = await DocAutomationService.pushUpdateToDocsRepo({
        installationId,
        octokit,
        sourceRepo: repoName,
        sourcePrNumber: pr.number,
        docsRepoOwner: targetOwner,
        docsRepoName: targetName,
        docText,
        filesForAI,
        isHybrid
      });

      console.log(`[Service] ✅ Success! PR Created: ${result.prUrl}`);

      const modeText = isHybrid ? "your repository" : "your docs repository";
      await octokit.issues.createComment({
        owner: repoOwner,
        repo: repoName,
        issue_number: pr.number,
        body: `## 🤖 AI Documentation Proposed\n\nI've generated a documentation update in ${modeText}.\n\n**Proposed PR:** ${result.prUrl}\n**Target File:** \`${result.targetPath}\``
      });

    } catch (error: any) {
      console.error(`[Workflow Error] ❌ Critical Failure:`, error.message);
      if (error.response) {
        console.error(`[GitHub API Error] Status: ${error.response.status} | Data:`, error.response.data);
      }
    }
  }

  return res.sendStatus(200);
}
});

app.get("/", (_req, res) => res.send("this is sarthak from server"));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
