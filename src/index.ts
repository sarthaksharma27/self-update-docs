import express from "express";
import bodyParser from "body-parser";
import { getPullRequestFiles, verifySignature } from "./utils/github";
import { classifyDocRelevance } from "./utils/aiClassifier";
import { summarizeDiff } from "./utils/diffSummary";
// import { getRelevantContext } from "./utils/contextRetriever";
import { generateDocUpdate } from "./utils/docGenerator";
import { prisma } from './lib/prisma';
import { getInstallationOctokit } from "./utils/octokit";
import { enqueueRepoIndexingJob } from "./queues/enqueueRepoIndexingJob";

const app = express();
const PORT = 8000;

app.use(
  bodyParser.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.post("/github/webhook", async (req: any, res) => {
  const signature = req.headers["x-hub-signature-256"] as string;

  if (!verifySignature(req.rawBody, signature)) {
    return res.status(401).send("Invalid signature");
  }

  const event = req.headers["x-github-event"];
  const installation = req.body.installation;

  if (event === "installation" && req.body.action === "created") {
  const repoData = req.body.repositories?.[0];

  if (!repoData) {
    console.warn("No repository info in installation payload");
    return res.sendStatus(200);
  }

  const repoOwner = repoData.full_name.split("/")[0];
  const repoName = repoData.full_name.split("/")[1];

  const existing = await prisma.installationOwner.findFirst({
    where: {
      githubLogin:
        typeof installation.account === "object"
          ? installation.account.login
          : installation.account,
      repositories: {
        some: { owner: repoOwner, name: repoName },
      },
    },
    include: { repositories: true },
  });

  if (existing) {
    await prisma.installationOwner.update({
      where: { id: existing.id },
      data: {
        githubInstallationId: installation.id,
        isActive: true,
        uninstalledAt: null,
      },
    });
    console.log(
      "Reactivated existing installation for account:",
      installation.account.login
    );
  } else {
    await prisma.installationOwner.create({
      data: {
        githubInstallationId: installation.id,
        githubLogin:
          typeof installation.account === "object"
            ? installation.account.login
            : installation.account,
        githubAccountType:
          typeof installation.account === "object"
            ? installation.account.type
            : installation.accountType,
        isActive: true,
        repositories: {
          create: { owner: repoOwner, name: repoName },
        },
      },
    });
    console.log("Created new installation for account:", installation.account.login );

    await enqueueRepoIndexingJob({
      installationId: installation.id,
      owner: repoOwner,
      repo: repoName,
    });

  }

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

    // const contextBlocks = await getRelevantContext(diffSummary);
    // console.log("RELEVANT CONTEXT:", contextBlocks);

    // const docText = await generateDocUpdate(diffSummary, contextBlocks);

    // console.log("GENERATED DOC UPDATE:");
    // console.log(docText);

    return res.sendStatus(200);
  }
});


// app.post("/github/webhook", async (req: any, res) => {
//   const signature = req.headers["x-hub-signature-256"] as string;

//   if (!verifySignature(req.rawBody, signature)) {
//     return res.status(401).send("Invalid signature");
//   }

//   const event = req.headers["x-github-event"];
//   if (event !== "pull_request") {
//     return res.sendStatus(200);
//   }

//   const action = req.body.action;
//   if (!["opened", "synchronize"].includes(action)) {
//     return res.sendStatus(200);
//   }

//   const pr = req.body.pull_request;
//   const repo = req.body.repository;

//   const prNumber = pr.number;
//   const baseSha = pr.base.sha;
//   const headSha = pr.head.sha;
//   const owner = repo.owner.login;
//   const repoName = repo.name;

//   console.log({
//     owner,
//     repoName,
//     prNumber,
//     baseSha,
//     headSha,
//   });

//   const files = await getPullRequestFiles(owner, repoName, prNumber);

//   console.log(files);

//    const result = await classifyDocRelevance(files);
//    console.log("AI classification:", result);

//   if (!result.doc_relevant || result.confidence < 0.6) {
//     console.log(`PR #${prNumber} not relevant for docs.`);
//     return res.sendStatus(200);
//   }

//    console.log(`PR #${prNumber} *IS* relevant for docs!`);

//    const diffSummary = summarizeDiff(files);
//    console.log("DIFF SUMMARY:", diffSummary);

//    const contextBlocks = await getRelevantContext(diffSummary);
//    console.log("RELEVANT CONTEXT:", contextBlocks);

//    const docText = await generateDocUpdate(diffSummary, contextBlocks);

//    console.log("GENERATED DOC UPDATE:");
//    console.log(docText);


//   res.sendStatus(200);
// });


app.get("/", (_req, res) => res.send("this is sarthak from server"));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
