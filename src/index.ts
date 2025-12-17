import express from "express";
import bodyParser from "body-parser";
import { getPullRequestFiles, verifySignature } from "./utils/github";
import { classifyDocRelevance } from "./utils/aiClassifier";

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
  if (event !== "pull_request") {
    return res.sendStatus(200);
  }

  const action = req.body.action;
  if (!["opened", "synchronize"].includes(action)) {
    return res.sendStatus(200);
  }

  const pr = req.body.pull_request;
  const repo = req.body.repository;

  const prNumber = pr.number;
  const baseSha = pr.base.sha;
  const headSha = pr.head.sha;
  const owner = repo.owner.login;
  const repoName = repo.name;

  console.log({
    owner,
    repoName,
    prNumber,
    baseSha,
    headSha,
  });

  const files = await getPullRequestFiles(owner, repoName, prNumber);

  console.log(files);

   const result = await classifyDocRelevance(files);
   console.log("AI classification:", result);

  if (!result.doc_relevant || result.confidence < 0.6) {
    console.log(`PR #${prNumber} not relevant for docs.`);
    return res.sendStatus(200);
  }

   console.log(`PR #${prNumber} *IS* relevant for docs!`);

  res.sendStatus(200);
});


app.get("/", (_req, res) => res.send("this is sarthak from server"));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
