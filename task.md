# VidsAI browser rendering migration tasks

Updated 2026-11-07. Execute tasks in order. This file is the execution checklist for `docs/BROWSER_MVP_ROADMAP.md`. The final task delivers the existing VidsAI product with browser-side video composition, audio mixing, encoding, and MP4 creation.

## Completion contract

- Preserve the existing website design, page structure, navigation, editor panels, timeline, and Create → Review → Style → Edit → Export workflow.
- Preserve current working editing features and existing account/project data. Keep the same Export control and its progress, cancel, retry, and download experience. Add only necessary browser capability, limit, or recovery messages within the existing UI.
- Every new export and export retry uses the browser. There is no automatic server render fallback. The normal application can export while the server renderer is stopped and its submission routes are unavailable.
- Backend accounts, authorized media delivery, project sync, AI planning, transcription, stock searches, and provider generation can remain server-side. The browser assembles the resulting media and produces the final video. Provider generation has its own cost and availability rules.
- Preserve existing projects above the supported browser workload. Explain the restriction and allow an explicit copy/adjustment. Never silently trim a project, discard an effect, or change its saved dimensions to make an export pass.
- An implementation is complete only after its verification checkpoint passes. A disabled previously working caption style or editing operation is an unresolved parity task.

The supported export workload is the deliberate product limit agreed in the roadmap. The initial target is desktop Chrome/Edge, 60 seconds, 720p, 30 FPS, SDR H.264/AAC MP4. Preserve the website's existing responsive layout. Advertise export support only on configurations that pass the final checks.

## Working locations

| Area | Location |
| --- | --- |
| Browser app and backend | `D:/VidsAI-migration/full-typescript/vidsAi` |
| Shared composition, contract, editing core, workers | `D:/VidsAI-migration/full-typescript/remotion-api` |
| Portable fixture and server reference | `D:/VidsAI-migration/full-typescript/fixtures/iphone-export-reference` |
| Verification artifacts | `D:/VidsAI-migration/full-typescript/runtime` |

Use Node 24. Preserve existing uncommitted work. Keep runtime artifacts and private media outside Git. Never use live accounts or paid provider calls for routine regression checks.

## Verification policy

Implement a whole group before its checkpoint. During implementation, use focused type checks or a small reproduction when needed. Do not repeat full builds, complete browser journeys, or long export loops after each checkbox. Fix a failed check and rerun its affected cases. Repeat the whole checkpoint only when the fix affects the whole group.

At checkpoints, record the tested revision or working-tree snapshot, browser/OS versions, commands, pass/fail results, and artifact paths. Reuse fixtures and meaningful regression checks. Keep mock-provider evidence separate from live-provider evidence. Tests involving exports must inspect actual output, because a successful download alone can still contain black frames or silent audio.

Check boxes only after the stated deliverable exists. Record unresolved issues under the group that owns them. Do not skip ahead to final sign-off because a prototype succeeds.

## Already completed preparation

- [x] P1. Install matching `@remotion/media` and `@remotion/web-renderer` 4.0.539 in the browser app. Add a shared `CompositionMedia` adapter and a development fixture exporter in `resources/js/editor/browser-export/`.
- [x] P2. Export the three-second fixture in Chrome and Edge, cancel an active export, and export twice again in the same tab. Verify 360×640, 30 FPS, 90 video frames, H.264/AAC, and external network blocking. Evidence is in `../runtime/browser-export-vVUKjY/verification.json` and its MP4/comparison files.

This evidence covers a small fixture. Audio levels differ from the worker reference by roughly 3 dB. JavaScript heap samples exclude native codec/GPU memory. The prototype buffers output in memory and is outside the normal product flow. The regular editor still submits server export jobs. These are open migration tasks below.

## Group A — establish parity and finish the shared browser renderer

- [x] A1. Capture the current product baseline before further changes. Save Git status/diffs for both repositories, screenshots of Create, Review, Style, and Editor at the current desktop and compact layouts, and a short working-feature inventory. Preserve the uncommitted resizer/editor work. Store this baseline under the runtime verification directory.
- [x] A2. Inventory every export entry point and dependency. Inspect `resources/js/editor/pages/Editor.tsx`, `api.ts`, `server/app.ts`, `server/jobs.ts`, `server/document.ts`, worker render routes, and any workflow recovery links. Record where submit, retry, poll, cancel, download, old export history, and startup recovery currently depend on the worker. Include server FFmpeg preprocessing and thumbnail/proxy creation if export requires them.

