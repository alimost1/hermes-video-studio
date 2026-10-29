import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import path from "node:path";
import { chromePath } from "./config";
import type { VideoProps } from "../shared/schema";
let bundled: Promise<string> | undefined;
export async function renderVideo(
  video: VideoProps,
  output: string,
  thumbnail: string,
  onProgress: (n: number) => void,
) {
  const serveUrl = await (bundled ||= bundle({
    entryPoint: path.resolve("src/video/index.tsx"),
  }));
  const options = {
    serveUrl,
    inputProps: video,
    browserExecutable: chromePath(),
  };
  const composition = await selectComposition({ ...options, id: "Explainer" });
  await renderStill({
    ...options,
    composition,
    output: thumbnail,
    frame: Math.min(45, composition.durationInFrames - 1),
    imageFormat: "png",
  });
  await renderMedia({
    ...options,
    composition,
    codec: "h264",
    outputLocation: output,
    crf: 20,
    pixelFormat: "yuv420p",
    concurrency: Math.max(
      1,
      Math.min(8, Number(process.env.RENDER_CONCURRENCY) || 4),
    ),
    onProgress: ({ progress }) => onProgress(progress),
  });
}
