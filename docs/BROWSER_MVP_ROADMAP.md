# Browser MVP with local rendering

Updated 2026-11-08. The browser rendering migration passed local acceptance on the development PC. The existing editor creates new MP4s in Chrome and Edge, and VidsAI starts one server for the app, editing agent, and other AI provider calls. Public beta evidence and broader device coverage remain follow-up work before expanding support.

Execute the migration using [task.md](../task.md). Its ordered tasks and grouped verification checkpoints govern implementation. Final acceptance requires the existing website and working editing features to export fully in the browser with server rendering unavailable.

## Product decision

Build a short-video editor in the existing browser app. Manual editing, preview, and MP4 export run on the user's computer. Keep backend accounts, project synchronization, provider credentials, AI planning, transcription, stock searches, generated media, and usage enforcement. Local rendering removes our server's video encoding workload, but AI, media delivery, storage, and software licensing can still cost money.

Preserve the existing VidsAI website design, editor layout, navigation, and Create → Review → Style → Edit workflow. Switch the rendering implementation behind the existing Export control. Reuse the current export UI for progress, cancellation, errors, and download. Add messages within that UI when a browser or project exceeds supported limits.

Ship desktop Chrome and Edge first. Treat mobile browsers, including the user's iPhone, as a separate experimental compatibility tier until tested. A responsive page does not establish reliable mobile export. After a usable browser beta, start a separate native iPhone repository and reuse the document contract, commands, fixtures, backend, and product lessons.

Continue development on Windows. No Mac is required for this browser milestone.

## Existing foundation and repository ownership

| Location | Role in this roadmap |
| --- | --- |
| `D:/VidsAI-migration/full-typescript/vidsAi` | Active browser UI, backend, local project storage, capability checks, export controller |
| `D:/VidsAI-migration/full-typescript/fixtures/iphone-export-reference` | Existing portable synthetic fixture, reusable for browser export despite its historical name |

VidsAI owns the shared document contract, editing operations, compositions, and server-side planner. Keep SQLite, server environment variables, and provider credentials outside the browser bundle. The browser uses the shared composition with browser media adapters.

Existing stabilization work and portable fixtures remain useful. Previous end-to-end evidence covered simulated AI providers and a real server-rendered MP4. It does not prove browser rendering or live provider reliability. Preserve all uncommitted editor work and record a baseline before renderer changes.

## Rendering approach

Prototype `@remotion/web-renderer` with `@remotion/media`, pinned to the existing compatible Remotion release, currently 4.0.541. Validate APIs against that exact version rather than assume every option in the latest documentation exists. Reuse `VideoMerger` through browser-safe adapters and retain the existing integer-frame timing semantics.

Remotion's documented browser renderer uses WebCodecs and Mediabunny. This provides an incremental path, subject to the compatibility prototype. [Remotion browser rendering](https://www.remotion.dev/docs/client-side-rendering/)

