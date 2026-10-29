import path from "node:path";
export const dataDir = path.resolve(process.env.DATA_DIR || "./data");
export const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
export function required(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(
      `Configure ${name} on the server before generating videos.`,
    );
  return value;
}
export const chromePath = () => process.env.CHROME_PATH || undefined;
