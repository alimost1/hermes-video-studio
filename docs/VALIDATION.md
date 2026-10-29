# Validation record

Development environment: Node 24.22.1. Deployment image and CI target Node 22 on Debian/Ubuntu.

## Passed

- Strict TypeScript checking.
- Next.js production build, including the dashboard, login page, and API routes.
- Remotion webpack bundling (the smoke render advanced past bundling).
- 10 automated tests covering URL validation, private-network IP blocking, HTML extraction, Arabic timestamp handling, cross-scene subtitles, schema validation, authentication/expiry/origin checks, Hermes JSON handling, incomplete responses, and ElevenLabs cache reuse.
- Git whitespace checks.
- Production dependency audit: zero reported vulnerabilities after upgrading and deduplicating Zod to 4.6.7.

Provider tests use mocked responses. They do not spend API credits or prove the user's credentials are valid.

## Not verified in this environment

- Final MP4 rendering: Remotion was stopped by the execution environment's network-interface restriction (`uv_interface_addresses`, EPERM) while starting its internal render server. No successful sample MP4 is claimed.
- Browser visual QA: the managed preview launcher appended Vite-only `--host` and `--strictPort` flags to Next.js. The preview did not start; the application build itself succeeded.
- Docker startup and Redis-backed end-to-end processing: Docker and Redis services are unavailable here.
- Live Hermes and ElevenLabs requests: credentials were not provided.
- VPS deployment: no server access was provided.

## First VPS verification

1. Configure `.env` and start `docker compose up -d --build`.
2. Sign in and confirm the Connections page reports the worker online.
3. Use **Try a sample render**, wait for Completed, play and download the MP4.
4. Connect a dedicated Hermes profile and ElevenLabs voice.
5. Submit an owned public page with automatic rendering unchecked; inspect the storyboard and images.
6. Render; check Arabic text, pronunciation, picture selection, and captions.
7. Edit one scene, save, render again, and verify unchanged narration reuses cached audio.
8. Restart the services and verify the project library and downloads persist.

The CI workflow includes a real smoke render on an unrestricted Ubuntu runner once this project is pushed to GitHub.
