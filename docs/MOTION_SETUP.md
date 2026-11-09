**Motion graphics development setup on Windows**

Install Node 24 or later with npm and install desktop Chrome and Edge. Open a new terminal and check that `node --version` resolves the supported installation. Run the following from a fresh VidsAI checkout.

```powershell
npm run motion:setup
```

Setup installs the dependencies in `package-lock.json` and runs the doctor. On an existing checkout, use `npm run motion:doctor` to check the environment directly. The doctor opens headless browsers on a local diagnostic endpoint, measures text on Canvas, uses the app's H.264/AAC encoder and decoder probe, and writes and reads a temporary file in browser storage. It also opens a test SQLite database in memory.

On Windows x64, setup installs the pinned development FFmpeg binary in `../runtime/motion-tools/ffmpeg/`. The version and SHA-256 hashes are in `motion-toolchain.json`. For an offline installation, set `MOTION_FFMPEG_SOURCE` to a local copy of that exact executable and run `npm run motion:tools`. The installer verifies the checksum before use. The application uses browser APIs for reference inspection and export.

The doctor checks the port in `NODE_APP_ORIGIN` (default 8100). A healthy VidsAI listener is reported separately from a conflicting listener. Adjust the local origin or resolve a port conflict before startup.

The clean setup passed with Node 24.22.1, Chrome 157.0.8103.38 and Edge 157.0.4341.42. The local checks also exercised the Node 20 guard and a port occupied by an unrelated HTTP server. The setup log is in `../runtime/motion-verification/setup.log`.

The reference frame sampler decoded four frames from the supplied 1080p/60 reel in Chrome at the requested timestamps. The development verifier independently decoded all 900 frames and the audio. See `../runtime/motion-verification/reference-sampling.log` and `reference-decode.log` in that same directory. The hosted archive timed out on this machine, so the verified local-binary path was used for installation.

`npm run motion:check-models` lists configured routes without making network requests. `npm run motion:check-models -- --live` runs the bounded development qualification and saves a redacted report under `../runtime/motion-verification/model-qualification.json`. The first run qualified Super VL for thinking-enabled structured planning and the synthetic image test, Ultra for planning fallback, and Super VL stream cancellation. Nano Omni returned invalid final output in the image probe. The test establishes these specific capabilities with synthetic input.

**Orchestration checkpoint**

```powershell
npm run motion:test -- --suite foundation
npm run motion:test -- --suite prompts
npm run typecheck
npm run build
npm test
node --import tsx scripts/motion-verify-browser-tools.mjs "<path to the 15-second H.264 reference MP4>"
```

The browser harness uses the configured model inventory and qualification report to test routing. It intercepts hosted model calls with mock outputs. Chrome sampled the supplied reference, rendered preview contact sheets in the browser, and completed the specialist graph with malformed-output fallback and targeted repair. It also checked ownership, duplicate and stale results, lease recovery after closing a tab, restart recovery, cancellation, feedback, and draft retention. The server suite passed 25 tests. Targeted checks also covered unsupported provider capabilities, HTTP rate limits, distinct first-token and request deadlines, persisted account/provider budgets, and reasoning tags split across streamed chunks.

The harness saves isolated SQLite and media evidence under `../runtime/motion-verification/browser-tools-*`. This checkpoint exercises the workflow internals with mock models. The live reference-driven product run is a separate acceptance step.

**Product checkpoint**

```powershell
npm run typecheck
npm run build
npm run motion:test -- --suite product
npm test
node --import tsx scripts/motion-verify-product.mjs "<reference MP4>" "<soundtrack M4A>" --journey --export
node scripts/motion-verify-render.mjs --mixed "<reference MP4>"
node scripts/studio-ui-check.cjs
```

The authenticated product journey passed through Create, chat, Review, Style, Editor, reopen, and browser export. Mock specialists generated and repaired a seven-scene plan from real browser reference samples and rendered preview sheets. The resulting MP4 decoded at 1280×720 with H.264 video, AAC audio, and 450 frames. Reload recovery, cancellation, retry, and a concurrent edit during export passed. Private evidence is in `../runtime/motion-verification/product-jtxKQe/`, including the MP4, decode log, and desktop and compact screenshots.

The mixed-media fixture checked motion, footage, captions, a logo overlay, audio fades, and impact cue alignment. The legacy footage fixture passed in Chrome and Edge at desktop and compact widths, including browser export. The full server suite passed 27 tests.
