# Motion graphics quality improvement plan

Prepared 10 November 2026 from the two supplied videos, project 22's saved run, the current implementation at `229c1f7`, and the original reconstruction report. Implementation tasks below are planned. This document extends the existing motion checklist with a broader visual acceptance requirement.

## Findings from the failed example

The reference is `C:/Users/pp/Downloads/3df443f430fd3d79.mp4`. The result is `C:/Users/pp/Downloads/video (2).mp4`. Both are 1280 × 720 at 30 FPS and approximately 15 seconds. The result has no audio track, matching the user's choice to omit a soundtrack. Its composition problems are visible without audio.

The saved run is `18779064-16ee-430d-a941-f03312622d5e`, project 22. Comparison sheets are saved outside Git in `../runtime/motion-verification/reference-test-3df443/comparison-reference.jpg` and `comparison-export.jpg`.

| Reference behavior | Export behavior | Verified cause |
| --- | --- | --- |
| Small play icon, white headline, dark canvas and red glow | Expanding rings followed by a solid red canvas and black type | Director chose `impact`. That renderer explicitly expands the primary color across the canvas and draws its headline with the background color. |
| Detailed transcript interface | Tiny centered text and rudimentary controls | The engineer gets a short scene purpose and palette, with no reference images or measured layout. |
| Three dark cards with icons and readable labels | Three red pills with obscured labels | The saved graph paints each label before its opaque rectangle. There is no rendered occlusion check. |
| Framed waveform and deliberately styled text | Flat ellipse, a few revealed bars and plain text | The new graph proposal only offers text, rectangles, ellipses and one reveal effect. |
| Left-aligned type beside a detailed panel and green status | Clipped text, grey block and red dot | Bounds are unchecked. Five fixed palette roles cannot express the requested green without repurposing an existing role. |
| Branded closing card, supporting line and visible button | Oversized domain, tiny secondary copy and tagline | A fixed identity layout provides insufficient control over the reference hierarchy and CTA. |

The reference capture supplied 24 samples. The scene-outline request failed and its recovery used zero detected cuts to form a single 15-second segment. Observations described different sections, but this information never became a precise reference timeline. The director then assigned six scene intervals that diverged from the reference.

All four custom graph scenes in this run came from models. None used `graph_fallback`. The limited graph proposal affects successful model output as well as recovery output.

The first critic identified problems. Repairs were required to preserve scene type, so the hook stayed an `impact` scene. The second critique was unavailable and the user opened the saved draft through manual review. That path establishes draft availability, while visual quality remains unverified.

The original successful reel was built by writing custom Canvas animation code, inspecting full-size frames, tracing liquid geometry, and iterating on renders. The app's seven specialized scene families closely mirror that reel. Its existing general graph renderer supports some additional paths, groups and keyframes, but the current engineer cannot request most of them. The original app acceptance also included manual polish and two simpler variations. Broader reference performance is still unproven.

## Target architecture

Use the existing React, TypeScript, Node, Canvas, Remotion composition and browser export stack. Extend the versioned editable scene graph into the main authoring format for reference-based work. Specialized scenes remain useful when their actual behavior fits the evidence.

The workflow becomes reference inspection → scene specification → visual layout → browser still render → layout repair → motion authoring → browser sequence render → paired visual review → targeted repair → editable export.

Configured models perform interpretation, planning and authoring through the server. Browser tools decode references, measure fonts, render frames, evaluate animation and encode the final video. The product needs stronger representations, tool access and feedback. Model availability or a valid JSON response alone cannot establish design quality.

Broad support initially means typography, UI/product promos, diagrams, charts, vector illustrations and abstract 2D animation within measured browser limits. Reference inspection must identify effects requiring additional assets or capabilities, including complex 3D, footage and character performance. It must describe any proposed approximation before generation.

## A. Establish the benchmark and quality state

