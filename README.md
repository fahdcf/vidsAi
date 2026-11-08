# VidsAI

VidsAI creates and edits narrated videos with React, a TypeScript/Express server, SQLite, and a server-side editing agent. The existing editor renders and encodes new MP4 exports in the browser.

## What works

- Existing accounts and projects, registration, sign in/out, profile/password changes, account deletion and password recovery.
- Uploaded MP3/WAV narration, Deepgram transcription, NVIDIA scene planning, Pexels footage and durable background processing with retry.
- Scene review, footage regeneration, source trimming and private image/video replacement uploads.
- Remotion preview, seven caption styles, caption text/appearance, transitions, scene order, animation, overlays, audio gain/timing, music search/preview/selection and canvas settings.
- Ordered autosave, revision conflicts, undo/redo and agent plans that require explicit application and can be cancelled.
- Local export progress, cancellation, saved-revision retry, and MP4 downloads. Historical server exports remain available through authenticated links.

WAN model configuration and UI remain available but require a key. AI voice generation, visual understanding, retrieval and other unused NVIDIA capabilities remain reserved for future development. The catalogue keeps all 21 models; the active fallback chains contain models validated for each existing task.

## Setup

Use Node 24 and npm. Clone VidsAI, run `npm ci` from this repository, and copy `.env.example` to `.env`.

Set the NVIDIA route credentials, Deepgram, Pexels and FreeSound keys in `.env`. The full inventory and endpoint contracts are in `nvidia/models.json`, `nvidia/requests.json` and `nvidia/NVIDIA_MODELS.md`. Real keys belong only in `.env` and `nvidia/private/`; both are ignored by Git.

```sh
npm run typecheck
npm test
npm run test:fresh
npm run build
npm run local:start
```

The Windows local launcher starts VidsAI at `http://127.0.0.1:8100`. Use `npm run local:stop` and `npm run local:status` to manage it. On another OS, run `npm start`. The server handles the editing agent and provider calls. Deploy the website over HTTPS for browser export.

The optional `../runtime/node-local-config.json` selects the Node executable, temporary directory, origin, and database path. Copy `local-config.example.json` there and adapt paths.

`npm run dev` watches the server. `npm run dev:ui` serves the frontend and proxies API requests to port 8100. Contracts, editing logic, and compositions are in `shared/`. The planner is in `server/agent/`. Run `npm run build` to build the production frontend.

## Data and migration

The default database is `runtime/node-database.sqlite`; a missing database is initialized automatically. If the historical `runtime/database.sqlite` exists, the server makes a SQLite backup first and opens the copy. Original files are never modified by that import. `NODE_DATABASE_PATH` and `NODE_MEDIA_ROOT` override the destinations.

Use `NODE_IMPORT_APP_ROOT` to select the original app and `npm run import:media` to copy its public/private media. Set `NODE_IMPORT_RENDER_ROOT` to copy historical MP4s from a specific directory. The original copy and the prior `migration/react-typescript` branch provide rollback. See `FULL_TYPESCRIPT_MIGRATION.md` for local cutover paths and verification evidence.

Point `NODE_LEGACY_RENDER_OUTPUT_DIR` at the retired worker's existing output directory when it differs from `../runtime/node-renders`. The app serves those files directly after checking ownership. Startup retires old queued server exports and keeps their snapshots available for browser retry.

## Verification and limits

`npm test` uses a disposable database/media directory. The suite includes contract, planner, and API checks. The opt-in `npm run test:browser` performs real generation and export using configured provider keys and the private local test recording/account fixtures. Ordinary automated checks require no live provider calls.

The live browser check covers an English recording. Arabic/Darija fallback alignment is retained and estimated timing is labelled for review; perceptual quality has not been revalidated here. An uploaded voiceover is required. The first selected canvas is exported; selecting all formats retains the choices but does not create three exports automatically. WAN remains untested live because its key is intentionally blank.

Browser export targets desktop Chrome and Edge on the tested Windows configuration. The initial profile allows up to 60 seconds, 30 FPS, and 720p-class H.264/AAC MP4. Larger project canvases keep their editing coordinates and are scaled for export. The Export button shows the output dimensions. Local exports use browser storage and do not consume AI usage allowances. The server applies rolling daily allowances per account and globally to generation, planning, stock, music, and optional AI video requests.

Password recovery uses SMTP when configured; development mode writes links to the private `runtime/node-mail-outbox` directory. The local launcher is for local development; production needs the usual HTTPS reverse proxy and persistent storage deployment configuration.

## GitHub checks

GitHub Actions installs dependencies, type-checks the app, runs tests with a fresh SQLite database, and builds the frontend from this repository.

## Studio workflow

The refreshed interface follows Create → Review scenes → Style video → Edit & export. Review offers an active scene preview, a storyboard strip, trim controls, stock search and replacement upload. Confirm each scene and move on, or use Confirm All Scenes. Unconfirmed review drafts are kept in the current browser session, including after a refresh.

The separate Style studio provides seven caption presets, live project preview, font/color/position controls, transitions, caption text and music. Save choices explicitly or use Open editor to save and continue. The editor retains ordered autosave and undo/redo, with a toggleable assistant, a property inspector and a timeline containing scene, caption, voiceover and music lanes. Drag scenes to reorder or use the Move earlier/later buttons. An export captures its saved revision; the UI flags older exports when newer edits exist.

The dashboard supports project search and status filters. Creation groups project details, narration and canvas selection. Processing displays actual completed checkpoints. Desktop, phone and tablet layouts share the same workflow. See UI_UX_REDESIGN_PLAN.md and verification/ui-browser.json for the implementation and acceptance record.

The editor uses a viewport-sized workspace with a 360px assistant pane, an expandable 460px chat, readable conversation text, optional editing tools and a responsive preview. Proposed edits scroll separately from Apply/Discard, so approval stays visible. Conversation history and pending proposals recover after reload. On smaller screens the assistant opens as a focused overlay with Escape and keyboard navigation support.

The opt-in `node scripts/editor-layout-check.cjs` uses the private local test account to verify real provider planning, explicit approval, discard and reload recovery. A separate intercepted 30-change proposal stresses scrolling at desktop, short laptop, tablet and phone sizes without executing synthetic edits. See `verification/editor-layout.json` and `verification/editor-workflow.json` for the passing checks; these checks need the local test fixtures and configured providers.
