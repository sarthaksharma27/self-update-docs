import express from "express";

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("This is sarthak from server");
});

app.post("/github/webhook", (req, res) => {
  console.log("Webhook received");
  console.log(req.body);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