- [x] A1. Inspect both provided videos, compare contact sheets, and read the actual model artifacts and review history. Record the failures above.
- [ ] A2. Create a versioned acceptance manifest for the original reel and this product promo. Record reference intervals, mandatory text, visual objects, intended hierarchy, motion landmarks, palette roles, output dimensions and soundtrack choice. Store hashes and timestamps alongside private media locations.
- [ ] A3. Persist separate generation and review outcomes. Distinguish a draft that rendered, an approximated draft, a draft awaiting review and a draft that passed review. Keep prior unresolved issues when a later critic is unavailable. Manual approval must preserve that review history.
- [ ] A4. Add regression fixtures for text hidden behind cards, clipped long text, omitted CTA, incorrect scene family, and reference analysis recovering with no pixel cuts. Keep current user projects as historical evidence and use separate verification projects.

## B. Build a reference specification that reaches every agent

- [ ] B1. Retain the initial sparse pass, then request bounded scene-level samples around visual changes and motion landmarks. Combine content/layout changes with pixel differences. Zero hard cuts must trigger semantic inspection instead of an automatic single-scene interpretation.
- [ ] B2. Use existing crop and higher-resolution sampling support to inspect typography, controls, icons and fine details. Contact sheets currently shrink each image to 224 × 126 pixels. Deliver selected individual frames and crops to the qualified vision stage, with source timestamps and crop bounds.
- [ ] B3. Define `ReferenceSceneSpec` with source interval, required content, object identities, bounding boxes, alignment, layer order, color roles, text styles, entrance/hold/exit events, persistent elements, transition behavior, confidence and evidence IDs. Identify uncertain properties explicitly. Observations about motion need multiple frames.
- [ ] B4. Map each output scene to reference evidence and output timing. Reference matching should inherit evidenced structure and pacing, adjusted for the user's brief and duration. Style-inspired work can diverge intentionally. Represent this intent explicitly in the plan.
- [ ] B5. Send the relevant specification and images to the visual designer and vision-capable engineer routes. Text-only routes receive the full structured specification. Give agents a bounded mechanism to request another crop or sample when a required detail is unresolved.
- [ ] B6. Stop forcing hook and closing sections into `impact` and `identity`. Require a component compatibility check against the requested objects and behavior. Escalate incompatible sections to general composition authoring.

**Checkpoint 1, after A–B**

Run focused schema and recovery tests, then inspect the real reference analysis on both supplied reference families. The product promo must retain its six meaningful sections and visible UI objects with source evidence. Where timing is uncertain, inspect additional samples before accepting a boundary. Confirm that a reference lacking hard cuts can still produce multiple semantic sections. Commit and push after the grouped checks pass.

## C. Expand the editable composition language

- [ ] C1. Introduce a versioned authoring schema with consistent design-space coordinates, explicit parent/group relationships, clipping and layer order. Compile flat node records and parent IDs into the existing bounded graph. Document units and transform origins, validate cycles and unique IDs, and preserve older saved graphs through version-aware loading.
- [ ] C2. Add per-element paint and typography. Support bounded solid colors, gradients, strokes, shadows/glows, font family/weight/style, line height, text alignment, explicit text boxes and styled spans. Bundle the necessary licensed fonts and await loading. Include semantic status colors independently of brand colors.
- [ ] C3. Expose paths, groups and masks already supported by the renderer, then add owned image/SVG assets and reusable primitives for buttons, cards, icons, text rows and waveform elements. Sanitize imported vectors and preserve asset provenance. Reusable objects must compose into layouts chosen from the reference.
- [ ] C4. Add explicit property tracks and animation intervals for transforms, opacity, reveal masks, path drawing, text reveal and bounded shape deformation. Support easing, controlled spring motion, stagger, overlap, entrance, hold and exit. Parameterized waveforms and deterministic procedural motion must work without an audio track.
- [ ] C5. Represent continuous elements and movement across cuts through shared groups or transition relationships. Charge overlapping scenes, effects and assets to the browser budget. Keep frame evaluation deterministic at arbitrary timestamps and after seeking.
- [ ] C6. Expose the expanded graph in the editor through layer selection, reorder, text styling, position/size, color and timing controls. Route all changes through the existing revision/undo system. Preserve immutable export snapshots and existing project behavior.

