# Motion graphics completion report

## 15 November 2026 evaluation checkpoint

The original benchmark below remains the record of the recovered abstract reel. The new [held-out protocol](./MOTION_HELD_OUT_EVALUATION.json) fixes the references, briefs, copy, landmarks, budgets and visual acceptance thresholds before running the normal Create workflow. No finished scene document was imported.

| Browser check | Result |
| --- | --- |
| Windows Chrome motion workflow | Passed at 720p/30 and 1080p/30 with H.264/AAC, immutable revision exports, cancellation, reload recovery and retry |
| Windows Edge motion workflow | Passed at 1080p/60 with the same export and recovery checks |
| Existing footage workflow | Chrome and Edge passed creation, review, caption changes, editing and local export at desktop and compact widths |
| Specialist-authored module | Chrome compiled the scene through the product tools after a diagnostic and source patch. The edited color survived reopen and matched decoded MP4 pixels |
| Bounded 3D | Chrome with software WebGL2 passed primitive and mesh rendering, owned texture validation, 2D preview fallback and decoded MP4 checks |

Browser tests used mocked model responses for the technical workflows. Each export completed with zero requests to a server render endpoint. Other device and browser profiles remain unqualified for this checkpoint.

### Frozen live baseline

The baseline ran from `bbbad79` with the standard 160,000-token allowance. Each attempt started from a new project, the frozen brief and one reference clip. The model router could retry providers within the attempt. No user-assisted refinement ran.

| Case | Attempt | Time | Provider attempts | Accounted tokens | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| Data chart | 1 | 287.7 s | 11 | 140,115 | Budget exhausted before assembly |
| Data chart | 2 | 312.3 s | 11 | 144,575 | Budget exhausted before assembly |
| Organic orbit | 1 | 269.5 s | 11 | 148,861 | Budget exhausted before assembly |
| Organic orbit | 2 | 286.4 s | 11 | 142,859 | Budget exhausted before assembly |

The ledger blocks the next request when its reservation would exceed the cap, so the accounted totals can stop below 160,000. Zero first drafts reached assembly, and there were no exports or human visual scores for this baseline. A later change makes scene authoring use marked, editable approximations when the model cannot finish and planning has succeeded. Another change reduces large graph prompt schemas. Those changes passed the relevant browser fixtures and are outside the frozen baseline measurement. The production budget and visual acceptance gates remain open. Human comparison also needs outputs from the requested frontier agents on the same briefs and references.

### Supplemental bounded 3D case

At `0c989ff`, two new projects used the separately frozen rotating cube reference. Both assembled an editable approximation and exported 150 H.264 frames after a manual approval to export. The approved title remained editable. Both generated scenes omitted the rotating cube and used a generic 2D layout. Automated visual review was unavailable, and the 3D design gate failed. No human scores were assigned. The later recovery-layout fix removes unrelated interface elements when a brief calls for other motion.

| Attempt | Time | Provider attempts | Rejected provider attempts | Accounted tokens |
| --- | ---: | ---: | ---: | ---: |
| 1 | 300.9 s | 14 | 9 | 150,004 |
| 2 | 339.5 s | 14 | 10 | 150,985 |

Local results and full-size landmark frames are in `../runtime/motion-verification/held-out-tFPW0H/`. The original four-attempt baseline is in `../runtime/motion-verification/held-out-6kodnS/`.

### Default-budget development trial

At `7d35972`, Chrome ran the frozen five-second product reference from the Create page with the 160,000-token default. One earlier execution stopped during reference analysis when its process ended. A fresh project assembled five editable approximation scenes in 296.9 seconds. After explicitly opening the saved draft, Chrome exported 150 silent H.264 frames and sent zero server render requests.

The run made 11 provider requests. Of the 158,000 accounted tokens, 28,209 came from usage reports on four calls and 129,791 were retained reservations for seven calls without usage. Four requests timed out and three scene-authoring responses failed JSON validation. A direct visual critic request was admitted and timed out. The ledger then had 2,000 tokens left for further work.

Inspection at 1.2, 2 and 3.25 seconds found the required copy split across successive title cards. The editable document contained all four strings. All three sampled outputs omitted the sliding bottle and the persistent composition, so the draft failed visual acceptance. This development result was excluded from the held-out pass rates. The export, paired frames and usage breakdown are in `../runtime/motion-verification/development-motion-9BCLBB/`.

## Original abstract reference benchmark

Verified on Windows on 9 November 2026 against the acceptance brief and quality rubric in this directory. The release checkpoint builds on `68aa79c` on `codex/browser-rendering`. The Git revision containing this report identifies the verified implementation.

## Live generation and review

The browser opened a fresh Motion graphics project from the normal Create page with the supplied 15-second reference, soundtrack, and a brief. Super VL observed the reference and produced the director, copy, design, scene, preview observation, review, and repair artifacts. Ultra completed the reference outline on the configured fallback route. The creative and review roles recorded thinking. The copywriter formatted approved text with thinking off. The browser traced the liquid shot into owned editable vectors and rendered the review sheets from the current timeline. The private run report records provider aliases, prompt versions, requested effort, observed thinking, timing, token use when available, and step failures.

