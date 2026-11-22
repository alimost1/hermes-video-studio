import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { renderMotion, skillDir } from "../src/server/motion";
import { sampleMotionBrief } from "../src/shared/motion";
// Renders the 15-second cut of the offline sample (no provider keys needed).
const folder = path.resolve("out/motion");
await mkdir(folder, { recursive: true });
await copyFile(
  path.join(skillDir, "assets/sample-stall.jpg"),
  path.join(folder, "sample-stall.jpg"),
);
await renderMotion({
  folder,
  brief: sampleMotionBrief,
  brand: "Creatin SEO Web",
  accent: "#bcf75d",
  artwork: "sample-stall.jpg",
  seconds: 15,
  output: path.join(folder, "motion-smoke.mp4"),
  thumbnail: path.join(folder, "motion-smoke.png"),
  onProgress: () => {},
});
console.log("Rendered out/motion/motion-smoke.mp4 and motion-smoke.png");