## D. Make the browser an active layout and validation tool

- [ ] D1. Implement shared layout measurement using the same fonts and drawing rules as export. Return actual text bounds, wrapping, element extents and font sizes. Check the complete animated span where feasible, plus boundary and extremum samples for procedural effects.
- [ ] D2. Add diagnostics for off-canvas content, clipping, unintended opaque occlusion, unreadable contrast, missing required text and missing assets. Account for intentional masks and entrance/exit effects to avoid false failures.
- [ ] D3. Render a representative static layout per scene before animation authoring. Compare the hierarchy, spacing, colors, detail and content to its reference frame. Feed concrete bounding-box and visual evidence back to the designer for repair.
- [ ] D4. Replace blanket slide/fade compilation with authored motion tracks. Validate readable holds, intentional transitions and required motion landmarks using short rendered sequences and event samples.
- [ ] D5. Integrate the new primitives into cost estimation, asset limits, decoding cleanup, export cancellation and browser profiles. Count path segments, painted pixels, effect surfaces and overlapping work. Determine expanded limits through profiling before enabling them.

**Checkpoint 2, after C–D**

Run typecheck, build and focused renderer/editor tests. Render diagnostic scenes exercising mixed type styles, a status color outside the brand palette, path masks, nested groups, a moving waveform, aligned UI rows and a real CTA. Use the regression fixtures to demonstrate caught occlusion and clipping. Check preview/export parity, seeking, reopening and undo. Profile 720p/30 first, then the existing higher profiles on qualified hardware. Commit and push after this group passes.

## E. Give agents a real design and repair loop

- [ ] E1. Split each scene's work into layout proposal, browser layout check, motion proposal and browser motion check. Persist validated artifacts so retries reuse completed work. Give each specialist the source evidence and previous diagnostics relevant to its task.
- [ ] E2. Enable bounded tool requests for sampling, measuring, rendering and patching. Current prompt tool lists alone do not provide an interactive model-tool loop. Validate requests, execute with the appropriate role, return results and apply per-run call/token/time budgets.
- [ ] E3. Review paired reference and generated frames directly with a qualified vision route, supplemented by short temporal sequences and scene metadata. Include graph text and object identities in review inputs. Frame labels must be unambiguous, and issues must cite actual evidence.
- [ ] E4. Allow a repair to replace an unsuitable scene representation while preserving required content and the declared timing contract. Permit deliberate timing repairs through validated timeline operations. Include graph text, secondary copy and CTA in protected content checks.
- [ ] E5. Track whether each requested repair actually changed the targeted visible property. Re-render and compare against the prior candidate. Retain the better candidate when a repair regresses another required feature. Stop repeated ineffective repairs with actionable findings.
- [ ] E6. Keep simplified recovery layouts marked as approximations. Preserve the best editable draft and its pending review issues if providers or budgets are exhausted. Provide specific per-scene recovery actions in chat.

## F. Qualify models for this work and control cost

- [ ] F1. Evaluate currently configured routes separately for reference layout reading, scene design, structured authoring and visual criticism. Use fixed tasks from several visual families and score correctness, visual quality, latency, retry rate and accounted tokens.
- [ ] F2. Prefer a qualified vision model for visual design and comparison. Use configured text/code-capable models for construction from a complete specification when they perform better. Keep model IDs, credentials and provider routing server-side.
- [ ] F3. Size requests by stage and scene complexity. Reserve budget for visual verification and repair. Cache evidence, schemas and approved artifacts by their hashes. Retry failed scene work without regenerating the entire project.
- [ ] F4. Record actual development provider usage and failed attempts. Evaluate quality under the normal product budget. Keep a larger experimental budget labeled separately so a manually rescued result cannot stand in for routine performance.

