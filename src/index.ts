import express from "express";
import bodyParser from "body-parser";
import { verifySignature } from "./utils/github";

const app = express();
const PORT = 8000;

app.use(
  bodyParser.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.post("/github/webhook", (req: any, res) => {
  const signature = req.headers["x-hub-signature-256"] as string;

  if (!verifySignature(req.rawBody, signature)) {
    return res.status(401).send("Invalid signature");
  }

  console.log("Webhook verified successfully");
  console.log(req.body);
  res.sendStatus(200);
});

app.get("/", (_req, res) => res.send("this is sarthak from server"));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
