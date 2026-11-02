# VidsAI

VidsAI creates and edits narrated videos with React, a TypeScript/Express control server, SQLite, a separate editing agent and Remotion rendering. This branch runs entirely on Node.js. PHP, Laravel, Blade, Inertia and Composer are removed.

## What works

- Existing accounts and projects, registration, sign in/out, profile/password changes, account deletion and password recovery.
- Uploaded MP3/WAV narration, Deepgram transcription, NVIDIA scene planning, Pexels footage and durable background processing with retry.
- Scene review, footage regeneration, source trimming and private image/video replacement uploads.
- Remotion preview, seven caption styles, caption text/appearance, transitions, scene order, animation, overlays, audio gain/timing, music search/preview/selection and canvas settings.
- Ordered autosave, revision conflicts, undo/redo and agent plans that require explicit application and can be cancelled.
- Persistent export jobs, progress/cancellation, immutable render snapshots, signed media access and authenticated MP4 downloads.

WAN model configuration and UI remain available but require a key. AI voice generation, visual understanding, retrieval and other unused NVIDIA capabilities remain reserved for future development. The catalogue keeps all 21 models; the active fallback chains contain models validated for each existing task.

## Setup

Use Node 24 and npm. Clone this repository as `vidsAi` beside `remotion-api`, both on `migration/full-typescript`:

```text
workspace/
  vidsAi/
  remotion-api/
  runtime/       # created locally; private databases, media, logs and mail outbox
```

Install and build the worker first, then the app:

```sh
cd remotion-api
npm ci
npm run build:shared
cd ../vidsAi
npm ci
```

Copy `.env.example` to `.env`. Generate two different random secrets for `APP_KEY` and `WORKER_TOKEN`, for example by running this command twice:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Set the NVIDIA route credentials, Deepgram, Pexels and FreeSound keys in `.env`. The full inventory and endpoint contracts are in `nvidia/models.json`, `nvidia/requests.json` and `nvidia/NVIDIA_MODELS.md`. Real keys belong only in `.env` and `nvidia/private/`; both are ignored by Git.

```sh
npm run typecheck
npm test
npm run test:fresh
npm run build
npm run local:start
```

The Windows local launcher starts the control server at `http://127.0.0.1:8100`, render worker at 5211 and agent worker at 5212. It uses Node only. Stop/status commands are `npm run local:stop` and `npm run local:status`. On another OS, run `npm start` here and the two worker entry points separately with the same private environment; bind private workers to loopback.

An optional `runtime/node-local-config.json` selects the Node executable, browser, temporary directory, origin and database path. Copy `local-config.example.json` there and adapt paths. Install a compatible browser with Remotion or point `browserExe` at the existing browser executable. The launcher inherits the provider settings from `.env` for all three services.

`npm run dev` watches the control server; run `npm run build` after UI edits. `npm run dev:ui` serves the React frontend with API requests proxied to port 8100. Shared editing/composition changes in the worker need `npm run build` here to rebuild the shared packages.

## Data and migration

The default database is `runtime/node-database.sqlite`; a missing database is initialized automatically. If the historical `runtime/database.sqlite` exists, the server makes a SQLite backup first and opens the copy. Original files are never modified by that import. `NODE_DATABASE_PATH` and `NODE_MEDIA_ROOT` override the destinations.

Use `NODE_IMPORT_APP_ROOT` to select the original app and `npm run import:media` to copy its public/private media and render history. The original copy and the prior `migration/react-typescript` branch provide rollback. See `FULL_TYPESCRIPT_MIGRATION.md` for local cutover paths and verification evidence.

## Verification and limits

`npm test` uses a disposable database/media directory. Worker checks run with `npm run typecheck && npm test` in `remotion-api`. The opt-in `npm run test:browser` performs real generation and export using configured provider keys and the private local test recording/account fixtures. Ordinary automated checks require no live provider calls.

The live browser check covers an English recording. Arabic/Darija fallback alignment is retained and estimated timing is labelled for review; perceptual quality has not been revalidated here. An uploaded voiceover is required. The first selected canvas is exported; selecting all formats retains the choices but does not create three exports automatically. WAN remains untested live because its key is intentionally blank.

Password recovery uses SMTP when configured; development mode writes links to the private `runtime/node-mail-outbox` directory. The local launcher is for local development; production needs the usual HTTPS reverse proxy and persistent storage deployment configuration.
