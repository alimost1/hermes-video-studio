import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { VideoProps, VideoScene } from "../shared/schema";
const paper = "#f4f0e6",
  ink = "#20251f";
function SceneView({
  scene,
  accent,
  language,
  index,
}: {
  scene: VideoScene;
  accent: string;
  language: string;
  index: number;
}) {
  const frame = useCurrentFrame(),
    { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 100 } });
  const rtl = language === "ar" || language === "darija";
  const current = scene.words.findIndex(
    (w) => frame / fps >= w.start && frame / fps <= w.end,
  );
  const group =
    current < 0
      ? []
      : scene.words.slice(
          Math.floor(current / 6) * 6,
          Math.floor(current / 6) * 6 + 6,
        );
  const fade = interpolate(
    frame,
    [0, 10, scene.durationFrames - 10, scene.durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill
      style={{
        padding: "190px 80px 200px",
        direction: rtl ? "rtl" : "ltr",
        opacity: fade,
      }}
    >
      <div
        style={{
          transform: `translateY(${(1 - enter) * 70}px)`,
          opacity: enter,
        }}
      >
        <div
          style={{
            fontSize: 24,
            letterSpacing: 3,
            fontWeight: 800,
            color: accent,
            marginBottom: 24,
          }}
        >
          {String(index + 1).padStart(2, "0")} / {scene.type.toUpperCase()}
        </div>
        <h1
          style={{
            fontSize:
              scene.type === "hook"
                ? scene.title.length > 65
                  ? 76
                  : 94
                : scene.title.length > 70
                  ? 58
                  : 68,
            lineHeight: 1.22,
            margin: 0,
            fontWeight: 900,
            overflowWrap: "anywhere",
            maxHeight: 440,
          }}
        >
          {scene.title}
        </h1>
        <div
          style={{
            width: 120,
            height: 8,
            background: accent,
            borderRadius: 10,
            marginTop: 40,
          }}
        />
      </div>
      {scene.image && (
        <div
          style={{
            height: 420,
            overflow: "hidden",
            borderRadius: 32,
            marginTop: 32,
            boxShadow: "0 20px 45px #20251f15",
          }}
        >
          <Img
            src={scene.image}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${1 + (frame / scene.durationFrames) * 0.08})`,
            }}
          />
        </div>
      )}
      {!scene.image && scene.type === "hook" && (
        <div
          style={{
            margin: "95px auto 25px",
            width: 280,
            height: 280,
            borderRadius: 70,
            background: accent,
            transform: `rotate(${-8 + enter * 3}deg) scale(${enter})`,
            boxShadow: `22px 22px 0 ${ink}`,
            display: "grid",
            placeItems: "center",
            color: "white",
            fontSize: 150,
            fontWeight: 900,
          }}
        >
          ↗
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: scene.type === "comparison" ? "row" : "column",
          gap: 18,
          marginTop: 32,
        }}
      >
        {scene.points.map((point, i) => {
          const p = spring({
            frame: frame - 14 - i * 10,
            fps,
            config: { damping: 17 },
          });
          return (
            <div
              key={i}
              style={{
                flex: 1,
                background: "white",
                padding: "22px 26px",
                borderRadius: 22,
                boxShadow: "0 10px 30px #20251f09",
                fontSize: 30,
                lineHeight: 1.45,
                fontWeight: 700,
                opacity: p,
                transform: `translateY(${(1 - p) * 40}px)`,
                borderInlineStart: `7px solid ${accent}`,
              }}
            >
              <span style={{ color: accent, marginInlineEnd: 20 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {point}
            </div>
          );
        })}
      </div>
      {scene.type === "closing" && (
        <div
          style={{
            marginTop: 85,
            fontSize: 160,
            color: accent,
            textAlign: "center",
            transform: `scale(${enter})`,
          }}
        >
          ✦
        </div>
      )}
      {!!group.length && (
        <div
          style={{
            position: "absolute",
            bottom: 150,
            left: 70,
            right: 70,
            textAlign: "center",
            fontSize: 38,
            lineHeight: 1.6,
            fontWeight: 700,
          }}
        >
          {group.map((w, i) => (
            <span
              key={i}
              style={{
                background:
                  frame / fps >= w.start && frame / fps <= w.end
                    ? accent
                    : "transparent",
                color:
                  frame / fps >= w.start && frame / fps <= w.end
                    ? "white"
                    : ink,
                padding: "4px 7px",
                borderRadius: 8,
              }}
            >
              {w.text}{" "}
            </span>
          ))}
        </div>
      )}
      {scene.audio && <Audio src={scene.audio} />}
    </AbsoluteFill>
  );
}
export function Film(props: VideoProps) {
  const frame = useCurrentFrame(),
    { durationInFrames } = useVideoConfig();
  let offset = 0;
  return (
    <AbsoluteFill
      style={{
        background: paper,
        color: ink,
        fontFamily: '"Noto Sans Arabic", "DejaVu Sans", sans-serif',
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(#20251f12 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 65,
          left: 80,
          right: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: 2,
        }}
      >
        <span>◈ {props.brand}</span>
        <span style={{ color: "#7c8176" }}>STORIES IN MOTION</span>
      </div>
      {props.scenes.map((scene, index) => {
        const from = offset;
        offset += scene.durationFrames;
        return (
          <Sequence
            key={scene.id}
            from={from}
            durationInFrames={scene.durationFrames}
          >
            <SceneView
              scene={scene}
              accent={props.accent}
              language={props.language}
              index={index}
            />
          </Sequence>
        );
      })}
      <div
        style={{
          position: "absolute",
          bottom: 65,
          left: 80,
          right: 80,
          height: 5,
          background: "#20251f18",
        }}
      >
        <div
          style={{
            height: "100%",
            background: props.accent,
            width: `${(frame / Math.max(1, durationInFrames - 1)) * 100}%`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}
