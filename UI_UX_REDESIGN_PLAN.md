# VidsAI UI/UX redesign

Goal: restore the original guided review, visual subtitle selection and capable editing workspace, then improve their clarity and responsiveness using the current React/TypeScript app. Existing APIs, stored documents, provider routes and export behavior remain the foundation.

## Findings

The previous review grouped preview, narration, source trimming and replacement tools per scene. The old subtitle page offered visual preset cards, music/transition tabs and a live player. The editor had a visible assistant and separate scene, subtitle and audio timeline lanes. The replacement reduced these to uniform cards and long forms, reused the entire editor as the subtitle page, and placed important controls below the fold.

## Implementation order

1. [x] Foundation: charcoal/lime visual system inspired by the original studio; shared shell, meaningful page headers, workflow steps, consistent controls, focus/contrast and responsive layouts.
2. [x] Scene review: active-scene stage, thumbnail navigation, narration panel, source-window controls, replacement/regeneration tools, per-scene confirmation and a clear continue action. Keep unsaved scene drafts when switching scenes; restore a session draft after a refresh. Edits invalidate that scene's confirmation.
3. [x] Subtitle studio: separate page with real Remotion preview, seven visual presets, readable customization controls, transition cards, music search and caption text editing. Save choices through the shared document commands before continuing.
4. [x] Editor: preserve ordered autosave, revisions, agent approval and export; organize the workspace, add a useful multi-lane timeline with seeking/zoom/reordering and thumbnails, and present the assistant and export status clearly.
5. [x] Supporting flow: project search/status filters and richer cards, grouped creation form with format choices, useful processing progress and completed-video state.
6. [x] Validation: TypeScript/build/server checks; real browser checks of review, styling, editing, persistence, agent actions and MP4 download; keyboard/mobile/overflow checks and screenshots; inspect final layouts and fix issues before publishing.

## Design rules

One clear primary action per stage; visible context and status; large useful media previews; compact labeled tools; advanced settings tucked behind explicit controls; no fake usage/plan data or fabricated waveforms; no dependence on hover; touch targets and keyboard alternatives; reduced-motion support. Thumbnail/style previews are aids, while the main Remotion preview shows actual project output.

## Delivery

Work on the existing migration/full-typescript branches. Preserve the working Node runtime and original backup folders. Keep all credentials private. Rebuild the active app for local review, then push the verified redesign and check GitHub CI.

## Acceptance results

Implemented and reviewed on 2026-11-02. Seven control-server checks pass with imported and fresh data, including replacement-image regeneration and choosing a different Pexels result. Eleven shared editor/worker checks and both TypeScript projects pass. The production build passes.

The complete browser journey created project 18 from the test narration, recovered a review draft after refresh, confirmed and replaced scenes, selected styles/transitions/music, edited through the timeline and assistant, and downloaded a 4,793,637-byte MP4 with no page errors. Desktop (1440px), phone (390px) and tablet (768px) layouts were checked; 18 screenshots were captured and inspected locally. Final targeted checks covered second/frame precision, saving styling, mobile preview navigation and the message identifying an older export after new edits.

During verification, a stock clip hit Remotion's frame-cache error under desktop memory pressure. The renderer now has an explicit bounded 128 MB default cache (configurable as RENDER_VIDEO_CACHE_MB), and the same footage then exported successfully. The app presents a short recovery message if decoding fails. The existing document/render contract is preserved.

Evidence: verification/ui-browser.json and verification/ui-targeted.json. Screenshots remain in the local runtime/ui-verification directory. All provider credentials and test-account passwords remain outside Git.
