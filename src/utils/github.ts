import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();
import { Octokit } from "@octokit/rest";

const GITHUB_SECRET = process.env.GITHUB_WEBHOOK_SECRET!;

export function verifySignature(rawBody: Buffer, signature: string) {
  const hmac = crypto.createHmac("sha256", GITHUB_SECRET);
  const digest = "sha256=" + hmac.update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function getPullRequestFiles(
  owner: string,
  repo: string,
  pullNumber: number
) {
  const files = await octokit.paginate(
    octokit.pulls.listFiles,
    {
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    }
  );

  return files.map((file) => ({
    filename: file.filename,
    status: file.status, // added | modified | removed
    patch: file.patch || "",
  }));
}