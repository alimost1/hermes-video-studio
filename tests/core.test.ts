import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { publicAddress, validateUrl } from "../src/server/safe-fetch";
import { alignmentWords, srtFromScenes } from "../src/server/voice";
import { parsePage } from "../src/server/extract";
import { createSchema, storyboardSchema } from "../src/shared/schema";
import { authorized, sameOrigin, sessionToken } from "../src/server/auth";
test("blocks local, mapped, reserved and link-local addresses", () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "192.168.1.1",
    "172.16.1.1",
    "169.254.169.254",
    "0.0.0.0",
    "100.64.0.1",
    "::1",
    "fe80::1",
    "fc00::1",
    "::ffff:127.0.0.1",
  ])
    assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress("8.8.8.8"), true);
});
test("rejects URL credentials, alternate ports and schemes", () => {
  for (const u of [
    "file:///etc/passwd",
    "http://localhost/",
    "http://2130706433",
    "https://user:pass@example.com",
    "https://example.com:8080",
    "http://[::1]",
  ])
    assert.throws(() => validateUrl(u), u);
  assert.equal(validateUrl("https://example.com").hostname, "example.com");
});
test("extracts clean source facts and resolves images", () => {
  const result = parsePage(
    `<html><head><title>Villa</title><meta property="og:image" content="/villa.jpg"></head><body><nav>Ignore this navigation</nav><main><h1>A villa in Marrakech</h1><p>${"A garden and a swimming pool. ".repeat(10)}</p><script>malicious()</script><img src="/villa.jpg"/></main></body></html>`,
    "https://example.com/property",
  );
  assert.equal(result.title, "Villa");
  assert.deepEqual(result.images, ["https://example.com/villa.jpg"]);
  assert.ok(!result.text.includes("malicious"));
  assert.ok(!result.text.includes("navigation"));
});
test("preserves Arabic character order and word timings", () => {
  const a = {
    characters: ["م", "ر", "ح", "ب", "ا", " ", "ب", "ك"],
    character_start_times_seconds: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7],
    character_end_times_seconds: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
  };
  assert.deepEqual(alignmentWords(a), [
    { text: "مرحبا", start: 0, end: 0.5 },
    { text: "بك", start: 0.6, end: 0.8 },
  ]);
  assert.throws(() => alignmentWords({ ...a, characters: ["a"] }));
});
test("subtitles account for previous scene duration", () => {
  const srt = srtFromScenes(
    [
      { durationFrames: 60, words: [{ text: "one", start: 0, end: 1 }] },
      { durationFrames: 60, words: [{ text: "two", start: 0.2, end: 1 }] },
    ],
    30,
  );
  assert.ok(srt.includes("00:00:02,200 --> 00:00:03,000"));
});
test("schema rejects duplicate scene IDs and unsupported content", () => {
  const scene = {
    id: "a",
    type: "hook",
    title: "Hello",
    narration: "Hello",
    points: [],
    imageIndex: null,
  };
  assert.equal(
    storyboardSchema.safeParse({ title: "Hi", scenes: [scene, scene] }).success,
    false,
  );
  assert.equal(
    createSchema.safeParse({ url: "https://example.com", duration: 999 })
      .success,
    false,
  );
});
test("auth fails closed and rejects expired sessions and foreign origins", () => {
  process.env.STUDIO_TOKEN = "a".repeat(40);
  process.env.APP_ORIGIN = "https://studio.example.com";
  assert.equal(
    authorized(new NextRequest("https://studio.example.com/api/projects")),
    false,
  );
  assert.equal(
    authorized(
      new NextRequest("https://studio.example.com/api/projects", {
        headers: {
          cookie: `studio-session=${sessionToken(process.env.STUDIO_TOKEN, Date.now() - 1)}`,
        },
      }),
    ),
    false,
  );
  assert.equal(
    authorized(
      new NextRequest("https://studio.example.com/api/projects", {
        headers: { authorization: `Bearer ${process.env.STUDIO_TOKEN}` },
      }),
    ),
    true,
  );
  assert.equal(
    sameOrigin(
      new NextRequest("https://studio.example.com/api/projects", {
        headers: { origin: "https://evil.example" },
      }),
    ),
    false,
  );
});
