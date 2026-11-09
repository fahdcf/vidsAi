**Motion graphics implementation baseline**

Working revision `cbcf773` on `codex/browser-rendering`. The capture includes the existing unpublished workflow artwork and landing page edits. The exact Git status, revision, installed package inventory, build log and reference hashes are under `../runtime/motion-verification/baseline/`.

The Windows PATH resolved Node 20.19.6. The existing local configuration supplied Node 24.22.1 for the capture, matching the app's Node 24 requirement. npm 10.8.2, Remotion 4.0.541, Mediabunny 1.64.0 and Playwright 1.62.1 were present. The managed Control process was stopped at capture and the checked ports 8100, 3001 and 5288 had no listeners.

The isolated browser check built the current working tree, created a project with fixture narration, opened processing, confirmed seeded footage scenes, changed captions, checked music suggestions, exercised editor undo and redo, and downloaded an MP4 in Chrome and Edge. The check recorded zero server render requests. It used fixture data and mocked music, with the background provider worker stopped. Browser screenshots, both MP4s and the check report are in `../runtime/studio-ui-ZAqbvE/`. The private baseline log records the command results.

The reference is in `C:/Users/pp/Documents/ChatGPT/undertand motion videos`. The hashed manifest covers the report, renderer and configuration, tracing/export scripts, output storyboard and MP4, verification log, fonts, vector frames and soundtrack. The reference verification log reports H.264/AAC, 1920×1080, 60 FPS, 15 seconds and 900 decoded frames.

| Seconds | Scene family |
| --- | --- |
| 0–2 | Gravity, impact and rings |
| 2–4 | Kinetic typography |
| 4–6 | Morphing grid |
| 6–8 | Easing diagram |
| 8–10.35 | Polygon tunnel and particle sphere |
| 10.35–12.5 | Liquid shapes |
| 12.5–15 | Identity card |

Archivo Black and Space Mono include SIL Open Font License 1.1 notices in the handoff. The liquid paths were traced from reference frames and the soundtrack was extracted from the reference. Their redistribution rights were not established by the handoff. Keep those artifacts private and record provenance when using them for evaluation.

**Foundation checkpoint**

Groups A–C passed on Node 24.22.1. `npm run motion:doctor`, `npm run typecheck`, the production build, and `npm test` passed. The server suite passed 22 tests. The isolated footage regression passed on Chrome 157.0.8103.38 and Edge 157.0.4341.42. Its report and footage MP4s are in `../runtime/studio-ui-egoaE2/`, with logs under `../runtime/motion-verification/checkpoint-1/`.

`npm run motion:verify-render` produced a browser-encoded 640×360 H.264/AAC MP4 with 90 decoded frames. The pixel comparison against the Player measured mean absolute RGB error of 1.93. Random seeking reproduced the same preview frame, cancellation permitted a successful retry, and the verifier recorded zero server render requests. The MP4, decode log and JSON report are under `../runtime/motion-verification/render-GegYjK/`. The seven-scene fixture and reference timestamps pass the foundation suite. The long export is part of later acceptance.

Live model qualification is recorded separately in the setup document and the private qualification report. It used a synthetic prompt and image. A reference-driven product generation run remains part of the final acceptance group.
