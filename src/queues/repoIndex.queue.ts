import { Queue } from "bullmq";
import { redis } from "../lib/redis";

export const repoIndexQueue = new Queue("repo-index", {
  connection: redis,
});
