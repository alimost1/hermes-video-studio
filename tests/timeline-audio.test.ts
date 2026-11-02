import test from "node:test";
import assert from "node:assert/strict";
import { sceneSchema, storyboardSchema } from "../src/shared/schema";

const base = {
  id: "scene-one",
  type: "hook" as const,
  title: "A new idea",
  narration: "Make it move.",
  points: ["One", "Two"],
  imageIndex: null,
};

test("scene defaults include editable animation and event lanes", () => {
  const scene = sceneSchema.parse(base);
  assert.equal(scene.animationPreset, "spring");
  assert.equal(scene.animationStartFrame, 0);
  assert.equal(scene.animationDurationFrames, 24);
  assert.deepEqual(scene.soundEvents, []);
});

test("storyboard rejects sound events outside their scene duration", () => {
  const parsed = storyboardSchema.safeParse({
    title: "Explainer",
    scenes: [
      { ...base, durationFrames: 60, soundEvents: [{ id: "pop-1", type: "pop", atFrame: 60, volume: 0.5 }] },
      { ...base, id: "scene-two", type: "closing" },
    ],
  });
  assert.equal(parsed.success, false);
});

test("storyboard accepts synchronized sound events within the scene", () => {
  const parsed = storyboardSchema.safeParse({
    title: "Explainer",
    scenes: [
      { ...base, durationFrames: 90, soundEvents: [{ id: "whoosh-1", type: "whoosh", atFrame: 12, volume: 0.4 }] },
      { ...base, id: "scene-two", type: "closing" },
    ],
  });
  assert.equal(parsed.success, true);
});
