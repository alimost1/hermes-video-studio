import React from "react";
import { Composition, registerRoot } from "remotion";
import { Film } from "./Film";
import { FPS, sampleVideo, totalFrames } from "../shared/schema";
const Root = () => (
  <Composition
    id="Explainer"
    component={Film}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={totalFrames(sampleVideo)}
    defaultProps={sampleVideo}
    calculateMetadata={({ props }) => ({
      durationInFrames: totalFrames(props),
    })}
  />
);
registerRoot(Root);
