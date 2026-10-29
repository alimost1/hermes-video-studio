import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { required, dataDir } from "./config";
import type { Word } from "../shared/schema";
const alignmentSchema = z.object({
  characters: z.array(z.string()),
  character_start_times_seconds: z.array(z.number().nonnegative()),
  character_end_times_seconds: z.array(z.number().nonnegative()),
});
export type Alignment = z.infer<typeof alignmentSchema>;
export function alignmentWords(a: Alignment): Word[] {
  if (
    a.characters.length !== a.character_start_times_seconds.length ||
    a.characters.length !== a.character_end_times_seconds.length
  )
    throw new Error("Invalid voice timing data.");
  const words: Word[] = [];
  let current: Word | undefined;
  a.characters.forEach((c, i) => {
    if (/\s/.test(c)) {
      if (current) words.push(current);
      current = undefined;
    } else {
      if (!current)
        current = {
          text: "",
          start: a.character_start_times_seconds[i],
          end: 0,
        };
      current.text += c;
      current.end = a.character_end_times_seconds[i];
    }
  });
  if (current) words.push(current);
  return words;
}
export async function voice(text: string) {
  const voiceId = required("ELEVENLABS_VOICE_ID"),
    model = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
  const hash = createHash("sha256")
    .update(JSON.stringify({ text, voiceId, model }))
    .digest("hex");
  const folder = path.join(dataDir, "voice-cache");
  await mkdir(folder, { recursive: true });
  const target = path.join(folder, `${hash}.json`);
  try {
    const cached = JSON.parse(await readFile(target, "utf8"));
    return { ...cached, audio: Buffer.from(cached.audio, "base64") };
  } catch {}
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps`,
    {
      method: "POST",
      signal: AbortSignal.timeout(120000),
      headers: {
        "xi-api-key": required("ELEVENLABS_API_KEY"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  );
  if (!response.ok)
    throw new Error(
      `ElevenLabs returned HTTP ${response.status}. Check voice ID, credits, and API access.`,
    );
  const body = await response.json();
  const alignment = alignmentSchema.parse(
    body.normalized_alignment || body.alignment,
  );
  if (typeof body.audio_base64 !== "string" || !body.audio_base64)
    throw new Error("ElevenLabs returned no audio.");
  const words = alignmentWords(alignment);
  const duration = Math.max(...alignment.character_end_times_seconds, 0);
  if (duration <= 0 || duration > 180)
    throw new Error("Voice duration is outside the supported range.");
  const result = { audio: body.audio_base64, words, duration };
  await writeFile(`${target}.tmp`, JSON.stringify(result));
  await rename(`${target}.tmp`, target);
  return { ...result, audio: Buffer.from(result.audio, "base64") };
}
export function srtFromScenes(
  scenes: { words: Word[]; durationFrames: number }[],
  fps: number,
) {
  let offset = 0,
    index = 0;
  const lines: string[] = [];
  const stamp = (s: number) => {
    const ms = Math.round(s * 1000);
    return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
  };
  for (const scene of scenes) {
    for (let i = 0; i < scene.words.length; i += 6) {
      const group = scene.words.slice(i, i + 6);
      lines.push(
        `${++index}\n${stamp(offset + group[0].start)} --> ${stamp(offset + group.at(-1)!.end)}\n${group.map((w) => w.text).join(" ")}\n`,
      );
    }
    offset += scene.durationFrames / fps;
  }
  return lines.join("\n");
}
