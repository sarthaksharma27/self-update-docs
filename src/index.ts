import express from "express";
import bodyParser from "body-parser";
import { getPullRequestFiles, verifySignature } from "./utils/github";
import { classifyDocRelevance } from "./utils/aiClassifier";
import { summarizeDiff } from "./utils/diffSummary";
import { generateDocUpdate } from "./utils/docGenerator";
import { prisma } from './lib/prisma';
import { getInstallationOctokit } from "./utils/octokit";
import { enqueueRepoIndexingJob } from "./queues/enqueueRepoIndexingJob";
import cors from "cors";

const app = express();
const PORT = 8000;

app.use(
  cors({
    origin: [
      "http://localhost:3000",                                                       // for local dev only
      "https://self-update-docs-5z5hszjt2-sarthaks-projects-db83110f.vercel.app",   // for prodouction
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(
  bodyParser.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.get("/api/github/setup", async (req, res) => {
  const installationId = Number(req.query.installation_id);

  if (!installationId) {
    return res.status(400).json({ error: "Missing installation_id" });
  }

  const installationOwner = await prisma.installationOwner.findUnique({
    where: { githubInstallationId: installationId },
    include: { repositories: true },
  });

  if (!installationOwner) {
    return res.json({
      status: "pending",
      repositories: [],
    });
  }

  return res.json({
    status: "ready",
    installationId,
    repositories: installationOwner.repositories.map(r => ({
      id: r.id,
      owner: r.owner,
      name: r.name,
    })),
  });
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

  /**
   * Normalize repos from GitHub payload
   */
  const repoData = repositories.map((repo: any) => {
    const [owner, name] = repo.full_name.split("/");
    return { owner, name };
  });

  /**
   * Check if installation already exists
   */
  const existing = await prisma.installationOwner.findUnique({
    where: {
      githubInstallationId: installation.id,
    },
  });

  if (existing) {
    /**
     * Reactivation case (reinstall)
     * - mark active
     * - clear uninstall date
     * - do NOT duplicate repos
     */
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

  /**
   * Fresh installation
   */
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

  // await enqueueRepoIndexingJob({
  //   installationId: installation.id,
  //   owner: repoOwner,
  //   repo: repoName,
  // });

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
    const installationId = installation.id;

    const installationOwner = await prisma.installationOwner.findUnique({
      where: { githubInstallationId: installationId },
      include: { repositories: true },
    });

    if (!installationOwner || !installationOwner.isActive) {
      return res.status(401).send("Inactive installation");
    }

    if (!installationOwner.repositories || installationOwner.repositories.length === 0) {
      console.error("No repository associated with this installation");
      return res.status(400).send("No repository found for installation");
    }

    const repo = installationOwner.repositories[0];
    const repoOwner = repo.owner;
    const repoName = repo.name;
    const pr = req.body.pull_request;

    const octokit = getInstallationOctokit(installationId);

    const { data: files } = await octokit.pulls.listFiles({
      owner: repoOwner,
      repo: repoName,
      pull_number: pr.number,
    });

    console.log(files);

    const filesForAI = files.map((f) => ({
      filename: f.filename,
      status: f.status,
      patch: f.patch || "",
    }));

    // const result = await classifyDocRelevance(filesForAI);

    // if (!result.doc_relevant || result.confidence < 0.6) {
    //   console.log(`PR is NOT relevant for docs`);
    //   return res.sendStatus(200);
    // }

    console.log(`PR *IS* relevant for docs!`);

    const diffSummary = summarizeDiff(filesForAI);
    console.log("DIFF SUMMARY:", diffSummary);

    const docText = await generateDocUpdate(installationId, diffSummary);

    console.log("GENERATED DOC UPDATE:");
    console.log(docText);

    return res.sendStatus(200);
  }
});

app.get("/", (_req, res) => res.send("this is sarthak from server"));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
