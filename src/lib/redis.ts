import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL && process.env.NODE_ENV === 'production') {
  throw new Error("FATAL: REDIS_URL is missing in Production environment!");
}

const connectionString = REDIS_URL || "redis://127.0.0.1:6379";

export const redis = new IORedis(connectionString, {
  family: 0, 
  connectTimeout: 10000,
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on("connect", () => {
  console.log(`🚀 Redis Client connected to: ${redis.options.host}:${redis.options.port}`);
});

redis.on("error", (err) => {
  console.error("Redis Error:", err.message);
});