Baseline evidence and the dependency inventory are recorded in [the browser export baseline](docs/BROWSER_EXPORT_BASELINE.md).
- [ ] A3. Make `browser-export/render.tsx` consume a validated immutable project snapshot and resolved assets without fixture IDs or hardcoded dimensions. Keep the composition in `remotion-api/remotion/VideoMerger.tsx` and its shared package. Use browser media adapters for video/audio and resolve blob URLs safely. Keep Node-only dependencies and server credentials out of browser imports.
- [ ] A4. Resolve the measured audio difference. Compare source levels, channel layout, gain, fades, sequence offsets, and playback speed. Establish the expected mono/stereo mix semantics and implement them consistently. Verify both narration and music against source signals and the baseline. Avoid applying an unexplained global gain correction.
- [ ] A5. Make all existing caption presets and transitions browser-compatible. Cover `default`, `progressive_highlight`, `tiktok_trending`, `arabic_banner`, `rectangular`, `rounded_progressive`, and `rectangular_banner`. Cover cuts, fades, zooms, slide directions, and clip zoom animation. Fix unsupported CSS, fonts, RTL/mixed-direction layout, and time-based animation using the shared frame timing model. Preserve the visual design.
- [ ] A6. Record the pinned renderer's production license eligibility, telemetry behavior, and expected cost. Resolve configuration before production use. Do not infer eligibility from a development render succeeding.

### Checkpoint A — one renderer parity batch

- [ ] Rebuild shared packages, then type-check both repositories. Run existing editing/contract tests once for this group.
- [ ] Run one compact fixture set through browser export and the reference path. Cover both audio sources, muted/silent projects, source trim and looping, speed, overlay start/end boundaries, all caption styles, Arabic/mixed text, transitions, and aspect ratios.
- [ ] Use FFprobe/decoded samples to verify dimensions, frame count, codec, nonblank frames, audible tracks, gains/fades, and audio/video timing within one output frame on controlled fixtures. Compare selected frames and typography with baseline images. Record any intentional encoder/rasterization differences.

**Pass condition.** Every inventoried rendering feature works in the browser within the intended workload. The audio discrepancy has an explained and verified resolution. Progress and cancellation work on a representative fixture. Licensing configuration has a documented decision. The next task is B1.

## Group B — implement bounded media access and export controls

- [ ] B1. Add a versioned browser render profile and structured validation errors. Enforce the roadmap limits in one reusable policy module. Start with 60 seconds/1,800 frames, portrait 720×1280, landscape 1280×720, square 720×720, 20 timeline clips, two active video decoders during transitions, two active audio sources including clip sound, 10 overlays with at most two visible, and 200 caption segments/1,000 timed words. Treat the profile as provisional until Checkpoint D measurements.
- [ ] B2. Inspect media before full decoding. Enforce 100 MiB per source and 300 MiB per project's distinct media, SDR H.264 input up to 1080p/30 FPS and 120 seconds, images up to 4 megapixels and 4,096 pixels on either side, and mono/stereo audio up to 48 kHz/120 seconds. Validate orientation, timestamps, actual codecs, and malformed metadata. Give an explicit reason for unsupported inputs. Use bounded file reads.
- [ ] B3. Implement capability checks for the actual dimensions, video/audio codecs, secure context, and selected output destination. Include a short encode/decode probe and source decode checks. Cache results only for the configuration they validate. Handle an encoder failing after a successful probe. Retain a video-only export path for projects without audio.
- [ ] B4. Implement a media resolver for existing authenticated URLs, private uploads, stock/generated assets, and local files. Resolve stable asset IDs to authorized sources and preserve legacy URL-based projects through an adapter. Refresh expiring URLs, honor CORS, bound downloads, and report missing files. Cache only what the project needs. Never persist blob URLs as durable identity.
- [ ] B5. Replace the prototype's full-output buffer with a tested file stream or app-owned OPFS output. Check storage headroom, catch quota/write/permission failures, finalize before success, and clean up partial outputs on cancel/failure. Keep cleanup scoped to owned job files. Bound decode caches, frame queues, thumbnails, and preloading. Measure the pinned library's behavior rather than treating its cache option as a total RAM ceiling.
- [ ] B6. Add a local export lifecycle with preparing, rendering, finalizing, succeeded, failed, cancelled, and interrupted states. Save the immutable snapshot and revision before starting. Coordinate one active export across tabs. Release media/locks on all terminal paths, suspend competing preview work, and add progress/stall handling. After reload, recover the project and offer a fresh export from the saved snapshot.
- [ ] B7. Persist the local export snapshot, asset mapping, and output references needed for recovery. Use IndexedDB and file storage as appropriate. Handle missing local media with relinking, account changes with ownership isolation, and save conflicts without overwriting unsynced work. Preserve existing server project history and account synchronization.

