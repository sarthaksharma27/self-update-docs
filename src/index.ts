import express from "express";
import bodyParser from "body-parser";
import { getPullRequestFiles, verifySignature } from "./utils/github";
import { classifyDocRelevance } from "./utils/aiClassifier";
import { summarizeDiff } from "./utils/diffSummary";
import { getRelevantContext } from "./utils/contextRetriever";
import { generateDocUpdate } from "./utils/docGenerator";
import { prisma } from './lib/prisma';
import { getInstallationOctokit } from "./utils/octokit";

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

  if (event === "installation" && req.body.action === "created") {
    const installation = req.body.installation;
    const repo = req.body.repositories?.[0];

    console.log({
      installationId: installation.id,
      account: typeof installation.account === 'object' ? installation.account.login : installation.account,
      accountType: typeof installation.account === 'object' ? installation.account.type : installation.accountType,
      repositories: req.body.repositories,
    });

    await prisma.installationOwner.upsert({
      where: { githubInstallationId: installation.id },
      update: {
        isActive: true,
        uninstalledAt: null,
      },
      create: {
        githubInstallationId: installation.id,
        githubLogin: typeof installation.account === 'object' ? installation.account.login : installation.account,
        githubAccountType: typeof installation.account === 'object' ? installation.account.type : installation.accountType,
        repositories: {
          create: {
            owner: repo.full_name.split('/')[0],
            name: repo.full_name.split('/')[1],
          },
        },
      },
    });

    console.log("Client stored:", installation.id);
    return res.sendStatus(200);
  }

  if (event === "installation" && req.body.action === "deleted") {
    const installationId = req.body.installation.id;

    await prisma.installationOwner.update({
      where: { githubInstallationId: installationId },
      data: {
        isActive: false,
        uninstalledAt: new Date(),
      },
    });

    console.log("Client deactivated:", installationId);
    return res.sendStatus(200);
  }


    if (event === "pull_request") {
    const installationId = req.body.installation.id;

    const installationOwner = await prisma.installationOwner.findUnique({
      where: { githubInstallationId: installationId },
      include: { repositories: true },
    });

    if (!installationOwner || !installationOwner.isActive) {
      return res.status(401).send("Inactive installation");
    }

    const repo = installationOwner.repositories[0];
    const pr = req.body.pull_request;

    const octokit = getInstallationOctokit(installationId);

    const { data: files } = await octokit.pulls.listFiles({
      owner: repo.owner,
      repo: repo.name,
      pull_number: pr.number,
    });

    console.log(files);

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
