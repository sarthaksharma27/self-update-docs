import { Router } from "express";

const router = Router();

router.get("/github", (_req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    scope: "read:user",
  });

  res.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`
  );
});

export default router;