### Checkpoint B — one safety and lifecycle batch

- [ ] Run focused checks for exact limits and just-over-limit cases, unsupported/malformed media, missing codecs, missing assets, expired URLs, and denied output storage. Verify rejection occurs before unbounded allocation and preserves the project.
- [ ] Run one browser lifecycle sequence covering success, cancellation, retry, reload/interruption, another exporting tab, network loss after required assets are cached, and output-write failure. Verify no stale active job, incorrect success state, leaked lock, or unbounded temporary-file accumulation.
- [ ] Type-check changed packages and inspect a valid MP4 from the new output path. Run a longer 30-second fixture once to catch whole-file buffering and obvious memory growth. Reserve the full device/stress matrix for Checkpoint D.

**Pass condition.** The renderer admits bounded workloads, produces a finalized local file, and preserves recoverable project state through failures. Existing media resolves correctly without a server render process. The next task is C1.

## Group C — connect browser rendering to the existing website

- [ ] C1. Replace the server-export submission in the existing `Editor.tsx` Export handler with local snapshot preparation, media resolution, preflight, and rendering. Preserve the current button, panel layout, labels, and visual styling. Save pending edits before taking the snapshot. Keep the renderer lazy-loaded until needed.
- [ ] C2. Connect local progress, cancel, failed-export retry, success, and download to the existing export state/UI. Retry the saved export revision. Label older-revision output using existing UI conventions. Distinguish device-local downloads from historical server downloads, and handle an unavailable local file without a broken link.
- [ ] C3. Update the other paths identified by A2. Remove active server polling/cancellation for new local exports, redirect export recovery to the browser, and prevent retries from restarting scene generation. Preserve reading/downloading completed historical server exports. Retain the existing generation-retry behavior.
- [ ] C4. Preserve editing and AI operation semantics. Run manual controls and agent Apply through the current editing core with profile validation. Send document revision and renderer capabilities to planning, reject stale proposals, and apply an accepted plan as one undoable operation. A cloud workflow result must not overwrite newer edits.
- [ ] C5. Exercise the current narration → transcription → planning → stock footage → Review → Style → Editor workflow with browser-resolvable assets. Keep provider keys, authorized AI operations, cancellation, and usage enforcement in the backend. Preserve existing provider feature flags and treat any previously unverified provider integration as a separate recorded limitation.
- [ ] C6. Preserve the original site throughout migration. Compare the current UI with A1 screenshots, including resizers, compact layouts, saving, undo/redo, caption editing, music selection, overlays, settings, and navigation. Place limit/recovery messages in existing components. Keep the standalone prototype outside the normal app navigation and production entry point.

### Checkpoint C — one full product regression batch

- [ ] Build shared packages and the production browser bundle, type-check both repositories, and run the existing app/worker tests once. Update meaningful existing export assertions for local results, including regression checks for stale revisions and retry routing.
- [ ] Run the normal Create → Review → Style → Edit → Export journey in the actual website with deterministic provider responses. Download and inspect the MP4. Repeat export after a manual edit and an agent Apply/Discard cycle. Verify save/reload, undo/redo, cancellation, retry, and historical downloads.
- [ ] Compare desktop and compact screenshots against A1 and inspect network traffic. Every new export originates from the existing UI and runs locally. Any server render submission is a checkpoint failure.

**Pass condition.** The previous website and working feature set operate through the normal product flow with local export. Simulated provider evidence is labelled accurately. The next task is D1.

## Group D — remove production render dependencies and validate the workload

