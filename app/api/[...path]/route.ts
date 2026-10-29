import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { authorized, equal, sameOrigin, sessionToken } from "@/src/server/auth";
import { dataDir } from "@/src/server/config";
import {
  getProject,
  listProjects,
  saveProject,
  jobs,
  redis,
  projectLock,
} from "@/src/server/store";
import {
  createSchema,
  storyboardSchema,
  type Project,
} from "@/src/shared/schema";
import { validateUrl } from "@/src/server/safe-fetch";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function body(req: NextRequest) {
  if (Number(req.headers.get("content-length")) > 50000)
    throw new Error("Request is too large.");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("Request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 50000) {
        await reader.cancel();
        throw new Error("Request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const route = (await params).path;
  try {
    if (route[0] === "health") return json({ ok: true });
    if (req.method !== "GET" && !sameOrigin(req))
      return json(
        {
          error:
            "Request origin is not allowed. Set APP_ORIGIN to the dashboard URL.",
        },
        403,
      );
    if (route[0] === "login" && req.method === "POST") {
      if (!process.env.STUDIO_TOKEN || process.env.STUDIO_TOKEN.length < 32)
        return json(
          {
            error: "Set STUDIO_TOKEN to at least 32 characters on the server.",
          },
          503,
        );
      // A global ceiling is suitable for this single-owner dashboard; no untrusted forwarded-IP assumptions.
      const key = `login-limit:${Math.floor(Date.now() / 60000)}`;
      const attempts = await redis().incr(key);
      if (attempts === 1) await redis().expire(key, 70);
      if (attempts > 20)
        return json(
          { error: "Too many sign-in attempts. Try again in a minute." },
          429,
        );
      const input = await body(req);
      if (
        typeof input.token !== "string" ||
        !equal(input.token, process.env.STUDIO_TOKEN)
      )
        return json({ error: "Incorrect access token." }, 401);
      const response = json({ ok: true });
      response.cookies.set(
        "studio-session",
        sessionToken(process.env.STUDIO_TOKEN, Date.now() + 86400000),
        {
          httpOnly: true,
          sameSite: "strict",
          secure: process.env.APP_ORIGIN?.startsWith("https://") || false,
          path: "/",
          maxAge: 86400,
        },
      );
      return response;
    }
    if (!authorized(req)) return json({ error: "Sign in to continue." }, 401);
    if (route[0] === "logout" && req.method === "POST") {
      const response = json({ ok: true });
      response.cookies.delete("studio-session");
      return response;
    }
    if (route[0] === "config" && req.method === "GET")
      return json({
        hermes: !!(process.env.HERMES_BASE_URL && process.env.HERMES_API_KEY),
        voice: !!(
          process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID
        ),
        worker: !!(await redis().get("worker:heartbeat")),
        demo: process.env.DEMO_ENABLED === "true",
      });
    if (route[0] === "assets" && route.length === 3 && req.method === "GET") {
      const [, id, name] = route;
      if (
        !/^[a-f0-9-]{36}$/.test(id) ||
        !/^[\w.-]+$/.test(name) ||
        name.startsWith(".")
      )
        return json({ error: "Not found" }, 404);
      const file = path.join(dataDir, id, name);
      let info;
      try {
        info = await stat(file);
      } catch {
        return json({ error: "Not found" }, 404);
      }
      const ext = path.extname(name);
      const type = (
        {
          ".mp4": "video/mp4",
          ".mp3": "audio/mpeg",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".webp": "image/webp",
          ".gif": "image/gif",
          ".srt": "application/x-subrip",
          ".json": "application/json",
        } as Record<string, string>
      )[ext];
      if (!type) return json({ error: "Not found" }, 404);
      let start = 0,
        end = info.size - 1,
        status = 200;
      const range = req.headers.get("range");
      if (range) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(range);
        if (!match)
          return new Response(null, {
            status: 416,
            headers: { "Content-Range": `bytes */${info.size}` },
          });
        start = Number(match[1]);
        end = match[2] ? Math.min(Number(match[2]), end) : end;
        status = 206;
        if (start > end || start >= info.size)
          return new Response(null, {
            status: 416,
            headers: { "Content-Range": `bytes */${info.size}` },
          });
      }
      const headers: Record<string, string> = {
        "Content-Type": type,
        "Content-Length": String(end - start + 1),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      };
      if (status === 206)
        headers["Content-Range"] = `bytes ${start}-${end}/${info.size}`;
      if (req.nextUrl.searchParams.has("download"))
        headers["Content-Disposition"] = `attachment; filename="${name}"`;
      if (info.size === 0)
        return new Response("", {
          headers: { ...headers, "Content-Length": "0" },
        });
      return new Response(
        Readable.toWeb(
          createReadStream(file, { start, end }),
        ) as ReadableStream,
        { status, headers },
      );
    }
    if (route[0] !== "projects") return json({ error: "Not found" }, 404);
    if (route.length === 1 && req.method === "GET")
      return json(await listProjects());
    if (route.length === 1 && req.method === "POST") {
      const input = createSchema.parse(await body(req));
      validateUrl(input.url);
      if (input.demo && process.env.DEMO_ENABLED !== "true")
        return json({ error: "Demo generation is disabled." }, 400);
      if (
        !input.demo &&
        !(
          process.env.HERMES_API_KEY &&
          process.env.HERMES_BASE_URL &&
          process.env.ELEVENLABS_API_KEY &&
          process.env.ELEVENLABS_VOICE_ID
        )
      )
        return json(
          { error: "Configure Hermes and ElevenLabs on the server first." },
          503,
        );
      const hash = createHash("sha256")
        .update(JSON.stringify(input))
        .digest("hex");
      return await projectLock(hash, async () => {
        const existing = await redis().get(`input:${hash}`);
        if (existing) {
          const project = await getProject(existing);
          if (project) return json(project);
        }
        const now = new Date().toISOString();
        const p: Project = {
          id: randomUUID(),
          input,
          status: "queued",
          progress: 0,
          createdAt: now,
          updatedAt: now,
          revision: 1,
          warnings: [],
        };
        await saveProject(p);
        try {
          await jobs().add(
            "generate",
            { id: p.id, action: "generate" },
            { jobId: `${p.id}-generate-1` },
          );
        } catch (error) {
          p.status = "failed";
          p.error = "Could not enqueue this project. Retry it.";
          await saveProject(p);
          throw error;
        }
        await redis().set(`input:${hash}`, p.id);
        return json(p, 201);
      });
    }
    const id = route[1];
    if (!id || !/^[a-f0-9-]{36}$/.test(id))
      return json({ error: "Not found" }, 404);
    if (req.method === "GET") {
      const p = await getProject(id);
      return p ? json(p) : json({ error: "Not found" }, 404);
    }
    return await projectLock(id, async () => {
      const p = await getProject(id);
      if (!p) return json({ error: "Not found" }, 404);
      if (!["review", "completed", "failed"].includes(p.status))
        return json(
          { error: "This project is processing. Wait until it finishes." },
          409,
        );
      if (req.method === "PATCH" && route.length === 2) {
        const input = await body(req);
        if (input.revision !== p.revision)
          return json({ error: "Project changed. Reload before saving." }, 409);
        p.storyboard = storyboardSchema.parse(input.storyboard);
        for (const scene of p.storyboard.scenes)
          if (
            scene.imageIndex !== null &&
            scene.imageIndex >= (p.source?.images.length || 0)
          )
            return json(
              { error: "Scene image index is outside the source image list." },
              400,
            );
        p.revision++;
        p.status = "review";
        p.progress = 30;
        p.output = undefined;
        p.thumbnail = undefined;
        p.subtitles = undefined;
        p.video = undefined;
        p.error = undefined;
        await saveProject(p);
        return json(p);
      }
      if (req.method === "POST" && ["render", "retry"].includes(route[2])) {
        if (route[2] === "render" && !p.storyboard)
          return json({ error: "No storyboard available." }, 400);
        if (route[2] === "retry" && p.status !== "failed")
          return json({ error: "Only failed projects can be retried." }, 409);
        p.revision++;
        p.status = "queued";
        p.error = undefined;
        await saveProject(p);
        try {
          await jobs().add(
            "video",
            { id, action: p.storyboard ? "render" : "generate" },
            { jobId: `${id}-${p.revision}` },
          );
        } catch {
          p.status = "failed";
          p.error = "Could not enqueue. Retry again.";
          await saveProject(p);
          return json({ error: p.error }, 503);
        }
        return json(p);
      }
      return json({ error: "Not found" }, 404);
    });
  } catch (error) {
    console.error(
      "API request failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return json(
      { error: error instanceof Error ? error.message : "Request failed" },
      400,
    );
  }
}
export { handler as GET, handler as POST, handler as PATCH };
