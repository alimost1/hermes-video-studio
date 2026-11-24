# Hermes Video Studio

Turn a public website URL into a vertical animated explainer. A private Next.js dashboard manages a persistent queue; Hermes writes a structured storyboard, ElevenLabs creates timestamped narration, and Remotion renders React scenes on your Ubuntu VPS.

Designed for **8 CPU / 16 GB RAM**: one video job at a time, four concurrent rendering frames, 1080 × 1920 at 30 fps. No GPU is required for the included 2D templates.

## Included

- Private access-token login and authenticated media downloads.
- URL extraction with DNS-pinned public-network requests, redirect validation, timeouts, and download size limits.
- Hermes Agent integration through its documented `/v1/chat/completions` endpoint. The agent returns validated JSON; it never writes executable scene code.
- Darija, Arabic, French, and English narration selection. Darija pronunciation depends on the selected ElevenLabs voice; audition your voice before production.
- Five animated React layouts: hook, photo, facts, comparison, and conclusion.
- A second **Motion promo** style: a 45- or 15-second music-only Reel in the Creatin SEO Web look, rendered by the bundled `creatin-motion` skill.
- ElevenLabs speech timestamps, word highlighting, and SRT export.
- Storyboard review, title/narration/point edits, image selection, layout selection, and scene reordering.
- Live job status, render progress, video library, thumbnail, MP4 download, and manual retry.
- Redis persistence, input deduplication, cached narration, and cached source images.
- Clearly marked offline sample rendering, without provider keys.
- Docker Compose, automated checks, sample render CI, and a URL submission CLI for schedulers.

This is a **single-owner application**. The dashboard is an editor for structured scenes, not a general-purpose drag-and-drop timeline editor. The extraction service reads HTML and metadata; JavaScript-only, login-protected, or bot-protected pages can fail with a useful error. The source page is not executed in a browser.

## Quick start on Ubuntu

Install Docker Engine and Compose using Docker's official Ubuntu instructions. Clone or unpack this project, then:

```bash
cp .env.example .env
openssl rand -hex 32
```

Put the generated value in `STUDIO_TOKEN` in `.env`. Keep it private; it is the dashboard password and automation token. Set:

```dotenv
APP_ORIGIN=https://studio.your-domain.com
HERMES_BASE_URL=http://host.docker.internal:8642/v1
HERMES_API_KEY=your-dedicated-hermes-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
ELEVENLABS_VOICE_ID=your-selected-voice-id
```

The values above are placeholders. Never commit `.env`. Hermes and ElevenLabs credentials remain server-side.

```bash
docker compose up -d --build
docker compose logs -f worker
```

The web service listens on host **127.0.0.1:3000**. Put an HTTPS reverse proxy in front of it and set `APP_ORIGIN` to that exact browser origin (scheme, hostname, optional port; no trailing slash). Redis has no public port. Example Caddy host configuration:

```caddy
studio.your-domain.com {
    reverse_proxy 127.0.0.1:3000
}
```

For a local smoke test use an SSH tunnel, `ssh -L 3000:127.0.0.1:3000 your-vps`, and temporarily use `APP_ORIGIN=http://localhost:3000`. Open that address and sign in with `STUDIO_TOKEN`. Click **Try a sample render**. This creates a silent sample and does not call the paid providers.

Docker persists records and queue data in `redis-data`, and media/audio cache in `video-data`. Back up both volumes together. Do not run `docker compose down -v` unless you intend to erase those volumes.

## Connect Hermes Agent

Use a current Hermes release that supports the API server. Configure a dedicated profile and model/provider in Hermes first. In that profile's environment enable the API and give it a separate strong API key. Start its gateway following the official documentation:

