"use client";
import { useEffect, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import { ArrowLeft, Music2, Plus, Save, Play, Trash2, WandSparkles } from "lucide-react";
import { Film } from "@/src/video/Film";
import { FPS, sampleVideo, totalFrames, type Project, type Storyboard, type VideoProps, type SoundEvent } from "@/src/shared/schema";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (res.status === 401) { window.location.href = "/login"; throw new Error("Please sign in."); }
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Request failed");
  return body;
}
const eventTypes: SoundEvent["type"][] = ["pop", "whoosh", "click", "chime"];
const presets = ["spring", "fade", "slide", "zoom"] as const;
export default function TimelineEditor() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState<Storyboard | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [music, setMusic] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.16);
  const project = projects.find(p => p.id === selected);
  useEffect(() => { void request<Project[]>("/api/projects").then(items => { setProjects(items); if (items[0]) setSelected(items[0].id); }).catch(e => setError(e.message)); }, []);
  useEffect(() => { setDraft(project?.storyboard ? structuredClone(project.storyboard) : null); }, [selected, project?.revision, project?.storyboard?.title]);
  const scenes = draft?.scenes || [];
  const normalized: VideoProps = useMemo(() => ({
    brand: project?.input.brand || sampleVideo.brand, accent: project?.input.accent || sampleVideo.accent,
    language: project?.input.language || "en", backgroundMusic: music, musicVolume,
    scenes: (draft?.scenes || sampleVideo.scenes).map((scene, i) => ({
      ...scene, durationFrames: scene.durationFrames || 150, words: [], image: undefined,
      soundEvents: scene.soundEvents || [],
    })) as VideoProps["scenes"],
  }), [draft, project?.input.brand, project?.input.accent, project?.input.language, music, musicVolume]);
  const timelineFrames = scenes.reduce((sum, s) => sum + (s.durationFrames || 150), 0);
  function patchScene(index: number, patch: Record<string, unknown>) {
    setDraft(d => d ? { ...d, scenes: d.scenes.map((s, i) => i === index ? { ...s, ...patch } : s) } : d);
  }
  function patchEvent(index: number, eventId: string, patch: Partial<SoundEvent>) {
    const current = scenes[index]?.soundEvents || [];
    patchScene(index, { soundEvents: current.map(e => e.id === eventId ? { ...e, ...patch } : e) });
  }
  function addEvent(index: number) {
    const scene = scenes[index]; if (!scene) return;
    const events = scene.soundEvents || [];
    patchScene(index, { soundEvents: [...events, { id: `sfx-${Date.now().toString(36)}`, type: "pop", atFrame: Math.min(12, Math.max(0, (scene.durationFrames || 150) - 1)), volume: 0.55 }] });
  }
  async function save(render = false) {
    if (!project || !draft) return;
    setBusy(true); setError("");
    try {
      const normalizedDraft = { ...draft, scenes: draft.scenes.map(s => ({ ...s, durationFrames: s.durationFrames || 150, animationStartFrame: s.animationStartFrame ?? 0, animationDurationFrames: s.animationDurationFrames ?? 24, animationPreset: s.animationPreset || "spring", soundEvents: s.soundEvents || [] })) };
      const updated = await request<Project>(`/api/projects/${project.id}`, { method: "PATCH", body: JSON.stringify({ revision: project.revision, storyboard: normalizedDraft }) });
      setProjects(old => old.map(p => p.id === updated.id ? updated : p)); setDraft(structuredClone(normalizedDraft));
      if (render) await request(`/api/projects/${project.id}/render`, { method: "POST" });
      const items = await request<Project[]>("/api/projects"); setProjects(items);
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  }
  return <main className="timeline-page">
    <header className="timeline-top"><a href="/"><ArrowLeft size={18}/> Studio</a><div><strong>Motion timeline</strong><span>ANIMATED EXPLAINER · 1080 × 1920 · 30 FPS</span></div><button disabled={!draft || busy} onClick={() => void save()}><Save size={16}/> Save edits</button></header>
    {error && <p className="timeline-error" role="alert">{error}</p>}
    <section className="timeline-workspace">
      <div className="timeline-preview">
        <div className="timeline-panel-heading"><strong>Live preview</strong><span>9:16 vertical</span></div>
        <div className="timeline-player"><Player component={Film} inputProps={normalized} durationInFrames={Math.max(1,totalFrames(normalized))} fps={FPS} compositionWidth={1080} compositionHeight={1920} controls loop style={{width:"100%",aspectRatio:"9 / 16"}} /></div>
        <div className="timeline-audio">
          <label className="timeline-toggle"><input type="checkbox" checked={music} onChange={e => setMusic(e.target.checked)}/> <Music2 size={16}/> Background music</label>
          <label>Music volume <strong>{Math.round(musicVolume*100)}%</strong><input type="range" min="0" max="0.35" step="0.01" value={musicVolume} onChange={e => setMusicVolume(Number(e.target.value))}/></label>
          <p>Sound effects are generated and placed at each scene event frame; event volume is editable below.</p>
        </div>
      </div>
      <div className="timeline-editor">
        <section className="timeline-panel">
          <div className="timeline-panel-heading"><strong>Project & scenes</strong><span>{scenes.length} scenes · {Math.round(timelineFrames/FPS)}s</span></div>
          <label>Project<select value={selected} onChange={e => setSelected(e.target.value)}><option value="">Sample preview</option>{projects.map(p => <option key={p.id} value={p.id}>{p.storyboard?.title || p.source?.title || p.input.url}</option>)}</select></label>
          {!project && <p className="timeline-hint">Choose an existing project to edit and save its timeline.</p>}
          {scenes.map((scene,i) => <article className="timeline-scene" key={scene.id}>
            <div className="timeline-scene-head"><span className="timeline-index">{String(i+1).padStart(2,"0")}</span><strong>{scene.title}</strong><span>{Math.round((scene.durationFrames || 150)/FPS)}s</span></div>
            <div className="timeline-track" aria-label={`Scene ${i+1} duration`}><span style={{width:`${Math.max(10,((scene.durationFrames || 150)/Math.max(1,timelineFrames))*100)}%`}}/><small>{Math.round((scene.durationFrames || 150)/FPS)} sec</small></div>
            <div className="timeline-fields">
              <label>Scene duration (seconds)<input type="number" min="1" max="180" step="0.5" value={((scene.durationFrames || 150)/FPS)} onChange={e => patchScene(i,{durationFrames:Math.max(30,Math.min(5400,Math.round(Number(e.target.value)*FPS)))})}/></label>
              <label>Animation preset<select value={scene.animationPreset || "spring"} onChange={e => patchScene(i,{animationPreset:e.target.value})}>{presets.map(p=><option key={p} value={p}>{p}</option>)}</select></label>
              <label>Animation starts (frames)<input type="number" min="0" max="300" value={scene.animationStartFrame ?? 0} onChange={e => patchScene(i,{animationStartFrame:Math.max(0,Math.min(300,Number(e.target.value)))})}/></label>
              <label>Animation duration (frames)<input type="number" min="1" max="180" value={scene.animationDurationFrames ?? 24} onChange={e => patchScene(i,{animationDurationFrames:Math.max(1,Math.min(180,Number(e.target.value)))})}/></label>
            </div>
            <div className="timeline-sfx-heading"><strong>Sound effects</strong><button type="button" className="timeline-small" onClick={() => addEvent(i)}><Plus size={14}/> Add event</button></div>
            {(scene.soundEvents || []).length === 0 && <p className="timeline-hint">No effects yet. Add one to sync a sound to an animation beat.</p>}
            {(scene.soundEvents || []).map(event => <div className="timeline-event" key={event.id}>
              <label>Effect<select value={event.type} onChange={e => patchEvent(i,event.id,{type:e.target.value as SoundEvent["type"]})}>{eventTypes.map(t=><option key={t} value={t}>{t}</option>)}</select></label>
              <label>At frame<input type="number" min="0" max={Math.max(0,(scene.durationFrames || 150)-1)} value={event.atFrame} onChange={e => patchEvent(i,event.id,{atFrame:Math.max(0,Math.min((scene.durationFrames || 150)-1,Number(e.target.value)))})}/><small>{(event.atFrame/FPS).toFixed(2)}s into scene</small></label>
              <label>Volume {Math.round(event.volume*100)}%<input type="range" min="0" max="1" step="0.05" value={event.volume} onChange={e => patchEvent(i,event.id,{volume:Number(e.target.value)})}/></label>
              <button aria-label="Remove sound effect" className="timeline-icon-button" onClick={() => patchScene(i,{soundEvents:(scene.soundEvents || []).filter(e=>e.id!==event.id)})}><Trash2 size={15}/></button>
            </div>)}
          </article>)}
          <div className="timeline-actions"><button disabled={!project || busy || !draft} onClick={() => void save()}><Save size={16}/>{busy ? "Saving…" : "Save timeline"}</button><button disabled={!project || busy || !draft || project.status === "rendering"} onClick={() => void save(true)}><Play size={16}/> Save & render MP4</button></div>
        </section>
        <section className="timeline-panel timeline-guide"><WandSparkles size={20}/><div><strong>Template: Animated technology explainer</strong><p>Spring, fade, slide and zoom presets control scene entrances. Sound effects start at their exact frame within each scene; scene durations set the timeline's cumulative offsets. Music is mixed beneath the event effects.</p></div></section>
      </div>
    </section>
  </main>;
}
