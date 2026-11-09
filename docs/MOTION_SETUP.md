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