- [Hermes API server](https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server)
- [Hermes profiles](https://hermes-agent.nousresearch.com/docs/user-guide/features/profiles)

The studio worker runs inside Docker. **A Hermes listener on host 127.0.0.1 is not reachable through `host.docker.internal`.** Bind the dedicated Hermes API to the host's Docker bridge IP (`API_SERVER_HOST`), or put Hermes on a private shared Docker network and use its service name. Keep port 8642 off the public interface. Verify the route from inside the worker container. Set `HERMES_BASE_URL` accordingly, including `/v1`.

For a host-installed gateway, inspect the Docker bridge address with `ip -4 addr show docker0`; bind to that address, not 0.0.0.0. Configure `API_SERVER_ENABLED=true`, `API_SERVER_KEY`, and `API_SERVER_HOST` in the dedicated profile, then start that profile's gateway. The supplied Compose host-gateway mapping is intended for this arrangement.

The director prompt is in `src/server/hermes.ts`. It passes extracted facts as data and requests JSON only. **Disable unnecessary tools and secrets in this Hermes profile.** Prompt instructions alone do not isolate a fully privileged agent; this task needs only text generation, not shell/file/browser tools. Do not connect a public-facing workflow to your unrestricted personal agent.

## Connect ElevenLabs

Set a valid API key and a voice ID available to that account. The default model is `eleven_multilingual_v2`; change `ELEVENLABS_MODEL_ID` if needed. The worker uses the [speech with timing API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps).

Audio is generated per scene and cached by narration + voice ID + model. After a completed response is cached, render retries reuse it. A network failure after a provider processed a request but before the response was cached can still incur another charge on manual retry. No automatic paid-request retries are enabled. Silence is used only for explicitly selected sample projects; real jobs fail clearly if the provider is unavailable.

Actual video length follows the voice recording plus small scene pauses. The 30/60/90-second setting is a writing target, not a forced audio cutoff.

## Automation

Submit a URL from a scheduler, script, or an authorized Hermes workflow:

```bash
npm ci
# .env supplies STUDIO_TOKEN. Set STUDIO_URL for a remote dashboard.
npm run submit -- https://example.com/article
```

Or call `POST /api/projects` with Bearer authentication:

```json
{
  "url": "https://example.com/article",
  "language": "darija",
  "duration": 60,
  "brand": "My Studio",
  "accent": "#e6533c",
  "autoRender": true
}
```

Poll `GET /api/projects/{id}` with the same authentication. All `/api/assets/...` downloads also require authentication. Keep tokens in environment variables, not URL query strings. An identical normalized input returns the existing project; use the project's render/retry controls when appropriate. This version does not automatically detect changes at an already-submitted URL.

A scheduled Hermes task can discover new permitted article/listing URLs and invoke the submission command with those URLs. For a deterministic RSS or sitemap watcher, use `scripts/watch.ts` and configure `WATCH_URL` in `.env`:

```bash
npm run watch
```

It reads RSS `<item><link>`, Atom `<entry><link href>`, or sitemap `<url><loc>`. It submits up to five unseen URLs each run and records successful submissions in `data/watch-seen.json`. Run it with cron from this checkout, for example `*/15 * * * * cd /opt/hermes-video-studio && /usr/bin/npm run watch >> /var/log/video-watch.log 2>&1`. Ensure the host Node/npm paths are correct. It refuses overlapping watcher runs. This is a host-side command; do not put it in the web request process. No schedule is installed automatically.

## Motion promo style (URL → 45-second Reel)

Besides the narrated explainer, the studio can turn a URL into a **music-only, 1080 × 1920, 30 fps promo** in the Creatin SEO Web motion style: a cream-and-lime kinetic hook, a search being typed, a brand reveal, a matching result, three reasons to click, a desktop mockup, the same page on a phone where the customer picks an option, a three-step route, and a held call to action. It reads on mute and ships with the original stereo score.

Pick **Motion promo · music only** in the dashboard, or submit from a script:

```bash
VIDEO_STYLE=motion VIDEO_BRAND="Zest Walks" VIDEO_ACCENT="#bcf75d" npm run submit -- https://example.com/tour
```

or `POST /api/projects` with `"style": "motion"`, `"language": "en"` (or `"fr"`), `"motionSeconds": 45` (or `15`). `VIDEO_STYLE=motion npm run watch` does the same for new feed or sitemap URLs.

How it works:

1. The page is extracted exactly as for the explainer.
2. Hermes returns a validated **brief** (`src/shared/motion.ts`): the opening question, search phrase, featured business, headlines, interface labels, a phone picker (dates, sizes, plans…), the closing action, and which source image best illustrates the offer. The director prompt is in `src/server/motion.ts`. As before, Hermes never writes executable code and image URLs are not sent to it.
3. The worker runs the vendored skill in `skills/creatin-motion/` as a child process with a minimal environment (no provider keys) and a 20-minute limit. It draws the scenes with `@napi-rs/canvas`, encodes with FFmpeg, and mixes `assets/score.m4a`.

Motion promos need **Hermes only** (no ElevenLabs), one render at a time, and no GPU. English and French only: the renderer uses Liberation fonts, which have no Arabic glyphs. Motion projects are regenerated, not edited; **Retry** re-renders from the saved brief. The brand mark is the first letter of the brand name unless you add a `logo` to the renderer brief. The sample render (**Try a sample render** with Motion selected) is fully offline.

The same folder is a Claude Code skill (`.claude/skills/creatin-motion`), so you can also ask Claude to adapt the brief, run `node skills/creatin-motion/scripts/render.cjs brief.json promo.mp4`, or render the storyboard sheet with `--sheet`. `references/zest-walks-brief.json` is a complete example. Run `npm run render:motion-smoke` to render a 15-second sample into `out/motion/`.

## Local development

Use Node 22+ and Redis 7. Install Chromium and Arabic fonts or let Remotion download its supported browser. With Redis running, configure `.env` and run in separate terminals:

```bash
npm ci
npm run dev
npm run worker
```

Set `HERMES_BASE_URL=http://127.0.0.1:8642/v1` for a host-only development setup. `.env` is automatically loaded by the worker and submission scripts. Next.js loads it for the web process.

```bash
npm run typecheck
npm test
npm run build
npm run render:smoke
```

The sample render writes `out/smoke.mp4` and `out/smoke.png`. The GitHub Actions workflow runs these same checks. See `docs/VALIDATION.md` for checks performed during development.

## Operational notes

- Keep one worker replica with this Compose preset. Four frame renderers share its CPU budget; benchmark before increasing concurrency.
- Progress before rendering indicates pipeline stages; rendering progress comes from Remotion. Connection badges indicate configuration presence, not a successful provider credential test.
- Original website images may be copyrighted. Use pages and media you are permitted to repurpose.
- Failed downloads produce a visible warning and a text-only scene. No replacement images or property facts are invented by application code; review AI scripts for factual accuracy.
- Authentication is for one trusted owner. This release has no teams, public signup, billing, social posting, background music, or asset upload.
- Source JSON, rendered files, and caches remain until you remove them. Monitor disk space. `npm run cleanup` removes unreferenced old media and old voice-cache entries; current project files and active jobs are preserved. It defaults to 30 days (`RETENTION_DAYS`). Back up first.
- An interrupted worker can recover through BullMQ's stalled-job handling. If retries are exhausted, the project is marked failed for manual retry.
- Retained output is not automatically published to any social platform.

## License

Application code: MIT, see `LICENSE`. Remotion is a separate dependency with its **own license**, not an MIT dependency. Individuals and qualifying small organizations can use it free; other organizations may need a commercial automation license. Check [Remotion's current terms](https://www.remotion.dev/docs/license/pricing). ElevenLabs and the Hermes model/provider have their own usage costs and terms.
