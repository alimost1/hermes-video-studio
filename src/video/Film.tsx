import React from "react";
import {
  AbsoluteFill, Audio, Img, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig,
} from "remotion";
import { FPS, type SoundEvent, type VideoProps, type VideoScene } from "../shared/schema";
const paper = "#f4f0e6", ink = "#20251f";
const audioCache = new Map<string, string>();
function wavDataUri(key: string, seconds: number, sample: (t: number) => number) {
  const cached = audioCache.get(key);
  if (cached) return cached;
  const rate = 22050, count = Math.floor(rate * seconds), bytes = new Uint8Array(44 + count * 2);
  const view = new DataView(bytes.buffer);
  const put = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i); };
  put(0, "RIFF"); view.setUint32(4, 36 + count * 2, true); put(8, "WAVE"); put(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  put(36, "data"); view.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) {
    const envelope = Math.min(1, i / (rate * 0.015)) * Math.max(0, 1 - i / count);
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample(i / rate) * envelope)) * 14000, true);
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 8192, bytes.length)));
  const uri = "data:audio/wav;base64," + btoa(binary);
  audioCache.set(key, uri);
  return uri;
}
function sfx(event: SoundEvent) {
  const seconds = event.type === "whoosh" ? 0.45 : 0.28;
  return wavDataUri("sfx-" + event.type, seconds, (t) => {
    const sweep = event.type === "whoosh" ? 220 + 900 * t / seconds : event.type === "chime" ? 880 : event.type === "click" ? 150 : 520;
    const tone = Math.sin(2 * Math.PI * sweep * t);
    return event.type === "whoosh" ? tone * Math.sin(Math.PI * t / seconds) : tone * (event.type === "chime" ? 0.8 + 0.2 * Math.sin(2 * Math.PI * 6 * t) : 1);
  });
}
function musicData() {
  return wavDataUri("ambient-music-v1", 8, (t) => {
    const notes = [110, 164.81, 220, 164.81, 130.81, 196, 261.63, 196];
    const f = notes[Math.floor(t * 2) % notes.length];
    return (Math.sin(2 * Math.PI * f * t) * 0.38 + Math.sin(2 * Math.PI * f * 2 * t) * 0.12);
  });
}
function SceneView({ scene, accent, language, index }: { scene: VideoScene; accent: string; language: string; index: number }) {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const start = scene.animationStartFrame ?? 0, length = scene.animationDurationFrames ?? 24;
  const local = Math.max(0, frame - start);
  const enter = scene.animationPreset === "fade"
    ? interpolate(local, [0, length], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : scene.animationPreset === "zoom"
      ? spring({ frame: local, fps, config: { damping: 15, stiffness: 120 } })
      : scene.animationPreset === "slide"
        ? spring({ frame: local, fps, config: { damping: 20, stiffness: 85 } })
        : spring({ frame: local, fps, config: { damping: 18, stiffness: 100 } });
  const rtl = language === "ar" || language === "darija";
  const current = scene.words.findIndex((w) => frame / fps >= w.start && frame / fps <= w.end);
  const group = current < 0 ? [] : scene.words.slice(Math.floor(current / 6) * 6, Math.floor(current / 6) * 6 + 6);
  const fade = interpolate(frame, [0, 10, scene.durationFrames - 10, scene.durationFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ padding: scene.image ? "150px 64px 290px" : "170px 72px 190px", direction: rtl ? "rtl" : "ltr", opacity: fade }}>
      <div style={{ transform: `translateY(${(1 - enter) * (scene.animationPreset === "slide" ? 90 : 55)}px) scale(${scene.animationPreset === "zoom" ? 0.88 + enter * 0.12 : 1})`, opacity: enter, flexShrink: 0 }}>
        <div style={{ fontSize: 24, letterSpacing: 3, fontWeight: 800, color: accent, marginBottom: 24 }}>{String(index + 1).padStart(2, "0")} / {scene.type.toUpperCase()}</div>
        <h1 style={{ fontSize: scene.image ? (scene.title.length > 70 ? 54 : 64) : scene.type === "hook" ? (scene.title.length > 65 ? 76 : 94) : (scene.title.length > 70 ? 58 : 68), lineHeight: 1.22, margin: 0, fontWeight: 900, overflowWrap: "anywhere", maxHeight: 440 }}>{scene.title}</h1>
        <div style={{ width: 120, height: 8, background: accent, borderRadius: 10, marginTop: 40 }} />
      </div>
      {scene.image && <div style={{ height: 800, flex: "1 1 800px", minHeight: 0, maxHeight: 980, background: "#e9e5da", overflow: "hidden", borderRadius: 32, marginTop: 32, boxShadow: "0 20px 45px #20251f15" }}>
        <Img src={scene.image} style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", display: "block" }} />
      </div>}
      {!scene.image && scene.type === "hook" && <div style={{ margin: "95px auto 25px", width: 280, height: 280, borderRadius: 70, background: accent, transform: `rotate(${-8 + enter * 3}deg) scale(${enter})`, boxShadow: `22px 22px 0 ${ink}`, display: "grid", placeItems: "center", color: "white", fontSize: 150, fontWeight: 900 }}>↗</div>}
      <div style={{ display: "flex", flexDirection: scene.type === "comparison" ? "row" : "column", flexShrink: 0, gap: 18, marginTop: scene.points.length ? 32 : 0 }}>
        {scene.points.map((point, i) => {
          const p = spring({ frame: frame - 14 - i * 10, fps, config: { damping: 17 } });
          return <div key={i} style={{ flex: 1, background: "white", padding: "22px 26px", borderRadius: 22, boxShadow: "0 10px 30px #20251f09", fontSize: 30, lineHeight: 1.45, fontWeight: 700, opacity: p, transform: `translateY(${(1 - p) * 40}px)`, borderInlineStart: `7px solid ${accent}` }}><span style={{ color: accent, marginInlineEnd: 20 }}>{String(i + 1).padStart(2, "0")}</span>{point}</div>;
        })}
      </div>
      {scene.type === "closing" && !scene.image && <div style={{ marginTop: 85, fontSize: 160, color: accent, textAlign: "center", transform: `scale(${enter})` }}>✦</div>}
      {!!group.length && <div style={{ position: "absolute", bottom: 130, left: 60, right: 60, textAlign: "center", fontSize: 38, lineHeight: 1.6, fontWeight: 700 }}>{group.map((w, i) => <span key={i} style={{ background: frame / fps >= w.start && frame / fps <= w.end ? accent : "transparent", color: frame / fps >= w.start && frame / fps <= w.end ? "white" : ink, padding: "4px 7px", borderRadius: 8 }}>{w.text} </span>)}</div>}
      {scene.audio && <Audio src={scene.audio} volume={1} />}
    </AbsoluteFill>
  );
}
export function Film(props: VideoProps) {
  const frame = useCurrentFrame(), { durationInFrames } = useVideoConfig();
  let offset = 0;
  return <AbsoluteFill style={{ background: paper, color: ink, fontFamily: '"Noto Sans Arabic", "DejaVu Sans", sans-serif' }}>
    {props.backgroundMusic !== false && <Audio src={musicData()} volume={props.musicVolume ?? 0.16} loop />}
    <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(#20251f12 1px, transparent 1px)", backgroundSize: "24px 24px", opacity: 0.5 }} />
    <div style={{ position: "absolute", top: 65, left: 80, right: 80, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 24, fontWeight: 800, letterSpacing: 2 }}><span>◈ {props.brand}</span><span style={{ color: "#7c8176" }}>STORIES IN MOTION</span></div>
    {props.scenes.map((scene, index) => {
      const from = offset; offset += scene.durationFrames;
      return <Sequence key={scene.id} from={from} durationInFrames={scene.durationFrames}>
        <SceneView scene={scene} accent={props.accent} language={props.language} index={index} />
        {(scene.soundEvents || []).map((event) => <Sequence key={event.id} from={event.atFrame} durationInFrames={Math.max(1, Math.ceil((event.type === "whoosh" ? 0.45 : 0.28) * FPS))}><Audio src={sfx(event)} volume={event.volume} /></Sequence>)}
      </Sequence>;
    })}
    <div style={{ position: "absolute", bottom: 65, left: 80, right: 80, height: 5, background: "#20251f18" }}><div style={{ height: "100%", background: props.accent, width: `${(frame / Math.max(1, durationInFrames - 1)) * 100}%` }} /></div>
  </AbsoluteFill>;
}
