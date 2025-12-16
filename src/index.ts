import express from "express";

const app = express();
const PORT = 8000;

app.get("/", (_req, res) => {
  res.send("This is sarthak from backend");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