- [ ] D1. Remove the production path that submits or queues new server render jobs. Audit `/projects/:id/export`, failed-export retry, worker `/render`, render cancellation, and queue recovery. Retain only the API behavior actually needed by local exports and historical artifacts. Handle existing queued jobs explicitly during migration so they do not remain stuck or restart unexpectedly.
- [ ] D2. Separate any AI/provider duties that share a worker process from its rendering duties. Keep required AI routes available while final-video rendering is disabled. Move export-required normalization/proxy/thumbnail work to bounded browser processing or reject unsupported inputs early. A fresh supported project must export without server FFmpeg, Chromium rendering, or a render-worker process.
- [ ] D3. Update production startup/configuration and operational checks so rendering services are optional for the product. Keep reference rendering tools available only for development comparisons if needed. Remove server-render fallbacks, hidden export triggers, and obsolete client assumptions. Inspect the production bundle for server-only code and secrets.
- [ ] D4. Measure representative 15-, 30-, and 60-second projects, including maximum admitted complexity. Capture export time, UI responsiveness, total browser/process memory where measurable, temporary disk use, and cleanup. Exercise an integrated-GPU 8 GB Windows device if available. Add macOS support only after actual tests on a Mac. Record unavailable device coverage explicitly.
- [ ] D5. Adjust profile limits from measurements and expose the same policy to import, editing, AI planning, and export. Revalidate existing projects without rewriting them. Provide explicit remedies for excessive duration, resolution, complexity, or unsupported media. Avoid silently degrading the result.
- [ ] D6. Verify remote AI cost controls separately from local rendering. Keep server-enforced quotas/rate limits and idempotent retries. Where trial credits apply, ensure reservations settle/release correctly. Confirm the normal website can complete a bounded live-provider workflow using an explicitly budgeted test or record the required external test as pending.

### Checkpoint D — one release candidate batch

- [ ] On each supported reference configuration, run 20 repeated maximum-profile exports in a controlled batch. Require no tab crash, data loss, or steadily growing retained memory/temp storage. Investigate failures and reduce workload limits if necessary. Rerun only affected cases after fixes.
- [ ] Exercise foreground cancellation, backgrounding/sleep, limited storage, interrupted download, missing fonts, rotated clips, media expiry, and account switching in one failure matrix. Target cancel acknowledgement within two seconds and cleanup within five seconds during normal foreground operation. Record measured exceptions.
- [ ] Test the production build with its real asset authorization/CORS configuration. Verify the live-provider journey separately from deterministic fixtures. Required external evidence remains unchecked until obtained.

**Pass condition.** The supported workload is backed by actual device measurements, the production app is independent of server rendering, and required product parity/live-provider checks pass. The next task is E1.

## Group E — final product acceptance

- [ ] E1. Prepare the release candidate and account/project fixtures from the original product. Stop the final-video rendering service, block its submission endpoints, and keep the normal backend/AI services available. Use clean browser profiles with empty export caches so old artifacts cannot satisfy the test.
- [ ] E2. In Chrome and Edge, use the original website to open an existing project and create a fresh one. Complete Review, styling, timeline/caption/music/overlay edits, agent proposal Apply/Discard, save/reload, and Export → Download. Also cancel/retry an export and export an older saved snapshot. Inspect the new MP4 files and confirm no render job was queued and no rendering endpoint was called.
- [ ] E3. Complete the UI and feature parity inventory from A1. Resolve every missing previously working feature or unexplained visual regression. Confirm that browser limits are clearly communicated and preserve oversized/unsupported existing projects. Retain historical downloads and account data.
- [ ] E4. Run the final shared build, type checks, existing regression suite, production build, and the focused product smoke once on the final code. Reuse Checkpoint D stress evidence if no subsequent renderer/media/limits changes invalidate it. Record final artifact paths, supported browser/device profiles, measured limits, and all acceptance results.
- [ ] E5. Mark this migration complete only when E1–E4 pass. The delivered product is the previous VidsAI website and working editing workflow, with every new final-video export and export retry composed, mixed, encoded, and saved by the client browser. Update the roadmap status with the final verification evidence.

## Follow-up scope

After E5, collect consented beta export results and track the roadmap's reliability target across 100 attempts. Keep this separate from local implementation completion. Start a separate iPhone plan after the browser MVP release criteria are met. Additional blank-project/offline-library features, expanded formats/duration, native iPhone/Android development, and broad billing redesign are follow-up work unless a specific dependency above requires them for current functionality.

## Progress record

Next executable task is A3. P1–P2 and A1–A2 are complete. Checkpoint A remains open.

- 2026-11-07 — Verified the starting version for A1–A2. Both repositories passed type checks, 18 app and worker tests passed, the generated contract matched, and the production application built. UI baseline screenshots and prior prototype evidence are archived in `../runtime/browser-migration-baseline`. Continue with A3.

At each checkpoint, append one concise entry with the date, completed task IDs, verification result/artifact path, and the next task or exact blocker. This keeps future work resumable without rerunning already valid verification.