The benchmark exhausted its automated repair budget. The app preserved the seven-scene draft and allowed it to be opened in the editor. The independent review corrected an extra tagline period and removed five entrance effects that created black dips. Those changes used the app's Review and Style pages. No scene was manually authored outside the app. The recovered benchmark used local test overrides of 30 minutes of active work and 260,000 accounted tokens to allow for accumulated debugging retries. The app defaults remain 20 minutes and 160,000 tokens. The configured hosted models were qualified for development on this account. Public-production hosting and usage eligibility remain separate.

Revision 8 passed the independent review of 24 landmarks, browser playback, and full decoding. Codex scored typography, composition, movement, and continuity 4/5 each, and brief adherence 5/5. All seven requested motion landmarks were visible. The warm palette and VidsAI wordmark were intentional. Grain, tunnel density, and liquid highlights differ from the original reference.

Two live focused chat drafts changed only the opening impact point and tunnel ring count. The verifier checked the exact document diff before approving each draft. One focused critic completed with notes and the other failed to return a valid judgment. Both edits were saved through the app's recovery approval. The manual timing change passed undo, redo, and reopen. Two independent five-second briefs produced an editable portrait title and a square radial grid. Both were inspected during actual playback. The portrait text fit on two lines.

## Browser export

The editor restored the reviewed tracks to revision 18 before exporting both files. Chrome produced 450 frames at 1280×720/30 and 900 frames at 1920×1080/60 with H.264 video and AAC audio. Both video tracks cover 15 seconds. The AAC container tail adds about 19 ms. No server render request occurred in either export. The test server served project assets and application routes, and the separate Remotion API service was unnecessary.

Seven scene samples per output matched their respective renderer previews. The maximum RGB mean absolute error was 2.93 at 720p and 1.99 at 1080p, below the limit of 8. The soundtrack waveform correlation was about 0.99995 for both outputs with no offset at 8 kHz measurement resolution. The independent scan found no black intervals in the corrected 720p export at the recorded detection threshold. The 1080p reel passed full decode and browser playback.

Chrome 157.0.8103.38 and Edge 157.0.4341.42 passed on this Windows laptop. The low-power verification used the laptop's Intel UHD adapter, including hidden-tab rendering. A separate lower-spec device was unavailable. The current browser profiles enforce duration, resolution, media, and scene budgets. The Windows checks used Node 24.22.1 and pinned FFmpeg 9.0.2 for development decoding. FFmpeg is outside the app export path.

## Final verification commands

```powershell
npm run motion:setup
npm run typecheck
npm run build
npm test
npm run motion:test -- --suite foundation
npm run motion:test -- --suite prompts
npm run motion:test -- --suite product
node --import tsx scripts/motion-verify-browser-tools.mjs "<reference MP4>"
node --import tsx scripts/motion-verify-product.mjs "<reference MP4>" "<soundtrack M4A>" --journey --export
node scripts/motion-verify-render.mjs --mixed "<reference MP4>"
node scripts/studio-ui-check.cjs
```

Clean setup used the checksum-verified local FFmpeg source. The build succeeded with dependency annotation and chunk size warnings. The server suite passed 29 tests. The final browser suites exercised authenticated creation, edit and revision safety, browser lease and restart recovery, duplicate and stale results, malformed provider output, budget and rate-limit behavior, cancellation, reload interruption, immutable export revisions, and retry. The footage workflow passed in Chrome and Edge at desktop and compact widths. The credential audit checked 27 configured values against 18 emitted JavaScript and CSS bundle files and found no matches.

## Private verification evidence

Paths are relative to the repository root. The supplied reference, soundtrack, credentials, generated videos, and test databases stay in the local runtime.

| Evidence | Local path |
| --- | --- |
| Live run and specialist handoffs | `../runtime/motion-verification/live-PW1Rzf/live-run.json` |
| Independent visual scores and in-app corrections | `../runtime/motion-verification/live-PW1Rzf/visual-quality.json` and `visual-review-edits.json` |
| Focused chat, timing history, and variations | `../runtime/motion-verification/live-PW1Rzf/live-revisions.json`, `live-variations.json`, and `variation-*-hold.png` |
| Final 720p and 1080p exports | `../runtime/motion-verification/live-PW1Rzf/live-revision-18-1280x720-30.mp4` and `live-revision-18-1920x1080-60.mp4` |
| Preview parity and soundtrack comparison | `../runtime/motion-verification/live-PW1Rzf/live-export-parity.json` |
| Corrected 720p and 1080p visual comparisons | `../runtime/motion-verification/compare-wpPRem/landmarks.json` and `../runtime/motion-verification/compare-RbCoYD/landmarks.json` |
| Final grouped checks | `../runtime/motion-verification/live-PW1Rzf/release-*` |
| Original footage workflow | `../runtime/studio-ui-Gx9mCA/report.json` |

## Repeat the workflow

Open Create, choose **Motion graphics video**, enter a brief, and choose **Match a reference** to attach a still image or a supported clip. State exact on-screen text, the desired pace, and any required cuts in the brief. The chat shows specialist progress and asks for browser work when the project tab needs to sample or render. Review the generated draft, open a saved draft if automated review stops, and use **Revise this scene** for a focused change. Use Review and Style to check wording and entrances, then open Editor and choose an available browser export profile.