Use compatible video/audio components, origin-accessible media, scoped rendering hooks, and frame-driven animation. Audit unsupported CSS and font rendering instead of assuming a browser preview will export identically. Experimental browser flags must not be required. [Migration guidance](https://www.remotion.dev/docs/client-side-rendering/migration), [rendering limitations](https://www.remotion.dev/docs/client-side-rendering/limitations)

If the prototype cannot meet memory, visual, or commercial requirements, evaluate a narrow Canvas/WebCodecs renderer with Mediabunny behind the same export interface. That would require rebuilding composition and preview behavior. Do not fund two production renderers in parallel. Neither screen recording nor a full FFmpeg WASM pipeline is the initial export architecture.

Before committing to the renderer, record Remotion license eligibility and projected cost. Its current pricing offers a free license for eligible individuals/small companies and usage-based company licensing. Browser execution alone does not establish zero licensing cost. Evaluate this against the free-editor business model. [Remotion pricing and eligibility](https://www.remotion.dev/docs/license/pricing)

## Initial workload specification

These are proposed engineering limits, not measured guarantees. Final launch limits may be lower after testing. No website can promise that a browser or operating system will never terminate a tab.

| Dimension | First supported desktop profile |
| --- | --- |
| Browser | Current stable Chrome/Edge on tested Windows/macOS configurations, plus actual codec/storage checks |
| Timeline | Up to 60 seconds, 30 FPS, maximum 1,800 output frames |
| Output dimensions | Portrait 720x1280, landscape 1280x720, square 720x720 |
| Output format | SDR MP4, H.264 video with AAC audio when audio exists; both actual configurations must pass a probe |
| Encoding starting point | Approximately 4 Mbps video and 128 kbps audio; tune from measured quality/size |
| Timeline clips | Up to 20 video/image items on one main track |
| Active media | At most two video decoders during a supported transition; one otherwise |
| Audio | At most two simultaneous sources, normally narration and music; clip sound counts toward this limit |
| Overlays | Up to 10 image overlays in the project, at most two visible together |
| Captions | One caption lane, up to 200 segments / 1,000 timed words; at most two displayed lines with validated text/layout bounds |
| Video inputs | SDR H.264 MP4, at most 1920x1080 or its portrait equivalent, constant frame rate up to 60 FPS, maximum 120 seconds per source |
| Other inputs | JPEG/PNG up to 4 megapixels; MP3/WAV/AAC only after actual decode checks; no animated image import initially |
| Import size | 100 MiB per file, 300 MiB total distinct project media, enforced before full reads |
| Image/audio details | Maximum image dimension 4,096 pixels; mono/stereo audio up to 48 kHz and 120 seconds per source |
| Preview | Default 360p-class display, bounded thumbnails and preloading; no second running preview during export |
| Export concurrency | One export per browser origin, coordinated across tabs; no batch formats |
| Export session | Foreground operation with progress/cancel; interruption can require restarting export |

The 60-second limit bounds work and output size. Source dimensions, decoded frames, image sizes, caches, and concurrent tracks bound memory pressure. A short 4K clip can be more demanding than a longer low-resolution clip. File size does not measure decoded memory.

Reject unsupported imports before expensive processing with a specific reason. Initial exclusions include 4K, HDR, HEVC, high-frame-rate media, unverified variable-frame-rate files, and arbitrary codecs. An iPhone recording may therefore need a compatible recording/export setting. Do not silently upload it for cloud conversion. Test rotation and timestamps even on admitted media.

A lower profile may offer 30 seconds at 480x854, 854x480, or 480x480 with 10 clips. Enable it only after tests show it helps, and retain the input restrictions. Lower output resolution cannot make an unsupported source decoder work. Expand to 120 seconds or 1080p separately after evidence, not both at once.

## Guardrails and recovery

1. Validate metadata before importing media. Inspect bounded file slices, dimensions, track count, codec, duration, and timestamps. Do not eagerly read all files into ArrayBuffers. Reject malformed metadata and files that exceed the profile.
2. Before export, validate the exact project revision, effects, media availability, fonts, codec configurations, output destination, storage headroom, and active profile. Run a short representative encode/decode probe including audio and a transition where applicable. A successful probe reduces risk but cannot guarantee the full export.
3. Use explicit small caches. Start experiments with a 64 MiB decoded-media cache setting, audit per-source read caches and decoded audio separately, and measure total process memory. This setting is not a global RAM ceiling. Prefer a directly selected file stream or OPFS output to holding the entire result in memory. Confirm lifecycle and cleanup behavior in the pinned renderer. [Export API and cache/output options](https://www.remotion.dev/docs/web-renderer/render-media-on-web)
4. Keep decoded frames, pending encodes, downloads, and thumbnails bounded. Release owned media resources and object URLs after use. Do not close resources owned by a library before that library finishes. Worker-based metadata/thumbnails can reduce UI work, but DOM composition still uses the main thread. Enable responsive scheduling and suspend preview/background asset work during export. [Page responsiveness](https://www.remotion.dev/docs/client-side-rendering/page-responsiveness), [WebCodecs resource handling](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API/Using_the_WebCodecs_API)
5. Treat storage estimates as advisory. Before an operation, budget missing media + temporary files + twice the estimated output + 100 MiB headroom. Catch quota/write errors regardless of the estimate. Request persistent storage where appropriate, and provide project backup/relink because browser data can be cleared or evicted. [Browser storage behavior](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
6. Save the document before rendering. Export an immutable snapshot identified by revision/hash. Persist local export states such as preparing, rendering, finalizing, succeeded, failed, cancelled, and interrupted. Mark success only when the output is finalized. A reloaded tab must recover the project and offer a fresh retry rather than claim the old encoder resumed.
7. Cancel via AbortSignal and release caches, decoders, temporary outputs, and origin locks. Handle lost file permission and incomplete files. Start with a 30-second visible-tab no-progress diagnostic and a 10-minute total-job timeout, then tune on reference hardware. Timers do not guarantee recovery from a blocked or terminated process.
8. On memory/codec/storage failure, explain the specific recovery action, such as shorter timeline, lower output profile, replacing media, or freeing storage. Preserve the project. Never automatically route a free export into a paid server render.
9. Expose limits in import, timeline editing, AI planning, and export. Existing oversized projects remain readable and recoverable, with export disabled and a duplicate-and-simplify option. Do not silently trim, reduce quality, or remove unsupported effects.

## Implementation sequence and gates

### 1. Preserve the baseline and prove browser export

- Record the existing working state and previous test evidence without discarding user edits. Keep the current server renderer available for development comparisons.
- Add an internal browser export route/button behind a feature flag, a small `BrowserExportService`, and a capability probe. Separate the renderer interface from UI state and backend job IDs.
- Install matching browser-render packages and adapt the existing three-second fixture. Produce a real MP4 locally with audio, a caption, an overlay, trimming, and a transition.
- Test Arabic/mixed-direction text early. Compare frames at boundaries and caption word changes, duration/frame count, and audio synchronization with the existing reference.
- Inspect network and worker logs to establish that no `/render` request was made. Test cancellation and a second export in the same tab.

**Gate 1:** Playable local MP4, correct timing, responsive cancellation, acceptable visual output, measured memory, and a recorded renderer/license decision. If this fails, resolve the engine choice before broad UI changes.

### 2. Implement profiles and admission checks

- Add a versioned `BrowserRenderProfile` and structured capability report with block reasons and recovery actions.
- Implement import restrictions and project complexity checks from the table. Use actual codec probes rather than browser name or reported RAM alone.
- Validate manual and AI commands against the same profile. Preserve existing document versions and all 15 editing-operation conformance cases.
- Add tests for exact limits and just-over-limit cases, corrupted input, unknown capabilities, unsupported effects, and transitions that exceed active decoder limits.

**Gate 2:** Unsupported work is blocked before full processing or export. The UI explains the relevant limit and preserves existing projects.

### 3. Make media and projects local

- Add stable asset IDs with metadata and a resolver for local files, cached stock media, and authorized remote media. Keep expiring URLs and Windows paths out of durable asset identity. Migrate old URL-based projects without losing their source references.
- Store project snapshots/commands in IndexedDB and large media in OPFS where supported. Keep files out of JSON/localStorage. Add transactional autosave, undo/redo, reload recovery, missing-media relink, and downloadable project backup.
- Add a blank manual project path that needs neither AI generation nor an upload. Reuse the current editor and command logic.
- Resolve remote CORS/authentication before export, renew signed URLs when needed, and download bounded media once. Prefer direct authorized media delivery. Any required backend proxy needs ownership checks, host restrictions, byte/time limits, and bandwidth accounting.
- Distinguish local-only media from optional cloud backup. Never imply local assets exist on another device merely because document metadata synced.

**Gate 3:** Import, edit, save, reload, and export a local project without uploading source media or starting a server render. Once the app and required assets are loaded, core manual work survives loss of backend connectivity. Renderer licensing/telemetry behavior must be measured before promising fully offline export.

### 4. Integrate supported editor features

- Keep the existing Export UI and route it through local preflight, progress, cancellation, finalized file saving, and immutable-snapshot retry. Verify that the editor layout and normal user journey still match the existing site.
- Validate trim/reorder/speed behavior, canvas variants, captions, overlays, music/voiceover volume/fades, and transitions through browser export.
- Build a parity matrix for all seven existing caption presets and current transitions. Fix incompatible styling or explicitly disable it before use. Use deterministic frame-based styling where CSS time-based transitions differ.
- Scale the export view without mutating canonical caption coordinates, font sizes, or aspect ratio. Test existing projects and preview/export agreement.
- Keep legacy server exports readable. Mark local export artifacts as device-local; do not fabricate server download URLs.

**Gate 4:** Every feature offered in the browser MVP exports correctly within its profile. Preview matches export at key frames, and local export/retry never regenerates scenes or calls a server renderer.

### 5. Reconnect AI workflows with controlled costs

- Retain narration/transcription, planning, stock search, scene review, styling, and agent Apply/Discard. They produce documents/commands that the browser can render.
- Send the active capabilities and revision with AI requests. Validate proposals on receipt and apply as one undoable transaction. Reject stale or over-limit plans.
- Keep provider keys on the backend. Upload only media required by the requested AI operation, with the user's clear action initiating it.
- Enforce server-side trial credits, rate/concurrency limits, request idempotency, and reservation/settlement for paid work. Client render limits are not billing controls.
- Keep generated video gated until its live-provider cost, payload, and compatible output are tested. Record delivery/storage costs separately from rendering savings.

**Gate 5:** A real narrated-video workflow and agent edit finish as a local MP4, with zero server render jobs and correct provider usage accounting. Mock-provider tests alone do not satisfy this gate.

### 6. Validate and release the browser MVP

- Test actual hardware, including the development PC, an integrated-GPU 8 GB Windows laptop, and a representative Mac borrowed or provided by a tester. Restrict launch support to configurations actually validated. Run repeated exports at 15/30/60 seconds and at maximum admitted complexity.
- Cover missing fonts, Arabic/mixed text, rotated clips, unusual timestamps, malformed input, expired URLs, quota exhaustion, cancellation/retry, another exporting tab, backgrounding, sleep, reload, and network loss.
- Record browser/OS/renderer version, source characteristics, completion time, responsiveness, peak process memory where measurable, and failure reason. Do not upload user media/text by default.
- Initial acceptance targets are no tab crashes/data loss in 20 repeated maximum-profile exports per reference configuration, no steadily growing retained memory after cleanup, cancel acknowledgement within two seconds and resource cleanup within five seconds in normal foreground operation, and audio/video alignment within one output frame on controlled fixtures. Investigate every supported-case failure; these sample results are not a universal guarantee.
- Target at least 95% successful admitted exports across the first 100 consented beta attempts, excluding user cancellations. Track rejections and interruptions separately so eligibility filtering cannot hide unusable experiences. Improve the engine or lower limits when targets fail.
- Verify production HTTPS, asset permissions/CORS, account isolation, server AI quotas, and browser bundle secret exclusion. Measure actual rendering and provider bills. Keep the public server-render endpoint disabled or inaccessible to free export traffic.

**Gate 6:** Testers can finish a short video from import or narration to downloaded MP4, save/recover work, and understand limits. Known supported-case crashes and data loss are resolved. Only then advertise the tested browser profile as the MVP.

### 7. Start iPhone after the browser MVP

Create the separate `vidsai-ios` repository after Gate 6. Pin the shared contract and fixtures, establish a Mac build environment, and prove native import/preview/export on the user's real iPhone before building the full phone UI. Reuse backend AI/auth/sync and operation semantics. Implement native rendering and local media storage rather than embedding the browser exporter as the native architecture.

Keep the browser product maintained while native work proceeds. Add iPhone parity in small tested groups, then expand mobile editing and agentic workflows. Android and desktop packaging remain later decisions. Do not delay iPhone indefinitely to add unrestricted duration, 4K, or advanced multi-track editing to the browser.

## Historical verification

On the Windows development PC, Chrome and Edge each cancelled an active render and exported twice in the same tab. FFprobe verified H.264/AAC, 360×640, 30 FPS, and 90 video frames. Downloads took about 1.5–1.7 seconds and the sampled JavaScript heap peaked at 18.8 MiB. That measurement excludes native codec and GPU memory. Both browsers exported with external requests blocked and without a render-worker request. Remotion attempted usage telemetry, which the verification blocked. Review license eligibility and production usage costs before rollout. [Remotion licensing](https://www.remotion.dev/docs/licensing)

Frame comparisons showed the same source trim, fade, overlay, and English and Arabic captions at sampled frames. The initial 3 dB mono mix difference was corrected. The final comparison matched mixed-direction wrapping when both references used the same Chrome version.

The final acceptance batch verified existing and new projects through the production website in Chrome and Edge with the server renderer stopped. The approved live provider journey produced a 720×1280 H.264/AAC MP4. Each browser completed 20 maximum-profile 60-second exports on the Windows 11 development PC. See [task.md](../task.md) for the exact workload, measurements, and evidence paths.