**Checkpoint 3, after E–F**

Exercise the complete Create → Motion graphics → reference/prompt → chat → preview → repair → editor → export flow with real configured models. Use fresh projects for both existing reference families. Review actual motion playback and paired frames. Verify replacement of the inappropriate impact hook, visibility of all three card labels, a readable transcript panel, a moving waveform, the green indicator and closing CTA. Confirm soundtrack-free operation. Test a critic failure and repeated ineffective repair without losing earlier review findings. Mocked provider tests establish failure handling separately from live visual acceptance. Commit and push only after the relevant checks pass.

## G. Prove performance on unfamiliar references

- [ ] G1. Assemble at least six distinct reference families from permitted media. Include the original abstract reel, this dark UI promo, a light minimalist product promo, kinetic typography with mixed styles, a data/chart explainer, and an illustration or organic-motion sequence. Add a portrait composition and long/Arabic text cases. Reserve at least two references entirely outside prompt examples and tuning.
- [ ] G2. Freeze the brief, rubric, input media hashes and quality thresholds before each evaluation. Run the normal workflow without importing a finished scene document or hand-authoring scene parameters. Record automatic first-draft quality separately from user-assisted refinement.
- [ ] G3. Generate at least two independent fresh runs per held-out reference. Use three on a borderline case. Report the number attempted, failures, approximations, retries, generation time and model usage alongside visual scores. A successful selected run must not hide a failed one.
- [ ] G4. Review source and output playback, scene landmarks and full-size frames. Use a human reviewer for final design acceptance. Model scores and image similarity are supporting evidence. Correct rendering and faithful composition are separate checks.
- [ ] G5. Run grouped release verification covering browser-only export, resume/retry/cancel, revision safety, old projects and the existing footage workflow. Exercise the supported browser/device profiles and leave untested profiles explicitly unqualified.
- [ ] G6. Publish the results and outstanding limitations. Update the motion completion report to distinguish the original benchmark from demonstrated support across references. Commit and push the verified release.

## Acceptance rules

These are proposed release gates to fix before live evaluation, with any later adjustment recorded and justified.

- Every required heading, label, status indicator and CTA is present, readable and editable. Zero unintended off-canvas text or opaque occlusion at the required readable holds.
- Reference-matching tests retain the required objects, composition hierarchy and style. For unchanged aspect ratios, key element centers and dimensions should stay within 5% of the canvas dimensions of the annotated layout unless the brief asks for adaptation.
- Clearly evidenced scene and motion landmarks should be within 0.2 seconds of the annotated target for same-duration matching. Uncertain or intentionally retimed events have a declared output target before evaluation.
- Typography, composition, motion, continuity and brief fidelity each score at least 4/5 in the final human review. Every held-out run counted as passing must meet each dimension. Record first-attempt and repaired pass rates separately.
- All blocking visual findings are resolved before marking a draft as passed. A manual export remains possible with an explicit approximation or review-pending status.
- Preview and MP4 agree at chosen frames and temporal landmarks. The complete file decodes, matches the requested duration and includes audio only when selected.
- Editing and export complete within measured device limits. Repeated export/cancel/retry does not leave stuck decoders, orphaned tasks or accumulating media buffers. Compare memory and responsiveness against the baseline on the same hardware.

## First implementation batch

Start with A2–A4 and B1–B6. This establishes reliable reference understanding, preserves quality findings, and prevents the wrong scene family from being treated as an acceptable design. The broader renderer, layout checks and visual repair loop follow before claiming improved general reference quality.

This plan does not establish universal reconstruction of arbitrary video effects. Its release evidence must show repeatable visual quality across the declared reference families and identify capability gaps before generation.
