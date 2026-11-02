# Full TypeScript replacement: complete local cutover

The `migration/full-typescript` branches replace the PHP control server and all Blade/Inertia pages with React 19, Vite, TypeScript/Express, SQLite and durable Node jobs. The typed editing core, agent worker and Remotion renderer remain shared. PHP, Laravel, Blade, Composer, framework routes and obsolete build/test tooling have been removed from this branch. This is the full replacement; `migration/react-typescript` remains the earlier hybrid checkpoint.

## Active local folders

- `D:/VidsAI-migration/full-typescript/vidsAi`
- `D:/VidsAI-migration/full-typescript/remotion-api`

The familiar `C:/Users/pp/Documents/ChatGPT/vid ai/vidsAi` and `remotion-api` folders are junctions to those repositories. Editing either location edits the same active code. The root `start.cjs` launches the new Node services. Original repositories were retained beside the junctions as `vidsAi.previous-backup-20261102` and `remotion-api.previous-backup-20261102`.

C: had exhausted its free space, so code/dependencies/runtime files are held on D:. Do not remove the D: targets while the C: junctions are in use.

## Runtime and data

The application runs at `http://127.0.0.1:8100`; the private render and agent workers run at 5211 and 5212. All three are Node processes. The old project PHP server, PHP queue and worker processes were stopped during cutover.

The private `runtime/node-local-config.json` selects `runtime/production-node.sqlite`. It was created with SQLite's backup API after stopping the old runtime. Counts and integrity were checked before opening the new app: 6 users, 14 projects, 34 scenes, 36 edit revisions, 2 private assets and 9 export records. The original `runtime/database.sqlite` is unchanged. Real browser verification then added a separate test account and project 15 to the new database. Existing media and render outputs were copied; originals were preserved. Four historical exports downloaded successfully through the new authenticated endpoint.

Private `.env` and the complete `nvidia/private/PROVIDER_CREDENTIALS.md` were carried to the active repository and remain ignored. All 21 NVIDIA model records remain in the catalogue; validated writing and editing routes retain their configured fallback chains. Deepgram, Pexels and FreeSound continue to serve the existing workflow.

## Verified behavior

- [x] Existing bcrypt accounts, registration/logout, profile/password change, deletion, recovery tokens and session invalidation.
- [x] Database row counts, foreign-key relationships, existing projects, voiceover files, assets, revisions and old downloads.
- [x] Uploaded narration through Deepgram, validated NVIDIA scene plans and Pexels search, with checkpoints and retry.
- [x] Scene review, source trimming, private replacement images and stock regeneration.
- [x] Caption styles/text, transitions and the reused preview/editing operations; music categories/search/preview URLs/selection.
- [x] Ordered saves, idempotent commands, revision conflicts, undo/redo and rejection of invalid edits.
- [x] Agent planning, explicit approval/application, idempotency, cancellation and project ownership.
- [x] Persistent immutable export snapshots, status, cancellation, expiring signed media and authenticated MP4 downloads.
- [x] Worker connection failure and expired-lease recovery without duplicate render submission.
- [x] Fresh-database startup/tests without the original application or a PHP executable.
- [x] Optional WAN settings and missing-key state; all seven retained payload contracts checked without live requests.
- [x] Full browser path on the final Node address after removing PHP/Blade source.

Server checks: 7 passed against an imported database and 7 passed against a fresh schema. Shared worker/editing checks: 11 passed. Frontend and server TypeScript checks and production build passed. npm audit reported zero vulnerabilities in the app's installed dependency set. The final live browser run exported/downloaded a 2,076,628-byte MP4 with zero page errors. Public evidence is in `verification/node-browser.json` and `verification/data-import.json`; no secrets are included. A final browser restart check also preserved revision 9, the selected music and the same downloadable MP4; `verification/restart.json` records that result.

The browser run used an existing local test recording and this script: "Discover our reusable bottle. Take it on adventures. Keep your water cold all day." It checked account compatibility, new registration, project creation, processing, regeneration, replacement upload, trim/confirmation, captions, undo/redo, two approved agent edits, FreeSound selection and export/download.

## Practical limits and future work

The live test used English. Arabic/Darija support and the optional Python alignment helper were retained; fallback timing is explicitly marked estimated, and perceptual accuracy still needs a real recording review. Other language quality is not claimed from the English test. Existing pure editing operations are covered by shared core tests; every visual style was not manually compared frame by frame.

WAN is intentionally unconfigured and has not been called live. Optional image hosting and unused NVIDIA voice, retrieval, translation and visual-understanding capabilities remain future integrations. Uploaded voiceover is currently required; the first selected canvas is exported, as in the previous working version. SMTP delivery requires SMTP configuration; local recovery uses a private outbox. Production hosting/deployment is separate from this verified local replacement.

For rollback, stop Node services, retain the new database, restore the original folder names from the preserved backup directories and use the original runtime/database and hybrid branch. Do not overwrite either database with the other after new user work has begun; reconcile new data first.

## GitHub checks and default branch

On 2026-11-02 the first GitHub run failed because the application workflow could not read the private worker repository. A dedicated read-only deploy key and encrypted `REMOTION_CI_SSH_KEY` Actions secret now provide that checkout. The first clean install also exposed an undeclared direct esbuild dependency and current npm's native install-script policy. The worker now declares esbuild directly, and both manifests explicitly approve the required installer versions.

The corrected [application check](https://github.com/fahdcf/vidsAi/actions/runs/41465228216) and [worker check](https://github.com/fahdcf/remotion-api/actions/runs/41465202008) both passed on clean Ubuntu runners, including shared builds, TypeScript checks, automated tests, a fresh app database and the production frontend build. These runs require no live provider credentials. `verification/github-ci.json` records the validated commits.

Both repositories now use `migration/full-typescript` as their default branch. GitHub's API tree check confirmed zero PHP/Blade files, Composer files or artisan in those branches. The language panel previously described the old default `main`, even when viewing another branch. Historical source remains on the old branches for rollback; no Linguist overrides were used to hide it. GitHub recomputes the panel after default-branch pushes.

The application was subsequently promoted to `main` at the user's request, preserving the original `main` security cleanup in the merge. `main` now contains the full TypeScript application and the editor/chat improvements. The worker remains on `migration/full-typescript`, which the application workflow checks explicitly.
