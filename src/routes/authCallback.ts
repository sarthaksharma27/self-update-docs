import { Router } from "express";
import fetch from "node-fetch";
import { prisma } from "../lib/prisma";

interface GitHubTokenResponse {
  access_token: string;
  scope: string;
  token_type: string;
}

interface GitHubUserResponse {
  login: string;
  id: number;
  avatar_url: string;
}

const router = Router();

router.get("/github/callback", async (req, res) => {
  const code = req.query.code as string;
  if (!code) {
    return res.redirect(process.env.FRONTEND_URL!);
  }

  const tokenRes = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    }
  );

  const tokenData = (await tokenRes.json()) as GitHubTokenResponse;
  const accessToken = tokenData.access_token;

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Manicule-App",
    },
  });

  const user = (await userRes.json()) as GitHubUserResponse;
  const githubLogin = user.login;

  const installationOwner = await prisma.installationOwner.findFirst({
    where: {
      githubLogin,
      isActive: true,
    },
  });

  res.cookie("gh_user", githubLogin, {
  httpOnly: true,
  secure: true,      // Required for sameSite: "none"
  sameSite: "none",  // Allows cross-site cookie usage
  maxAge: 24 * 60 * 60 * 1000, // Optional: 24 hour expiry
});

  if (installationOwner) {
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  }

  return res.redirect(
    `https://github.com/apps/${process.env.GITHUB_APP_SLUG}/installations/new`
  );
});

export default router;