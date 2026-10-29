import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "../src/server/config";
import { redis, getProject } from "../src/server/store";
const days = Number(process.env.RETENTION_DAYS || 30);
if (!Number.isFinite(days) || days < 7)
  throw new Error("RETENTION_DAYS must be at least 7.");
const before = Date.now() - days * 86400000;
try {
  const ids = await redis().zrange("projects", 0, -1);
  const projects = await Promise.all(ids.map(getProject));
  if (
    projects.some(
      (p) => p && !["completed", "failed", "review"].includes(p.status),
    )
  )
    throw new Error(
      "Cleanup skipped: wait for all active/queued projects to finish.",
    );
  const protectedFiles = new Set<string>();
  for (const p of projects) {
    if (!p) continue;
    for (const url of [
      p.output,
      p.thumbnail,
      p.subtitles,
      ...(p.video?.scenes.flatMap((s) => [s.audio, s.image]) || []),
    ])
      if (url)
        protectedFiles.add(path.join(dataDir, p.id, url.split("/").at(-1)!));
  }
  let count = 0;
  for (const entry of await readdir(dataDir, { withFileTypes: true })) {
    if (
      !entry.isDirectory() ||
      !(entry.name === "voice-cache" || /^[a-f0-9-]{36}$/.test(entry.name))
    )
      continue;
    const dir = path.join(dataDir, entry.name);
    for (const name of await readdir(dir)) {
      if (name.endsWith(".json") && entry.name !== "voice-cache") continue;
      const file = path.join(dir, name);
      if (protectedFiles.has(file)) continue;
      const info = await stat(file);
      if (info.isFile() && info.mtimeMs < before) {
        await unlink(file);
        count++;
      }
    }
  }
  console.log(`Removed ${count} unreferenced files older than ${days} days.`);
} finally {
  await redis().quit();
}
