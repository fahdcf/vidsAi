# Browser export baseline

The local evidence is in `../runtime/browser-migration-baseline` relative to the repository root. It contains both repositories' starting commits, working tree status, tracked patches, and fingerprints of untracked files. It also contains the earlier real-browser screenshots of Create, Review, Style, and Editor at desktop, 768px, and 390px widths, plus the resizable editor screenshot. The screenshots are reused from the pre-migration UI run. Private test data and media remain in the runtime directory.

The existing UI run exercised registration and sign-in, project browsing, narration and stock generation with simulated providers, scene review and replacement upload, captions and transitions, music, timeline reorder, undo/redo, assistant Apply, and an authorized server-rendered MP4 download. It recorded 13 passing checks and no page errors. Live provider coverage is separate. The browser prototype report covers Chrome and Edge rendering, cancellation, and repeated download of the synthetic three-second fixture.

| Existing path | Current dependency | Migration task |
| --- | --- | --- |
| Editor Export | `Editor.tsx` uses the shared API helper to submit `POST /projects/:id/export`. The app deduplicates by request ID, stores a revision snapshot in `video_exports`, and enqueues a render. | C1 and D1 |
| Snapshot and media | `server/document.ts` checks project ownership and signs private asset and voiceover URLs for the worker. Project state already supplies URLs for editor preview. | B4 and C1 |
| Progress and cancel | The editor polls `GET /projects/:id/exports/:export` and sends DELETE to cancel. The job runner polls worker `/status/:id` and forwards cancellation by export request ID to `/render-requests/:key`. The worker also exposes cancellation by worker ID. | B6, C2, C3, D1 |
| Failure and retry | `Workflow.tsx` calls `POST /projects/:id/retry`. The app distinguishes generation retry from export retry and reuses the failed export's revision with fresh media signatures. | C2 and C3 |
| Completed exports | The editor and Final page receive the latest export. The app checks ownership before serving `/projects/:id/exports/:export/download` from the worker artifact route. Retain an artifact-serving path for historical downloads when the render process stops. | C2, C3, D1 |
| Queue recovery | App startup runs the durable job loop in `server/jobs.ts`. Its lease recovery can resume polling or dispatch. The render worker recovers persisted jobs and limits active renders. | B6 and D1 |
| Composition and encoding | Worker `POST /render` leads to the Remotion bundle, Chromium frame rendering, and H.264 encoding. The active TypeScript path does not call a separate mandatory server proxy/thumbnail transcode before invoking Remotion. Legacy conversion tooling and provider media processing are separate paths to check during cutover. | A3–A5 and D2 |
| Shared worker routes | The same worker serves editing commands, validation, conversion, and agent planning. Stopping render execution must preserve routes the app still needs. | D2 and D3 |
