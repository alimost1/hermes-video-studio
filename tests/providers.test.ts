import { test } from "node:test";
import assert from "node:assert/strict";
import { writeStoryboard } from "../src/server/hermes";
import { createSchema } from "../src/shared/schema";
const input = createSchema.parse({
  url: "https://example.com",
  language: "fr",
});
const source = {
  url: input.url,
  title: "Source",
  description: "",
  text: "Source facts",
  images: ["https://example.com/photo.jpg"],
};
const board = {
  title: "Test",
  scenes: [
    {
      id: "one",
      type: "hook",
      title: "Hello",
      narration: "Bonjour",
      points: [],
      imageIndex: 10,
    },
    {
      id: "two",
      type: "closing",
      title: "Bye",
      narration: "Merci",
      points: [],
      imageIndex: null,
    },
  ],
};
test("Hermes sends source data and clamps unavailable images", async () => {
  process.env.HERMES_BASE_URL = "http://localhost:8642/v1";
  process.env.HERMES_API_KEY = "test-only";
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "http://localhost:8642/v1/chat/completions");
    const body = JSON.parse(options!.body as string);
    assert.equal(JSON.parse(body.messages[1].content).language, "fr");
    assert.equal(
      (options!.headers as Record<string, string>)["Idempotency-Key"],
      "storyboard-test",
    );
    return Response.json({
      choices: [
        { finish_reason: "stop", message: { content: JSON.stringify(board) } },
      ],
    });
  };
  try {
    const result = await writeStoryboard(source, input, "test");
    assert.equal(result.scenes[0].imageIndex, null);
  } finally {
    globalThis.fetch = original;
  }
});
test("Hermes refuses incomplete or invalid output", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      Response.json({
        choices: [
          {
            finish_reason: "length",
            message: { content: JSON.stringify(board) },
          },
        ],
      });
    await assert.rejects(
      writeStoryboard(source, input, "test"),
      /did not finish/,
    );
    globalThis.fetch = async () =>
      Response.json({
        choices: [{ finish_reason: "stop", message: { content: "not JSON" } }],
      });
    await assert.rejects(writeStoryboard(source, input, "test"));
    globalThis.fetch = async () => new Response("", { status: 401 });
    await assert.rejects(writeStoryboard(source, input, "test"), /HTTP 401/);
  } finally {
    globalThis.fetch = original;
  }
});
test("ElevenLabs audio cache avoids duplicate calls and invalidates changed narration", async () => {
  const { voice } = await import("../src/server/voice");
  process.env.ELEVENLABS_API_KEY = "test-only";
  process.env.ELEVENLABS_VOICE_ID = `test-${Date.now()}`;
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({
      audio_base64: Buffer.from("test audio").toString("base64"),
      alignment: {
        characters: ["H", "i"],
        character_start_times_seconds: [0, 0.1],
        character_end_times_seconds: [0.1, 0.2],
      },
    });
  };
  try {
    const a = await voice("Hi");
    const b = await voice("Hi");
    assert.equal(calls, 1);
    assert.deepEqual(a.audio, b.audio);
    assert.equal(a.words[0].text, "Hi");
    await voice("Hello");
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
  }
});
