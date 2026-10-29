import { load } from "cheerio";
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  open,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { safeFetch } from "../src/server/safe-fetch";
import { dataDir, required } from "../src/server/config";
await mkdir(dataDir, { recursive: true });
const lock = path.join(dataDir, "watch.lock");
let handle;
try {
  handle = await open(lock, "wx");
} catch {
  throw new Error(
    "Watcher is already running (or left a stale data/watch.lock after a crash; inspect before removing).",
  );
}
try {
  const result = await safeFetch(required("WATCH_URL"));
  const $ = load(result.body.toString("utf8"), { xmlMode: true });
  const links = [
    ...new Set(
      $("item > link, entry > link, url > loc")
        .toArray()
        .map((el) => $(el).attr("href") || $(el).text())
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  const stateFile = path.join(dataDir, "watch-seen.json");
  let seen: string[] = [];
  try {
    seen = JSON.parse(await readFile(stateFile, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  for (const link of links.filter((s) => !seen.includes(s)).slice(0, 5)) {
    const response = await fetch(
      `${process.env.STUDIO_URL || "http://127.0.0.1:3000"}/api/projects`,
      {
        method: "POST",
        signal: AbortSignal.timeout(30000),
        headers: {
          Authorization: `Bearer ${required("STUDIO_TOKEN")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: link,
          language: process.env.VIDEO_LANGUAGE || "darija",
          brand: process.env.VIDEO_BRAND || "My Studio",
          duration: 60,
          autoRender: true,
        }),
      },
    );
    if (!response.ok)
      throw new Error(
        `Submission failed with HTTP ${response.status}; URL not marked seen.`,
      );
    const p = await response.json();
    seen.push(link);
    await writeFile(`${stateFile}.tmp`, JSON.stringify(seen));
    await rename(`${stateFile}.tmp`, stateFile);
    console.log(JSON.stringify({ id: p.id, status: p.status }));
  }
} finally {
  await handle.close();
  await unlink(lock);
}
