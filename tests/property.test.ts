import test from "node:test";
import assert from "node:assert/strict";
import { parsePropertyBoard, propertySeconds } from "../src/shared/property";
import { parsePage } from "../src/server/extract";
import { createSchema } from "../src/shared/schema";
import { writePropertyBoard } from "../src/server/hermes";

test("property extraction keeps the listing gallery, labeled full-size photo and contact", () => {
  const page =
    '<header><a href="tel:+123456789">Phone</a></header><main><article><p>' +
    "Rental listing content. ".repeat(10) +
    '</p><a href="/room.jpg"><img src="/thumb.jpg" alt="Living room"></a><img data-src="/view.jpg" src="/placeholder.gif"></article><aside><img src="/neighbor.jpg">Other property</aside></main>';
  const source = parsePage(
    page,
    "https://example.com/listing",
    "property-reel",
  );
  assert.deepEqual(source.images, [
    "https://example.com/room.jpg",
    "https://example.com/view.jpg",
  ]);
  assert.deepEqual(source.imageLabels, ["Living room", ""]);
  assert.match(source.text, /tel:\+123456789/);
  assert.doesNotMatch(source.text, /Other property/);
});

const source = {
  url: "https://example.com/flat",
  title: "Flat",
  description: "",
  text: "",
  images: ["https://example.com/view.jpg"],
};
const photo = { imageIndex: 0 };
const rental = {
  title: "Appartement",
  cover: photo,
  chapters: [{ name: "Terrasse", upper: photo, lower: photo }],
};
test("property selection preserves old project inputs and rejects out-of-range photos", () => {
  const base = createSchema.parse({ url: source.url });
  assert.equal(JSON.stringify(base).includes('"style"'), false);
  assert.equal(
    createSchema.parse({ ...base, style: "property-reel" }).style,
    "property-reel",
  );
  assert.throws(
    () =>
      parsePropertyBoard(
        {
          ...rental,
          chapters: [{ ...rental.chapters[0], lower: { imageIndex: 1 } }],
        },
        1,
      ),
    /outside/,
  );
  assert.throws(() =>
    parsePropertyBoard({ ...rental, cover: { file: "local.jpg" } }, 1),
  );
  assert.equal(parsePropertyBoard(rental, 1).price, "");
  assert.equal(propertySeconds(4), 19.1);
});
test("Hermes property director accepts a photo tour and requires a listing gallery", async () => {
  const input = createSchema.parse({
    url: source.url,
    style: "property-reel",
    language: "fr",
  });
  await assert.rejects(
    writePropertyBoard({ ...source, images: [] }, input, "empty"),
    /no usable/,
  );
  process.env.HERMES_BASE_URL = "http://localhost:8642/v1";
  process.env.HERMES_API_KEY = "test-only";
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.match(body.messages[0].content, /property|real estate/i);
      assert.equal(JSON.parse(body.messages[1].content).language, "fr");
      return Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(rental) },
          },
        ],
      });
    };
    assert.equal(
      (await writePropertyBoard(source, input, "property")).chapters[0].name,
      "Terrasse",
    );
  } finally {
    globalThis.fetch = original;
  }
});
