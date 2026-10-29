import { mkdir } from "node:fs/promises";
import { renderVideo } from "../src/server/render";
import { sampleVideo } from "../src/shared/schema";
await mkdir("out", { recursive: true });
const props = {
  ...sampleVideo,
  scenes: [{ ...sampleVideo.scenes[0], durationFrames: 45 }],
};
await renderVideo(props, "out/smoke.mp4", "out/smoke.png", () => {});
console.log("Rendered out/smoke.mp4 and out/smoke.png");
