# Studio visual refresh

Inspired by the hierarchy and spacing at https://www.opus.pro/fr-fr and the supplied editor references, without copying their layouts or branding. Warm orange actions, charcoal surfaces, subtle glass navigation, and neutral preview canvases. Application styling must never recolor rendered media or caption presets.

The existing workflow thumbnails and homepage edits are retained. The dashboard, creation form, processing, scene review, subtitle studio, and editor share `studio-theme.css`. No API, export, project document, or provider behavior is changed.

## Verification

Run `node scripts/studio-ui-check.cjs <built-ui-directory>` after building. The check starts a temporary database and app on port 5288, without a worker or external provider calls. It checks Chrome and Edge at 1440, 1024, 768, 390, and 320 pixels across the seven workflow screens. It exercises creation with a short WAV, scene confirmation, caption persistence, transitions, editor tabs, undo/redo, timeline zoom, and MP4 export/download. It asserts that no server rendering request occurs. Reports, screenshots, and test exports are retained outside the repository under `../runtime/studio-ui-*`.

The November 8 refresh passed TypeScript, the production build, and both browser checks. Existing provider integrations were not called as part of this visual refresh.

## Original illustrations

Generated with the built-in image_gen tool, then encoded as WebP for the app.

- `public/studio/story-glass.webp`: dashboard hero, 1440 px wide.
- `public/studio/story-sculpture.webp`: creation sidebar and processing illustration, 640 px wide.

### Hero prompt

Use case: stylized-concept. Asset type: wide editorial hero illustration for VidsAI video creation workspace. Create a refined cinematic still life of three floating translucent smoked glass film frames and a ribbon of translucent burnt-orange film, arranged ONLY on the right half, dramatically lit by warm amber side light. Inside one frame a tiny cinematic desert dune photograph, another an abstract audio waveform etched in glass. Charcoal grey almost black backdrop, left half quiet dark negative space for real HTML heading. Premium tactile frosted glass and brushed metal, subtle grain, beautifully restrained, sophisticated art direction, warm orange #ff824f and muted copper, no neon green, no purple, no text, no letters, no logos, no UI screenshot, no watermark. Wide landscape 3:2 image, strong composition, not a busy collage.

### Sculpture prompt

Use case: stylized-concept. Asset type: original editorial illustration for a premium video app, shown small above a project processing checklist and beside a narration upload form. A delicate warm orange translucent glass ribbon spirals around a single smoked glass play-button sculpture, on a matte charcoal pedestal. Subtle circular etched audio-wave grooves in pedestal. Warm copper reflections, restrained cinematic lighting, dark grey #19191c backdrop. Clean elegant industrial design, tangible materials, sophisticated soft shadows, beautiful editorial 3D rendering. Square composition with central isolated subject filling middle 65 percent. No writing, no UI, no people, no logos, no gradients in neon colors, no green, no purple. Orange #ff824f and charcoal only with warm white specular highlights.
