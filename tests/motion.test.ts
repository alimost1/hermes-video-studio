import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createSchema } from "../src/shared/schema";
import {
  motionBriefSchema,
  rendererBrief,
  sampleMotionBrief,
} from "../src/shared/motion";
import { writeMotionBrief } from "../src/server/motion";
test("the motion style is limited to Latin-script languages", () => {
  const base = { url: "https://example.com", style: "motion" };
  assert.equal(createSchema.parse({ ...base, language: "en" }).motionSeconds, 45);
  assert.equal(createSchema.parse({ ...base, language: "fr" }).style, "motion");
  assert.throws(() => createSchema.parse({ ...base, language: "darija" }));
  assert.throws(() => createSchema.parse({ ...base, language: "ar" }));
  assert.equal(createSchema.parse({ url: base.url }).style, "explainer");
});
test("the sample brief is valid and matches the skill's reference brief", async () => {
  assert.deepEqual(motionBriefSchema.parse(sampleMotionBrief), sampleMotionBrief);
  const reference = JSON.parse(
    await readFile("skills/creatin-motion/references/zest-walks-brief.json", "utf8"),
  );
  const { artworkIndex, ...fields } = sampleMotionBrief;
  void artworkIndex;
  const { brand, accent, artwork, ...rest } = reference;
  void brand, void accent, void artwork;
  assert.deepEqual(rest, fields);
});
test("picker tiles need a small and a big value", () => {
  assert.throws(() => motionBriefSchema.parse({ ...sampleMotionBrief, pick2: "Sat" }));
  assert.throws(() =>
    motionBriefSchema.parse({ ...sampleMotionBrief, pick1: "Far too long label|4" }),
  );
});
test("renderer brief carries brand, accent and artwork only", () => {
  const out = rendererBrief(sampleMotionBrief, "Zest", "#bcf75d", "image-2.jpg");
  assert.equal(out.brand, "Zest");
  assert.equal(out.accent, "#bcf75d");
  assert.equal(out.artwork, "image-2.jpg");
  assert.equal("artworkIndex" in out, false);
  assert.ok(Object.values(out).every((v) => typeof v === "string"));
  assert.equal("artwork" in rendererBrief(sampleMotionBrief, "Zest", "#bcf75d"), false);
});
test("Hermes motion brief hides image URLs and clamps the artwork index", async () => {
  process.env.HERMES_BASE_URL = "http://hermes.test/v1";
  process.env.HERMES_API_KEY = "key";
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "http://hermes.test/v1/chat/completions");
    assert.equal(
      (options!.headers as Record<string, string>)["Idempotency-Key"],
      "motion-test",
    );
    const sent = JSON.parse(String(options!.body)).messages[1].content;
    assert.ok(!sent.includes("secret.example/photo.jpg"));
    return Response.json({
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: JSON.stringify({ ...sampleMotionBrief, artworkIndex: 7 }),
          },
        },
      ],
    });
  };
  try {
    const input = createSchema.parse({
      url: "https://example.com",
      style: "motion",
      language: "en",
    });
    const brief = await writeMotionBrief(
      {
        url: input.url,
        title: "T",
        description: "",
        text: "Facts",
        images: ["https://secret.example/photo.jpg"],
      },
      input,
      "test",
    );
    assert.equal(brief.artworkIndex, null);
    globalThis.fetch = async () =>
      Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify({ ...sampleMotionBrief, hook: "" }) },
          },
        ],
      });
    await assert.rejects(
      writeMotionBrief(
        { url: input.url, title: "T", description: "", text: "", images: [] },
        input,
        "test",
      ),
    );
  } finally {
    globalThis.fetch = original;
  }
});
