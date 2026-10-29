import { Worker } from "bullmq";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { dataDir, redisUrl } from "./config";
import { getProject, saveProject, redis } from "./store";
import { extract } from "./extract";
import { writeStoryboard } from "./hermes";
import { voice, srtFromScenes } from "./voice";
import { safeFetch } from "./safe-fetch";
import { renderVideo } from "./render";
import {
  FPS,
  sampleVideo,
  type Project,
  type VideoScene,
  type Status,
} from "../shared/schema";
const renderKey = randomBytes(24).toString("hex");
// Only this worker's Chromium can reach the temporary render asset server.
const assetServer = createServer(async (req, res) => {
  try {
    const parts = (req.url || "").split("/").filter(Boolean);
    if (
      parts.length !== 3 ||
      parts[0] !== renderKey ||
      !/^[a-f0-9-]{36}$/.test(parts[1]) ||
      !/^[\w.-]+$/.test(parts[2])
    ) {
      res.writeHead(404).end();
      return;
    }
    const file = path.join(dataDir, parts[1], parts[2]);
    const body = await readFile(file);
    const ext = path.extname(file);
    res.setHeader(
      "Content-Type",
      (
        {
          ".mp3": "audio/mpeg",
          ".jpg": "image/jpeg",
          ".png": "image/png",
          ".webp": "image/webp",
          ".gif": "image/gif",
        } as Record<string, string>
      )[ext] || "application/octet-stream",
    );
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise<void>((resolve) =>
  assetServer.listen(0, "127.0.0.1", resolve),
);
const port = (assetServer.address() as { port: number }).port;
const status = async (p: Project, s: Status, n: number) => {
  p.status = s;
  p.progress = n;
  await saveProject(p);
};
async function processProject(id: string, action: string) {
  const p = await getProject(id);
  if (!p) throw new Error("Project not found.");
  const folder = path.join(dataDir, id);
  await mkdir(folder, { recursive: true });
  try {
    p.error = undefined;
    if (action === "generate") {
      if (p.input.demo) {
        p.source = {
          url: p.input.url,
          title: "Sample animation",
          description: "Offline demonstration. No AI voice.",
          text: "",
          images: [],
        };
        p.storyboard = {
          title: "Your first story in motion",
          scenes: sampleVideo.scenes.map(
            ({ durationFrames, words, ...s }) => s,
          ),
        };
        p.warnings = [
          "Sample project: no website was fetched and no voice was generated.",
        ];
      } else {
        if (!p.source) {
          await status(p, "extracting", 8);
          p.source = await extract(p.input.url);
          await saveProject(p);
        }
        if (!p.storyboard) {
          await status(p, "writing", 20);
          p.storyboard = await writeStoryboard(
            p.source,
            p.input,
            `${id}-${p.revision}`,
          );
          await saveProject(p);
        }
      }
      if (!p.input.autoRender) {
        await status(p, "review", 30);
        return;
      }
    }
    if (!p.storyboard || !p.source)
      throw new Error("Generate a storyboard first.");
    await status(p, "voicing", 35);
    const scenes: VideoScene[] = [];
    for (const [i, scene] of p.storyboard.scenes.entries()) {
      let audio: string | undefined;
      let words: VideoScene["words"] = [];
      let durationFrames = 150;
      if (!p.input.demo) {
        const generated = await voice(scene.narration);
        const name = `voice-${p.revision}-${i}.mp3`;
        await writeFile(path.join(folder, name), generated.audio);
        audio = `/api/assets/${id}/${name}`;
        words = generated.words;
        durationFrames = Math.ceil((generated.duration + 0.35) * FPS);
      }
      let image: string | undefined;
      if (scene.imageIndex !== null && p.source.images[scene.imageIndex]) {
        try {
          const marker = path.join(folder, `image-${scene.imageIndex}.json`);
          let name: string;
          try {
            name = JSON.parse(await readFile(marker, "utf8")).name;
            await stat(path.join(folder, name));
          } catch {
            const asset = await safeFetch(
              p.source.images[scene.imageIndex],
              8_000_000,
            );
            const extension = (
              {
                "image/jpeg": "jpg",
                "image/png": "png",
                "image/webp": "webp",
                "image/gif": "gif",
              } as Record<string, string>
            )[asset.contentType.split(";")[0]];
            if (!extension) throw new Error("Unsupported image type");
            name = `image-${scene.imageIndex}.${extension}`;
            await writeFile(path.join(folder, name), asset.body);
            await writeFile(marker, JSON.stringify({ name }));
          }
          image = `/api/assets/${id}/${name}`;
        } catch {
          const warning = `Image ${scene.imageIndex + 1} could not be downloaded; this scene uses text only.`;
          if (!p.warnings.includes(warning)) p.warnings.push(warning);
        }
      }
      scenes.push({ ...scene, audio, image, words, durationFrames });
      await status(
        p,
        "voicing",
        35 + Math.round(((i + 1) / p.storyboard.scenes.length) * 20),
      );
    }
    p.video = {
      brand: p.input.brand,
      accent: p.input.accent,
      language: p.input.language,
      scenes,
    };
    await status(p, "rendering", 58);
    const local = (url: string | undefined) =>
      url
        ? `http://127.0.0.1:${port}/${renderKey}/${id}/${url.split("/").at(-1)}`
        : undefined;
    const renderProps = {
      ...p.video,
      scenes: scenes.map((s) => ({
        ...s,
        image: local(s.image),
        audio: local(s.audio),
      })),
    };
    let last = 0;
    let progressWrite = Promise.resolve();
    const movieName = `video-${p.revision}.mp4`,
      posterName = `poster-${p.revision}.png`,
      srtName = `captions-${p.revision}.srt`;
    await renderVideo(
      renderProps,
      path.join(folder, movieName),
      path.join(folder, posterName),
      (n) => {
        if (Date.now() - last > 1000) {
          last = Date.now();
          progressWrite = progressWrite.then(() =>
            status(p, "rendering", 58 + Math.floor(n * 39)),
          );
        }
      },
    );
    await progressWrite;
    await writeFile(path.join(folder, srtName), srtFromScenes(scenes, FPS));
    p.output = `/api/assets/${id}/${movieName}`;
    p.thumbnail = `/api/assets/${id}/${posterName}`;
    p.subtitles = `/api/assets/${id}/${srtName}`;
    await writeFile(
      path.join(folder, "storyboard.json"),
      JSON.stringify(p.storyboard, null, 2),
    );
    await status(p, "completed", 100);
  } catch (error) {
    p.error = error instanceof Error ? error.message : "Generation failed.";
    await status(p, "failed", p.progress);
    throw error;
  }
}
const worker = new Worker(
  "video-studio",
  async (job) => processProject(job.data.id, job.data.action),
  { connection: { url: redisUrl }, concurrency: 1, lockDuration: 120000 },
);
worker.on("failed", (job, error) => {
  console.error("Video job failed:", error.message);
  if (job)
    void getProject(job.data.id)
      .then(async (p) => {
        if (p && p.status !== "failed" && p.status !== "completed") {
          p.error =
            "Worker stopped before completion. You can retry this project.";
          await status(p, "failed", p.progress);
        }
      })
      .catch(() => {});
});
worker.on("error", (error) => console.error("Worker error:", error.message));
const heartbeat = setInterval(
  () => void redis().set("worker:heartbeat", Date.now(), "EX", 30),
  10000,
);
await redis().set("worker:heartbeat", Date.now(), "EX", 30);
console.log("Video worker ready. Job concurrency: 1.");
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, async () => {
    clearInterval(heartbeat);
    await worker.close();
    assetServer.close();
    await redis().quit();
    process.exit(0);
  });
