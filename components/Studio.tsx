"use client";
import { useCallback, useEffect, useState } from "react";
import { Player } from "@remotion/player";
import {
  ArrowUpRight,
  Plus,
  Link2,
  Film as FilmIcon,
  Check,
  Settings2,
  Download,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  LogOut,
  Play,
  Sparkles,
  Layers,
} from "lucide-react";
import { Film } from "@/src/video/Film";
import {
  FPS,
  sampleVideo,
  totalFrames,
  type Project,
  type Storyboard,
  type VideoProps,
} from "@/src/shared/schema";
type Config = {
  hermes: boolean;
  voice: boolean;
  worker: boolean;
  demo: boolean;
};
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (response.status === 401) {
    window.location.href = "/login";
    throw new Error("Please sign in.");
  }
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
}
export default function Studio() {
  const [projects, setProjects] = useState<Project[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [config, setConfig] = useState<Config | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [tab, setTab] = useState<"create" | "library" | "settings">("create"),
    [draft, setDraft] = useState<Storyboard | null>(null),
    [dirty, setDirty] = useState(false);
  const project = projects.find((p) => p.id === selected);
  const processing =
    project && !["completed", "failed", "review"].includes(project.status);
  const refresh = useCallback(async () => {
    try {
      const [items, c] = await Promise.all([
        api<Project[]>("/api/projects"),
        api<Config>("/api/config"),
      ]);
      setProjects(items);
      setConfig(c);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 4000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    setDraft(project?.storyboard ? structuredClone(project.storyboard) : null);
    setDirty(false);
  }, [selected, project?.revision, project?.storyboard?.title]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const preview: VideoProps =
    project?.video ||
    (draft
      ? {
          brand: project!.input.brand,
          accent: project!.input.accent,
          language: project!.input.language,
          scenes: draft.scenes.map((s) => ({
            ...s,
            durationFrames: 150,
            words: [],
          })),
        }
      : sampleVideo);
  const activeCount = projects.filter(
    (p) => !["completed", "failed", "review"].includes(p.status),
  ).length;
  function updateScene(i: number, key: string, value: unknown) {
    setDraft((d) =>
      d
        ? {
            ...d,
            scenes: d.scenes.map((s, n) =>
              n === i ? { ...s, [key]: value } : s,
            ),
          }
        : null,
    );
    setDirty(true);
  }
  function move(i: number, delta: number) {
    if (!draft) return;
    const scenes = [...draft.scenes];
    [scenes[i], scenes[i + delta]] = [scenes[i + delta], scenes[i]];
    setDraft({ ...draft, scenes });
    setDirty(true);
  }
  const create = async (form: HTMLFormElement, demo = false) => {
    const f = new FormData(form);
    await action(async () => {
      const p = await api<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          url: demo ? "https://example.com" : f.get("url"),
          language: demo ? "en" : f.get("language"),
          duration: Number(f.get("duration")),
          brand: f.get("brand"),
          accent: f.get("accent"),
          autoRender: f.get("autoRender") === "on",
          demo,
        }),
      });
      setSelected(p.id);
    });
  };
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span className="brand-icon">◈</span>
          <span>
            hermes<span className="brand-light">studio</span>
          </span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {(
            [
              { id: "create", icon: Plus, label: "Create a video" },
              { id: "library", icon: FilmIcon, label: "Video library" },
              { id: "settings", icon: Settings2, label: "Connections" },
            ] as const
          ).map((item) => (
            <button
              className={tab === item.id ? "nav active" : "nav"}
              key={item.id}
              onClick={() => setTab(item.id)}
            >
              <item.icon size={18} />
              {item.label}
              {item.id === "library" && (
                <span className="count">{projects.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="server-card">
            <span className={config?.worker ? "dot" : "dot offline"} />
            <b>{config?.worker ? "Worker online" : "Worker offline"}</b>
            <p>
              8 CPU · 16 GB deployment preset
              <br />
              One video at a time
            </p>
          </div>
          <button
            className="nav"
            onClick={() =>
              void action(async () => {
                await api("/api/logout", { method: "POST" });
                window.location.href = "/login";
              })
            }
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span>{" "}
            {tab === "create"
              ? "Create a video"
              : tab === "library"
                ? "Video library"
                : "Connections"}
          </span>
          <div className="top-right">
            <span className="status-pill">
              <span className={config?.worker ? "dot" : "dot offline"} />
              {activeCount
                ? `${activeCount} in queue`
                : "Your creative workspace"}
            </span>
            <span className="avatar">H</span>
          </div>
        </header>
        <div className="content">
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                ×
              </button>
            </div>
          )}
          {tab === "settings" ? (
            <>
              <p className="eyebrow">THE ENGINE ROOM</p>
              <h1>Everything, connected.</h1>
              <p className="subtitle">
                Provider credentials are configured on your VPS, never in the
                browser.
              </p>
              <div className="connection-grid">
                {[
                  {
                    name: "Hermes Agent",
                    ok: config?.hermes,
                    desc: "Turns source facts into a structured storyboard.",
                    env: "HERMES_BASE_URL · HERMES_API_KEY",
                  },
                  {
                    name: "ElevenLabs",
                    ok: config?.voice,
                    desc: "Natural narration, with precise word timing.",
                    env: "ELEVENLABS_API_KEY · ELEVENLABS_VOICE_ID",
                  },
                  {
                    name: "Remotion worker",
                    ok: config?.worker,
                    desc: "Your React scenes, rendered on your own server.",
                    env: "npm run worker",
                  },
                ].map((c) => (
                  <section className="panel" key={c.name}>
                    <Layers size={25} />
                    <h2>{c.name}</h2>
                    <p>{c.desc}</p>
                    <span className={c.ok ? "badge success" : "badge"}>
                      {c.ok ? "Configured" : "Needs setup"}
                    </span>
                    <code>{c.env}</code>
                  </section>
                ))}
              </div>
              <p className="note">
                “Configured” checks that environment values exist; it does not
                validate provider credentials. Rendering confirms connectivity.
              </p>
            </>
          ) : tab === "library" ? (
            <>
              <div className="heading-row">
                <div>
                  <p className="eyebrow">YOUR COLLECTION</p>
                  <h1>Stories you’ve made.</h1>
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    setSelected(null);
                    setTab("create");
                  }}
                >
                  <Plus size={18} />
                  New video
                </button>
              </div>
              {projects.length === 0 ? (
                <div className="empty">
                  <FilmIcon size={42} />
                  <h2>Your first story is waiting.</h2>
                  <p>Start with a link. We’ll help you make it move.</p>
                  <button className="primary" onClick={() => setTab("create")}>
                    Create a video <ArrowUpRight size={18} />
                  </button>
                </div>
              ) : (
                <div className="library-grid">
                  {projects.map((p) => (
                    <button
                      className="project-card"
                      key={p.id}
                      onClick={() => {
                        setSelected(p.id);
                        setTab("create");
                      }}
                    >
                      <div className="poster">
                        {p.thumbnail ? (
                          <img src={p.thumbnail} alt="Video thumbnail" />
                        ) : (
                          <FilmIcon size={42} />
                        )}
                        <span className="badge">{p.status}</span>
                      </div>
                      <h3>
                        {p.storyboard?.title ||
                          p.source?.title ||
                          new URL(p.input.url).hostname}
                      </h3>
                      <p>
                        {p.input.language.toUpperCase()} · {p.input.duration}s
                        target · {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="heading-row">
                <div>
                  <p className="eyebrow">
                    <span />
                    FROM A LINK TO SOMETHING WORTH WATCHING
                  </p>
                  <h1>
                    Give your ideas <em>motion.</em>
                  </h1>
                  <p className="subtitle">
                    One URL. A story, a voice, and a video that’s yours.
                  </p>
                </div>
                <span className="outline-pill">
                  <Sparkles size={15} />
                  Powered by your imagination
                </span>
              </div>
              <div className="studio-grid">
                <div className="editor-column">
                  <section className="panel source-panel">
                    <div className="section-title">
                      <span className="step">01</span>
                      <h2>Start with your source</h2>
                      <Link2 size={19} />
                    </div>
                    <form
                      id="create-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void create(e.currentTarget);
                      }}
                    >
                      <label htmlFor="url">Website URL</label>
                      <div className="url-input">
                        <Link2 size={18} />
                        <input
                          id="url"
                          name="url"
                          type="url"
                          placeholder="https://your-website.com/your-story"
                          required
                        />
                      </div>
                      <p className="help">
                        Public articles, product pages, and property listings.
                      </p>
                      <div className="form-grid">
                        <div>
                          <label htmlFor="language">Voice language</label>
                          <select
                            id="language"
                            name="language"
                            defaultValue="darija"
                          >
                            <option value="darija">Moroccan Darija</option>
                            <option value="ar">Arabic</option>
                            <option value="fr">French</option>
                            <option value="en">English</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="duration">Target length</label>
                          <select
                            id="duration"
                            name="duration"
                            defaultValue="60"
                          >
                            <option value="30">30 seconds</option>
                            <option value="60">60 seconds</option>
                            <option value="90">90 seconds</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="brand">Brand name</label>
                          <input
                            id="brand"
                            name="brand"
                            defaultValue="My Studio"
                            maxLength={48}
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="accent">Accent color</label>
                          <div className="color-input">
                            <input
                              id="accent"
                              name="accent"
                              type="color"
                              defaultValue="#e6533c"
                            />
                            <span>Your signature color</span>
                          </div>
                        </div>
                      </div>
                      <label className="check-label">
                        <input
                          name="autoRender"
                          type="checkbox"
                          defaultChecked
                        />
                        Render automatically after writing the storyboard
                      </label>
                      <button
                        className="primary generate"
                        disabled={
                          busy ||
                          !config?.hermes ||
                          !config?.voice ||
                          !config?.worker
                        }
                      >
                        <Sparkles size={18} />
                        {busy ? "Working…" : "Generate my video"}
                        <ArrowUpRight size={18} />
                      </button>
                      {(!config?.hermes || !config?.voice) && (
                        <p className="help">
                          Connect Hermes and ElevenLabs in your server
                          environment to generate from a URL.
                        </p>
                      )}
                      {config?.demo && (
                        <button
                          type="button"
                          className="text-button"
                          disabled={busy || !config?.worker}
                          onClick={() => {
                            const form = document.getElementById(
                              "create-form",
                            ) as HTMLFormElement;
                            void create(form, true);
                          }}
                        >
                          Try a sample render · no API credits
                        </button>
                      )}
                    </form>
                  </section>
                  {project && (
                    <section className="panel">
                      <div className="section-title">
                        <span className="step">02</span>
                        <h2>
                          {project.storyboard?.title ||
                            "Your video is taking shape"}
                        </h2>
                        <span className="badge">{project.status}</span>
                      </div>
                      <div className="progress">
                        <div style={{ width: `${project.progress}%` }} />
                      </div>
                      <div className="progress-label">
                        <span>
                          {project.status === "review"
                            ? "Ready for your review"
                            : project.status === "completed"
                              ? "Ready to share"
                              : project.status === "failed"
                                ? "Needs attention"
                                : "Processing your story"}
                        </span>
                        <b>{project.progress}%</b>
                      </div>
                      {project.error && (
                        <p className="error">{project.error}</p>
                      )}
                      {project.warnings.map((w) => (
                        <p className="note" key={w}>
                          {w}
                        </p>
                      ))}
                      {project.status === "failed" && (
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() =>
                            void action(async () => {
                              await api(`/api/projects/${project.id}/retry`, {
                                method: "POST",
                              });
                            })
                          }
                        >
                          <RefreshCw size={16} />
                          Retry job
                        </button>
                      )}
                      {draft && !processing && (
                        <div className="scene-editor">
                          <p className="help">
                            Edit narration and titles, then save before
                            rendering. Voice timing is rebuilt from the edited
                            narration.
                          </p>
                          {draft.scenes.map((scene, i) => (
                            <details key={scene.id}>
                              <summary>
                                <span className="scene-number">
                                  {String(i + 1).padStart(2, "0")}
                                </span>
                                {scene.title}
                                <span className="scene-type">{scene.type}</span>
                              </summary>
                              <div className="scene-fields">
                                <label>
                                  On-screen title
                                  <input
                                    value={scene.title}
                                    maxLength={100}
                                    onChange={(e) =>
                                      updateScene(i, "title", e.target.value)
                                    }
                                  />
                                </label>
                                <label>
                                  Narration
                                  <textarea
                                    value={scene.narration}
                                    maxLength={900}
                                    onChange={(e) =>
                                      updateScene(
                                        i,
                                        "narration",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </label>
                                <label>
                                  Key points (one per line, maximum 3)
                                  <textarea
                                    value={scene.points.join("\n")}
                                    onChange={(e) =>
                                      updateScene(
                                        i,
                                        "points",
                                        e.target.value.split("\n").slice(0, 3),
                                      )
                                    }
                                  />
                                </label>
                                <label>
                                  Scene layout
                                  <select
                                    value={scene.type}
                                    onChange={(e) =>
                                      updateScene(i, "type", e.target.value)
                                    }
                                  >
                                    {[
                                      "hook",
                                      "image",
                                      "facts",
                                      "comparison",
                                      "closing",
                                    ].map((type) => (
                                      <option key={type}>{type}</option>
                                    ))}
                                  </select>
                                </label>
                                <label>
                                  Source image
                                  <select
                                    value={scene.imageIndex ?? ""}
                                    onChange={(e) =>
                                      updateScene(
                                        i,
                                        "imageIndex",
                                        e.target.value === ""
                                          ? null
                                          : Number(e.target.value),
                                      )
                                    }
                                  >
                                    <option value="">Text only</option>
                                    {project.source?.images.map((_, index) => (
                                      <option key={index} value={index}>
                                        Image {index + 1}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <div className="button-row">
                                  <button
                                    className="secondary"
                                    disabled={i === 0}
                                    onClick={() => move(i, -1)}
                                  >
                                    <ChevronUp size={16} />
                                    Move up
                                  </button>
                                  <button
                                    className="secondary"
                                    disabled={i === draft.scenes.length - 1}
                                    onClick={() => move(i, 1)}
                                  >
                                    <ChevronDown size={16} />
                                    Move down
                                  </button>
                                </div>
                              </div>
                            </details>
                          ))}
                          <div className="button-row">
                            <button
                              className="secondary"
                              disabled={busy || !dirty}
                              onClick={() =>
                                void action(async () => {
                                  const p = await api<Project>(
                                    `/api/projects/${project.id}`,
                                    {
                                      method: "PATCH",
                                      body: JSON.stringify({
                                        revision: project.revision,
                                        storyboard: draft,
                                      }),
                                    },
                                  );
                                  setProjects((items) =>
                                    items.map((item) =>
                                      item.id === p.id ? p : item,
                                    ),
                                  );
                                  setDirty(false);
                                })
                              }
                            >
                              <Check size={16} />
                              Save storyboard
                            </button>
                            <button
                              className="primary"
                              disabled={busy || dirty || !config?.worker}
                              onClick={() =>
                                void action(async () => {
                                  await api(
                                    `/api/projects/${project.id}/render`,
                                    { method: "POST" },
                                  );
                                })
                              }
                            >
                              <Play size={16} />
                              Render video
                            </button>
                          </div>
                        </div>
                      )}
                    </section>
                  )}
                  {!project && (
                    <div className="workflow-strip">
                      <div>
                        <span>01</span>
                        <b>Find the story</b>
                        <p>Hermes reads your page</p>
                      </div>
                      <div>
                        <span>02</span>
                        <b>Give it a voice</b>
                        <p>Natural ElevenLabs narration</p>
                      </div>
                      <div>
                        <span>03</span>
                        <b>Make it move</b>
                        <p>Animated with Remotion</p>
                      </div>
                    </div>
                  )}
                </div>
                <aside className="preview-column">
                  <div className="preview-heading">
                    <span>THE BIG PICTURE</span>
                    <span>9:16 · 1080p</span>
                  </div>
                  <div className="preview-frame">
                    {project?.output && !dirty ? (
                      <video
                        key={project.output}
                        src={project.output}
                        poster={project.thumbnail}
                        controls
                        playsInline
                      />
                    ) : (
                      <Player
                        key={`${selected}-${project?.revision}`}
                        component={Film}
                        inputProps={preview}
                        durationInFrames={Math.max(1, totalFrames(preview))}
                        fps={FPS}
                        compositionWidth={1080}
                        compositionHeight={1920}
                        controls
                        loop
                        style={{ width: "100%", aspectRatio: "9 / 16" }}
                      />
                    )}
                  </div>
                  <div className="preview-caption">
                    <span className="dot" />
                    <span>
                      {project?.output
                        ? "Your rendered video"
                        : selected
                          ? "Storyboard preview · timing is illustrative until rendered"
                          : "Sample animation · your story goes here"}
                    </span>
                  </div>
                  {project?.output && (
                    <div className="download-row">
                      <a
                        className="primary"
                        href={`${project.output}?download=1`}
                      >
                        <Download size={16} />
                        Download MP4
                      </a>
                      <a
                        className="secondary"
                        href={`${project.subtitles}?download=1`}
                      >
                        Subtitles
                      </a>
                    </div>
                  )}
                  <div className="style-card">
                    <div className="swatches">
                      <span style={{ background: "#f4f0e6" }} />
                      <span
                        style={{
                          background: project?.input.accent || "#e6533c",
                        }}
                      />
                      <span style={{ background: "#20251f" }} />
                    </div>
                    <div>
                      <b>Editorial motion</b>
                      <p>Clean type. Bold accents. A story that flows.</p>
                    </div>
                  </div>
                </aside>
              </div>
              {projects.length > 0 && (
                <section className="recent">
                  <div className="heading-row">
                    <h2>Recent stories</h2>
                    <button
                      className="text-button"
                      onClick={() => setTab("library")}
                    >
                      View library <ArrowUpRight size={16} />
                    </button>
                  </div>
                  {projects.slice(0, 3).map((p) => (
                    <button
                      className="recent-row"
                      key={p.id}
                      onClick={() => setSelected(p.id)}
                    >
                      <span className="recent-icon">
                        <FilmIcon size={19} />
                      </span>
                      <span>
                        <b>
                          {p.storyboard?.title || new URL(p.input.url).hostname}
                        </b>
                        <small>
                          {p.input.language.toUpperCase()} ·{" "}
                          {new Date(p.createdAt).toLocaleDateString()}
                        </small>
                      </span>
                      <span
                        className={`badge ${p.status === "completed" ? "success" : ""}`}
                      >
                        {p.status}
                      </span>
                      <ArrowUpRight size={18} />
                    </button>
                  ))}
                </section>
              )}
            </>
          )}
          <footer>
            Made with Hermes, ElevenLabs & Remotion.
            <span>Your server. Your stories.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
