# Motion graphics completion report

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
