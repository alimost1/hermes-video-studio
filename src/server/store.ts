import { Redis } from "ioredis";
import { Queue } from "bullmq";
import { redisUrl } from "./config";
import type { Project } from "../shared/schema";
let client: Redis | undefined;
let queue: Queue | undefined;
export function redis() {
  return (client ||= new Redis(redisUrl, { maxRetriesPerRequest: null }));
}
export function jobs() {
  return (queue ||= new Queue("video-studio", {
    connection: { url: redisUrl },
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  }));
}
export async function getProject(id: string): Promise<Project | null> {
  const raw = await redis().get(`project:${id}`);
  return raw ? JSON.parse(raw) : null;
}
export async function saveProject(p: Project) {
  p.updatedAt = new Date().toISOString();
  await redis()
    .multi()
    .set(`project:${p.id}`, JSON.stringify(p))
    .zadd("projects", Date.parse(p.createdAt), p.id)
    .exec();
}
export async function listProjects() {
  const ids = await redis().zrevrange("projects", 0, 49);
  return (await Promise.all(ids.map(getProject))).filter(
    (p): p is Project => p !== null,
  );
}
export async function projectLock<T>(
  id: string,
  fn: () => Promise<T>,
): Promise<T> {
  const key = `edit-lock:${id}`,
    token = crypto.randomUUID();
  if (!(await redis().set(key, token, "EX", 30, "NX")))
    throw new Error("Project is busy. Try again.");
  try {
    return await fn();
  } finally {
    await redis().eval(
      "if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) end return 0",
      1,
      key,
      token,
    );
  }
}
