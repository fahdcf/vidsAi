# Migrated VidsAI development setup

The product backend remains Laravel 12. The dashboard, creation form and editor use React 19 and TypeScript through Inertia 2. Scene review, provider controls, account pages and other existing Blade screens remain available during the incremental migration. The editor and render worker share the same Remotion composition and versioned contracts. New editing algorithms belong in `remotion-api/packages/editing-core`, rather than PHP controllers.

## Paired checkout

Keep the repositories as siblings named `vidsAi` and `remotion-api`. Use the two commits recorded in the paired release manifest. Current shared packages are version 0.1.0; all Remotion packages use 4.0.539, and both applications use React 19.0.0 and Zod 4.6.7.

```text
your-work-folder/
  vidsAi/
  remotion-api/
  runtime/                 ignored configuration, logs and optional local data
```

Use Node 24 and PHP 8.2 or newer, with SQLite, fileinfo, mbstring, curl, openssl and the usual Laravel extensions. The verified machine uses Node 24.22.1 and PHP 8.4.5. Run package-manager commands with the intended Node version; Windows npm.cmd can otherwise select a different adjacent node.exe.

1. Install locked PHP dependencies in `vidsAi`: `composer install`.
2. Copy `.env.example` to `.env`; generate an application key with `php artisan key:generate`. Set `APP_URL=http://127.0.0.1:8100`, `DB_CONNECTION=sqlite`, a writable absolute `DB_DATABASE` path and `QUEUE_CONNECTION=database`.
3. Generate a private random `WORKER_TOKEN` and put it in the ignored `.env`. The local launcher supplies that same token to both workers. Keep `EDITING_WORKER_URL=http://127.0.0.1:5101` and `AGENT_WORKER_URL=http://127.0.0.1:5102`.
4. Create the SQLite file and run `php artisan migrate`. Existing installations must back up their database and media before applying migrations. Migrations add tables; they do not drop existing project fields.
5. Install renderer dependencies with `node scripts/install-deps.cjs ci` from `remotion-api`. This helper also supports node_modules stored through a Windows junction. It installs at the physical location and updates the source lockfile without replacing the junction. If the FFmpeg binary download is unavailable, set `FFMPEG_PATH` to an existing verified FFmpeg executable before running the helper. It reuses that executable and adjacent license/readme files, then runs the remaining native rebuild steps. `--offline` can be appended when the locked packages and native archives are already cached.
6. Run `npm run check:media`. Prepare Chromium using `npx remotion browser ensure`, or set an explicit compatible browser path in the local configuration. Run `npm run build:shared`. These three versioned packages include declarations and are consumed by the Laravel build.
7. In `vidsAi`, run `npm ci` and `npm run build`. The prebuild step rebuilds the matching shared packages automatically. There is no manual browser-player copy in this workflow.
8. Create a sibling `runtime` folder. Copy `vidsAi/local-config.example.json` to `runtime/local-config.json`, set the Node/PHP executable paths, and provide `runtime/php.ini` for that PHP installation. An optional `browserExe` selects an already installed compatible Chromium. The current verified installation explicitly selects its retained Chrome Headless Shell instead of redownloading a browser at startup.
9. Start all four processes with `node vidsAi/scripts/local.cjs start` from the parent folder. Use `status` and `stop` with the same command. Logs and process IDs are in `runtime`. The app is on port 8100; rendering is on 5101; editing/agent requests use 5102. Built frontend assets are served by Laravel, so a Vite server is optional.
10. Register a local account. For an independent local sample, run `node scripts/generate-fixtures.cjs` in `remotion-api`, then `php artisan editing:demo your-email` in `vidsAi`. This creates an explicitly labelled fixture project for that account. It does not contact media or AI providers.

## Existing data

Run `php artisan editing:migrate --dry-run`, inspect per-project diagnostics, then run the command without `--dry-run`. `--project=ID` limits its scope. Saved documents take priority over reconstructed scenes. Repeated execution does not duplicate revisions. Existing unavailable media must be replaced; the migration does not invent replacement footage.

Canonical documents contain stable project asset URLs/IDs. Private uploads are owner-protected; immutable export snapshots receive temporary signed asset URLs. Laravel owns persisted revisions, command receipts, export snapshots and agent runs. Workers return proposed changes; the backend commits them with an expected-revision check. Captions and narration stay anchored to timeline time on scene reorder. A trimmed video source window repeats when it is shorter than its assigned scene interval.

## Provider configuration

Live creation needs Deepgram, a configured OpenRouter scene model and Pexels. Music, WAN generation, image generation and Gemini fallback have additional existing settings in `config/services.php`. Optional Arabic alignment tools remain separate machine dependencies. The restored environment had no provider credentials; local fixture tests do not certify these external integrations. AI/no-voiceover modes were previously placeholders and are now rejected before creating stuck projects.

The editing assistant supports OpenRouter and Groq, preserves configured model names/rotation, caps planning at three requests of fifteen seconds each and twelve operations, and falls back to deterministic local commands. Plans have no rendering or media-generation side effects. Preparing and applying are separate actions; the batch is revision-checked and undoable. A cancelled run cannot commit changes. A restarted run can reuse its stored proposal. There is no autonomous arbitrary-code execution.

Restart the local services after adding or changing provider keys so the queue and agent processes load the new configuration.

Renderer requests require the worker token and bind to loopback by default. Public media hosts are explicitly enabled in `apps/render-worker/media-boundary.ts`; `ASSET_ALLOWED_HOSTS` adds another trusted provider. For arbitrary media, upload it privately to the project. This development setup does not publish videos to a file-hosting service.

## Verification

- Laravel: `php vendor/phpunit/phpunit/phpunit` from `vidsAi`. Tests prohibit unfaked provider requests.
- Frontend: `npm run typecheck` and `npm run build` from `vidsAi`.
- Worker: `npm run typecheck` and `npm test` from `remotion-api`.
- Real MP4 and API checks: `node --import tsx scripts/verify-worker.ts`.
- Seven caption styles, six formats, trimmed video, delayed audio and overlays: `node --import tsx scripts/verify-features.ts`.
- Restart recovery and simultaneous rendering: `node --import tsx scripts/verify-recovery.ts`.
- Browser journey: `node vidsAi/scripts/browser-check.cjs` from the parent folder, with services running and local fixtures generated. It uses Playwright and creates disposable accounts/projects in this isolated development database. Browser output and verification JSON are saved in `runtime`.

Tests for external providers should run separately with explicitly configured credentials and controlled narration examples. A compiled interface or a fixture render is not evidence that those accounts/integrations work.

CI definitions run the independent PHP and worker checks. The paired frontend workflow is manual because the renderer is a separate restricted repository: push the migration branches and configure the read-only `REMOTION_REPO_TOKEN` secret before invoking it. These workflows have been added locally; they have not been run on GitHub or published by this task.

## Rollback and ongoing work

Keep the old code and its original database/media snapshot together. Never point the original application at new-format data as a shortcut for rollback. The migration backups contain full Git bundles, local patches and independently checked SQLite backups. Restoring a separate copy of the old database has been rehearsed locally.

On the current laptop, source stays in `C:/Users/pp/Documents/ChatGPT/vid ai`. Backups, runtime and renderer dependencies are linked to `D:/VidsAI-migration` because C: ran out of space. Preserve that D: folder. These machine paths are configuration, not requirements for another installation.

Add new edit operations with a schema, a deterministic implementation, an undoable command, and input/output examples. Verify manual and agent edits through that same operation. Future media understanding, reference styles, branded template generation and generated composition code need their own evaluations; they are not implemented by the initial migration.
