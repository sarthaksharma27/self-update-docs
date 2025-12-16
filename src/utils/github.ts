import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const GITHUB_SECRET = process.env.GITHUB_WEBHOOK_SECRET!;

export function verifySignature(rawBody: Buffer, signature: string) {
  const hmac = crypto.createHmac("sha256", GITHUB_SECRET);
  const digest = "sha256=" + hmac.update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}