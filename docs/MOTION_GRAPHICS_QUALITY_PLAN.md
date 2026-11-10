# Motion graphics quality improvement plan

Revision 2, 10 November 2026. Based on the two supplied videos, project 22's saved run, implementation at `229c1f7`, the original reconstruction report, and the user's request for automatic reference audio and coding-agent-level results using configured or free API models. Implementation tasks below are planned. This revision replaces the earlier graph-only authoring strategy with an agent coding workspace, an isolated scene runtime, and a shared editable composition format.

The requested quality target is comparable to strong Claude Code Opus 5.5 or GPT Astra 6 extra-high motion-design results. This is an acceptance ambition to evaluate with actual outputs. Equivalence across arbitrary references has not been established. Increasing agent count or reasoning effort alone cannot establish it.

## Findings from the failed example

The reference is `C:/Users/pp/Downloads/3df443f430fd3d79.mp4`. The result is `C:/Users/pp/Downloads/video (2).mp4`. Both are 1280 × 720 at 30 FPS and approximately 15 seconds. The reference has an AAC audio track, while the result has no audio. The user omitted a separate soundtrack and now requires the reference audio to be selected automatically. Its composition problems are also visible without audio.

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

Use the existing React, TypeScript, Node, Canvas, Remotion composition and browser export stack. Add a persistent project workspace containing a creative brief, reference evidence, audio timeline, design tokens, scene modules, editable parameters, asset manifest, diagnostics and preview revisions. Agents can inspect and patch these files through typed tools, compile them, inspect real browser renders and iterate. Source files become versioned project artifacts.

Support both direct editable scene graphs and custom TypeScript scene programs. Programs use a bundled motion SDK to produce bounded, validated drawing commands and stable layer identities at a requested timestamp. This gives authoring access to formulas, procedural geometry, composition and custom timing while preserving editor controls. The isolated runtime evaluates the program, and trusted browser renderers draw its output. Specialized scenes remain useful when their behavior fits the reference.

The workflow becomes media/audio inspection → reference and sound specification → direction and styleframes → scene coding → browser compile/render/inspect → targeted code and design repair → whole-film continuity review → editable browser export. Work persists across quota waits, refreshes and retries.

Configured models perform interpretation, planning and authoring through the server. Browser tools decode references, measure fonts, render frames, evaluate animation and encode the final video. The product needs stronger representations, tool access and feedback. Model availability or a valid JSON response alone cannot establish design quality.

The coverage roadmap includes typography, UI/product promos, diagrams, charts, vector illustration, abstract motion, composited assets and bounded 3D scenes. For each reference, produce a capability map covering objects, effects, required assets, audio and browser cost. A missing capability becomes an explicit implementation or asset task. An approximation requires a visible review outcome. Generality is measured across unfamiliar references with different visual families and effect requirements.

## Required reference-audio behavior

| Input | Selected audio behavior |
| --- | --- |
| User supplies a separate soundtrack | Use that track and align the scene plan to its cues. |
| Video reference has audio and no soundtrack was supplied | Automatically extract and use the selected reference interval's audio. |
| User explicitly selects mute | Persist mute through retries, reference changes and reopening. |
| Reference is an image or a genuinely silent video | Continue with visual timing and show that no source audio was available. |
| Reference audio exists but cannot be decoded | Preserve the project and show a recoverable audio error with retry, replacement or mute actions. |

The UI shows **Audio from reference**, a preview waveform, and replace/mute controls. Reference audio includes the source's music, speech and sound effects. Music-only separation is a distinct future capability. The default preserves the selected mix and timing. Replacement audio changes that choice explicitly.

Browser extraction can reuse the installed Mediabunny primitives for track selection, trimming and conversion. Choose compatible packet remuxing when suitable, with local decode/re-encode when precise trimming or codec conversion requires it. Validate compatibility against the pinned app version. [Mediabunny conversion documentation](https://mediabunny.dev/guide/converting-media-files)

## A. Establish the benchmark and quality state

- [x] A1. Inspect both provided videos, compare contact sheets, and read the actual model artifacts and review history. Record the failures above.
- [ ] A2. Create a versioned acceptance manifest for the original reel and this product promo. Record reference intervals, mandatory text, visual objects, intended hierarchy, motion landmarks, palette roles, output dimensions and soundtrack choice. Store hashes and timestamps alongside private media locations.
- [ ] A3. Persist separate generation and review outcomes. Distinguish a draft that rendered, an approximated draft, a draft awaiting review and a draft that passed review. Keep prior unresolved issues when a later critic is unavailable. Manual approval must preserve that review history.
- [ ] A4. Add regression fixtures for text hidden behind cards, clipped long text, omitted CTA, incorrect scene family, and reference analysis recovering with no pixel cuts. Keep current user projects as historical evidence and use separate verification projects.

## B. Build a reference specification that reaches every agent

- [ ] BA1. Persist audio selection as an explicit policy such as `auto_reference`, `uploaded` or `muted`, with a resolved track state. Update project creation, setup requirements, retry receipts, snapshots and asset ownership validation together. Legacy projects retain their saved audio behavior.
- [ ] BA2. Inspect the reference's audio tracks in the browser and extract the chosen source interval automatically. Correct for audio/video presentation timestamp offsets and encoder priming. Preserve stereo and the complete source mix, and handle differing sample rates with the existing local conversion path.
- [ ] BA3. Save the extracted audio as an owned durable asset with reference hash, track identity, source interval and conversion version. Deduplicate extraction/upload retries using these values. Gate run startup on resolved media setup and keep cancellation/reload recovery idempotent.
- [ ] BA4. Analyze energy, onsets, silence and rhythmic events locally, with confidence values. Use a qualified audio-capable route for optional speech timing or sound-event interpretation. Distinguish a measured onset from an estimated beat. Avoid a mandatory transcription call for instrumental references.
- [ ] BA5. Build a shared time map connecting source video timestamps, source audio, output frames and animation events. For a matching-duration reconstruction, preserve source timing. For changed duration or replacement music, plan and show the retiming policy and inspect a preview. Keep soundtrack tails, scene holds and cuts deliberate.
- [ ] BA6. Include audio events in direction and scene coding. Support accent hits, transitions, phrase holds and procedural audio-reactive elements. Make the visual critic inspect motion with the selected audio and explicit alignment landmarks.
- [ ] BA7. Preserve gain and source timing for auto-extracted audio by default. Replace the current blanket soundtrack gain/fade behavior with a recorded mixing policy appropriate to the selected source. Include the chosen audio in browser preview, persisted projects and MP4 export.
- [ ] BA8. Verify video-only submission with audible source, explicit replacement, explicit mute, silent source, unsupported audio, a nonzero reference trim, and a refresh during extraction. Inspect the exported track and aligned waveform. Use a target alignment error within one output frame after compensating for codec delay.
- [ ] B1. Retain the initial sparse pass, then request bounded scene-level samples around visual changes and motion landmarks. Combine content/layout changes with pixel differences. Zero hard cuts must trigger semantic inspection instead of an automatic single-scene interpretation.
- [ ] B2. Use existing crop and higher-resolution sampling support to inspect typography, controls, icons and fine details. Contact sheets currently shrink each image to 224 × 126 pixels. Deliver selected individual frames and crops to the qualified vision stage, with source timestamps and crop bounds.
- [ ] B3. Define `ReferenceSceneSpec` with source interval, required content, object identities, bounding boxes, alignment, layer order, color roles, text styles, entrance/hold/exit events, persistent elements, transition behavior, confidence and evidence IDs. Identify uncertain properties explicitly. Observations about motion need multiple frames.
- [ ] B4. Map each output scene to reference evidence and output timing. Reference matching should inherit evidenced structure and pacing, adjusted for the user's brief and duration. Style-inspired work can diverge intentionally. Represent this intent explicitly in the plan.
- [ ] B5. Send the relevant specification and images to the visual designer and vision-capable engineer routes. Text-only routes receive the full structured specification. Give agents a bounded mechanism to request another crop or sample when a required detail is unresolved.
- [ ] B6. Stop forcing hook and closing sections into `impact` and `identity`. Require a component compatibility check against the requested objects and behavior. Escalate incompatible sections to general composition authoring.

**Checkpoint 1, after A–B**

Run focused schema and recovery tests, then inspect the real reference analysis on both supplied reference families. A video-only submission of the product reference must automatically produce a saved soundtrack and correct source-relative cues. Exercise BA8 as one grouped audio check. The product promo must retain its six meaningful sections and visible UI objects with source evidence. Where timing is uncertain, inspect additional samples before accepting a boundary. Confirm that a reference lacking hard cuts can still produce multiple semantic sections. Commit and push after the grouped checks pass.

## C. Expand the editable composition language

- [ ] C0. Prototype custom scene execution before committing to its runtime. Evaluate a bundled QuickJS WebAssembly runtime inside a dedicated worker. Supply only the motion SDK, deterministic math, versioned input data and owned asset handles. Enforce interpreter memory/stack/instruction limits, worker deadlines, and output command/byte limits. Test isolation and performance before qualification.
- [ ] C1. Introduce a versioned authoring schema with consistent design-space coordinates, explicit parent/group relationships, clipping and layer order. Compile flat node records and parent IDs into the existing bounded graph. Document units and transform origins, validate cycles and unique IDs, and preserve older saved graphs through version-aware loading.
- [ ] C2. Add per-element paint and typography. Support bounded solid colors, gradients, strokes, shadows/glows, font family/weight/style, line height, text alignment, explicit text boxes and styled spans. Bundle the necessary licensed fonts and await loading. Include semantic status colors independently of brand colors.
- [ ] C3. Expose paths, groups and masks already supported by the renderer, then add owned image/SVG assets and reusable primitives for buttons, cards, icons, text rows and waveform elements. Sanitize imported vectors and preserve asset provenance. Reusable objects must compose into layouts chosen from the reference.
- [ ] C4. Add explicit property tracks and animation intervals for transforms, opacity, reveal masks, path drawing, text reveal and bounded shape deformation. Support easing, controlled spring motion, stagger, overlap, entrance, hold and exit. Parameterized waveforms and deterministic procedural motion must work without an audio track.
- [ ] C5. Represent continuous elements and movement across cuts through shared groups or transition relationships. Charge overlapping scenes, effects and assets to the browser budget. Keep frame evaluation deterministic at arbitrary timestamps and after seeking.
- [ ] C6. Expose the expanded graph in the editor through layer selection, reorder, text styling, position/size, color and timing controls. Route all changes through the existing revision/undo system. Preserve immutable export snapshots and existing project behavior.
- [ ] C7. Add versioned TypeScript scene modules with a documented pure frame function, stable object IDs and an editable property manifest. Compile with pinned, bundled tooling. Return compiler/runtime diagnostics with source locations to the coding agent. Persist source, dependencies, assets, build hash and renderer version with the project.
- [ ] C8. Compile ordinary layouts and keyframes into editable nodes whenever possible. Evaluate genuinely procedural parts inside the isolated interpreter and validate their output before trusted rendering. Batch command exchange and cache static geometry to control interpreter overhead. Give procedural modules useful text, color, asset, geometry and timing controls through their property manifest.
- [ ] C9. Bundle approved SDK helpers and examples for text layout, typography animation, vector paths, masks, gradients, springs, curves, particles, waveform drawing, charts and UI objects. Each example includes an expected render and one known failure/repair case. Test the actual exported SDK surface against the prompts.
- [ ] C10. Add asset reconstruction tools for approved source crops, shape tracing and sanitized vector imports. Record editable layers versus linked raster/vector assets explicitly. Asset reuse must remain traceable to the user's reference or supplied media.
- [ ] C11. Add a separately qualified 3D adapter for bounded mesh, camera, material, lighting and imported-scene descriptions. Prefer a bundled open-source browser renderer such as Three.js after compatibility, license and device checks. Use resource estimates for geometry, textures and render targets. Extend the scene SDK capability manifest as each supported effect passes tests. [Three.js project](https://github.com/mrdoob/three.js)
- [ ] C12. Verify generated programs against infinite loops, runaway allocation, oversized output, forbidden host access, invalid paths, invalid numeric output, cross-project assets and stale revisions. Test same-frame determinism after scrubbing, reload and export. Browser-worker execution and static source checks must be backed by a restricted interpreter boundary.

QuickJS is a runtime candidate because its browser-capable WebAssembly interpreter exposes configurable host functions, module loading and CPU/memory controls. Integration performance and correct host bindings still require the C0 prototype. [QuickJS implementation and runtime documentation](https://github.com/justjake/quickjs-emscripten)

### Environment and deliverables

| Area | Implementation location or deliverable | Runtime |
| --- | --- | --- |
| Audio extraction and timing | Extend `resources/js/editor/motion/audio-analysis.ts`, setup upload, setup persistence and source metadata | Browser decode/analysis, server asset persistence |
| Source evidence and scene specifications | Extend `shared/motion/reference.ts`, browser sampling, observer and specialist handoffs | Browser media work, server model requests |
| Motion SDK and compiled contracts | Versioned modules under `shared/motion/`, drawing and validation APIs with executable examples | Shared validation and browser rendering |
| Generated scene workspace | Revisioned workspace artifacts and typed file/build tools under `server/motion/` | Server persistence/orchestration, client compilation/evaluation |
| Isolated scene execution | Dedicated browser worker, bundled WASM interpreter and pinned TypeScript compilation tooling | Browser |
| Direct scene and 3D rendering | Shared trusted renderers, stable layer IDs and browser asset resolver | Browser Canvas/WebGL or qualified WebGPU |
| Model routing and quality profiles | Extend `server/motion/providers/`, qualification records and quota ledger | Server |
| Agent skills and tools | Update packaged skills, prompts, manifests, tools and resource checks | Server agent context and typed browser tool requests |
| Export and verification | Existing browser exporter plus generated-scene/audio integration and grouped evaluation scripts | Browser export, development verification tools |

- [ ] C13. Pin and bundle the selected interpreter/compiler/renderer versions, required fonts and helper modules. Extend `motion:setup`, the resource manifest and clean-install verification. Check font, SDK and generated-program compatibility before opening or exporting a project. Test from a clean checkout without this Codex session's private runtime paths.

## D. Make the browser an active layout and validation tool

- [ ] D1. Implement shared layout measurement using the same fonts and drawing rules as export. Return actual text bounds, wrapping, element extents and font sizes. Check the complete animated span where feasible, plus boundary and extremum samples for procedural effects.
- [ ] D2. Add diagnostics for off-canvas content, clipping, unintended opaque occlusion, unreadable contrast, missing required text and missing assets. Account for intentional masks and entrance/exit effects to avoid false failures.
- [ ] D3. Render a representative static layout per scene before animation authoring. Compare the hierarchy, spacing, colors, detail and content to its reference frame. Feed concrete bounding-box and visual evidence back to the designer for repair.
- [ ] D4. Replace blanket slide/fade compilation with authored motion tracks. Validate readable holds, intentional transitions and required motion landmarks using short rendered sequences and event samples.
- [ ] D5. Integrate the new primitives into cost estimation, asset limits, decoding cleanup, export cancellation and browser profiles. Count path segments, painted pixels, effect surfaces and overlapping work. Determine expanded limits through profiling before enabling them.

**Checkpoint 2, after C–D**

Run typecheck, build and focused renderer/editor tests. Render diagnostic scenes exercising mixed type styles, a status color outside the brand palette, path masks, nested groups, a moving waveform, aligned UI rows and a real CTA. Render a novel procedural scene through a generated scene module and exercise its editable properties. Test C12 and the qualified 3D subset. Use the regression fixtures to demonstrate caught occlusion and clipping. Check preview/export parity, seeking, reopening and undo. Profile 720p/30 first, then the existing higher profiles on qualified hardware. Commit and push after this group passes.

## E. Give agents a real design and repair loop

- [ ] E1. Split each scene's work into layout proposal, browser layout check, motion proposal and browser motion check. Persist validated artifacts so retries reuse completed work. Give each specialist the source evidence and previous diagnostics relevant to its task.
- [ ] E2. Enable bounded tool requests for sampling, measuring, rendering and patching. Current prompt tool lists alone do not provide an interactive model-tool loop. Validate requests, execute with the appropriate role, return results and apply per-run call/token/time budgets.
- [ ] E3. Review paired reference and generated frames directly with a qualified vision route, supplemented by short temporal sequences and scene metadata. Include graph text and object identities in review inputs. Frame labels must be unambiguous, and issues must cite actual evidence.
- [ ] E4. Allow a repair to replace an unsuitable scene representation while preserving required content and the declared timing contract. Permit deliberate timing repairs through validated timeline operations. Include graph text, secondary copy and CTA in protected content checks.
- [ ] E5. Track whether each requested repair actually changed the targeted visible property. Re-render and compare against the prior candidate. Retain the better candidate when a repair regresses another required feature. Stop repeated ineffective repairs with actionable findings.
- [ ] E6. Keep simplified recovery layouts marked as approximations. Preserve the best editable draft and its pending review issues if providers or budgets are exhausted. Provide specific per-scene recovery actions in chat.
- [ ] E7. Implement the agent workspace and typed file tools for reading artifacts, creating modules, applying patches, compiling, rendering a frame or time interval, comparing evidence, measuring layout and proposing a revision. Use revision-aware writes and one authoritative integrator. Let independent scene agents work within provider concurrency limits and merge by owned scene IDs.
- [ ] E8. Give the art director responsibility for the whole film's visual identity, object continuity, rhythm and sound alignment. Where composition is uncertain, render two small candidate styleframes and select against the brief before spending the full animation budget. Treat this as targeted candidate selection, with its inference usage recorded.
- [ ] E9. Extend packaged app skills with UI/product motion, mixed typography, procedural animation, audio synchronization, generated-code diagnostics, reference comparison and the qualified 3D subset. Make skill/schema versions discoverable in runtime resources and clean-install checks. Retrieve relevant examples by capability and design intent, then validate that retrieved APIs exist in the installed SDK.
- [ ] E10. Maintain a compact project memory of approved text, design tokens, source evidence, timing decisions and unresolved findings. Use different qualified routes for authoring and critique where measured results justify it. Summaries and visible progress must describe real actions and review evidence.
- [ ] E11. Add patch-based reasoning loops for syntax errors, layout defects and visual issues, with adaptive effort and deadlines. A request for extra reasoning must use settings actually supported by that model/provider. Existing `deep` roles currently route some calls through concise low/medium effort. Record requested and effective settings, and qualify stronger settings on real scene tasks.

## F. Qualify models for this work and control cost

- [ ] F1. Evaluate currently configured routes separately for reference layout reading, scene design, structured authoring and visual criticism. Use fixed tasks from several visual families and score correctness, visual quality, latency, retry rate and accounted tokens.
- [ ] F2. Prefer a qualified vision model for visual design and comparison. Use configured text/code-capable models for construction from a complete specification when they perform better. Keep model IDs, credentials and provider routing server-side.
- [ ] F3. Size requests by stage and scene complexity. Reserve budget for visual verification and repair. Cache evidence, schemas and approved artifacts by their hashes. Retry failed scene work without regenerating the entire project.
- [ ] F4. Record actual development provider usage and failed attempts. Evaluate quality under the normal product budget. Keep a larger experimental budget labeled separately so a manually rescued result cannot stand in for routine performance.
- [ ] F5. Replace NVIDIA-only endpoint qualification with explicit provider adapters for configured NVIDIA routes and optional OpenRouter/Gemini routes. Register text, vision, audio, structured-output, tool and reasoning capabilities independently. Validate each endpoint on the target task before routing live work to it.
- [ ] F6. Add a strict zero-price API policy for optional providers. Check model and endpoint pricing, use an explicit qualified allowlist, enforce account quotas and disable paid fallback routes. Preserve work when the free allowance is exhausted and resume at the provider's reset time. Revalidate availability and pricing because free catalogs change.
- [ ] F7. Treat credentials-configured, reachable, free-eligible, task-qualified and production-eligible as separate states. Use actual account limits. Installing an adapter does not establish API access. Keep media-routing consent and provider data handling visible when introducing a new provider.
- [ ] F8. Benchmark the configured coding/planning candidates against the researched free candidates below. Record exact provider, model ID, reasoning setting, token allowance, latency and visual score. Select routes from this evidence. Multiple agents using a weak route do not establish frontier-model equivalence.

### Free API candidates checked on 10 November 2026

These are candidates for qualification, and their availability on this user's accounts has not been tested in this planning turn.

| Route | Proposed use | Evidence and limits |
| --- | --- | --- |
| Existing NVIDIA Super VL, Ultra and other configured candidates | Reference vision, direction and scene coding according to measured capability | Keep the working configuration as the initial development route. NVIDIA describes free endpoint access for prototyping. Its trial terms restrict production use, which needs separate eligibility. [NVIDIA FAQ](https://docs.api.nvidia.com/nim/docs/product), [trial terms](https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf) |
| OpenRouter free Super VL/Ultra, Dots3-Note Preview and North Mini Code | Alternative vision/reasoning and coding candidates | Listed with zero input/output model pricing. Catalog inclusion establishes availability, while VidsAI task qualification establishes fitness. [Free model catalog](https://openrouter.ai/collections/free-models/) |
| Gemini 3.8 Flash on the Gemini API free tier | Candidate for reference interpretation, scene authoring and independent review | The official pricing page lists free-tier input and output, including thinking tokens. Account/region quotas and capabilities need testing. Free-tier data is listed as used to improve Google's products. [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.8-flash) |

OpenRouter documents 20 requests/minute and 50 requests/day for the basic free variants, with failed attempts counting toward the allowance. A long project may consume much of that daily budget. The higher advertised allowance requires a credit purchase. Use the basic free allowance when enforcing a zero-spend setup. [OpenRouter free-tier limits](https://openrouter.ai/collections/free-models/)

**Checkpoint 3, after E–F**

Exercise the complete Create → Motion graphics → reference/prompt → chat → preview → repair → editor → export flow with real configured models. Use fresh projects for both existing reference families. Review actual motion playback and paired frames. Verify replacement of the inappropriate impact hook, visibility of all three card labels, a readable transcript panel, a moving waveform, the green indicator and closing CTA. Confirm reference-only submission automatically carries source audio, then test explicit mute and a replacement soundtrack. Test a critic failure and repeated ineffective repair without losing earlier review findings. Mocked provider tests establish failure handling separately from live visual acceptance. Commit and push only after the relevant checks pass.

## G. Prove performance on unfamiliar references

- [ ] G1. Assemble at least six distinct reference families from permitted media. Include the original abstract reel, this dark UI promo, a light minimalist product promo, kinetic typography with mixed styles, a data/chart explainer, and an illustration or organic-motion sequence. Add a portrait composition and long/Arabic text cases. Reserve at least two references entirely outside prompt examples and tuning.
- [ ] G2. Freeze the brief, rubric, input media hashes and quality thresholds before each evaluation. Run the normal workflow without importing a finished scene document or hand-authoring scene parameters. Record automatic first-draft quality separately from user-assisted refinement.
- [ ] G3. Generate at least two independent fresh runs per held-out reference. Use three on a borderline case. Report the number attempted, failures, approximations, retries, generation time and model usage alongside visual scores. A successful selected run must not hide a failed one.
- [ ] G4. Review source and output playback, scene landmarks and full-size frames. Use a human reviewer for final design acceptance. Model scores and image similarity are supporting evidence. Correct rendering and faithful composition are separate checks.
- [ ] G5. Run grouped release verification covering browser-only export, resume/retry/cancel, revision safety, old projects and the existing footage workflow. Exercise the supported browser/device profiles and leave untested profiles explicitly unqualified.
- [ ] G6. Publish the results and outstanding limitations. Update the motion completion report to distinguish the original benchmark from demonstrated support across references. Commit and push the verified release.
- [ ] G7. Compare against existing or user-supplied outputs made with the requested frontier coding agents on the same briefs/references. Record tool access, budget and human intervention where known. Use blind side-by-side human assessment of composition, typography, motion, sound, reference fidelity and editability. Establish the comparative acceptance margin before testing. Keep any equivalence claim pending when corresponding baseline outputs are unavailable.
- [ ] G8. Include novel procedural motion, a bounded 3D reference and soundtrack-driven timing in the held-out evaluation. Verify that new scene code was authored through the product tools and that its assets and parameters survive editing/export. Add reference families as capabilities expand, with failures included in the report.

## Acceptance rules

These are proposed release gates to fix before live evaluation, with any later adjustment recorded and justified.

- Every required heading, label, status indicator and CTA is present, readable and editable. Zero unintended off-canvas text or opaque occlusion at the required readable holds.
- Reference-matching tests retain the required objects, composition hierarchy and style. For unchanged aspect ratios, key element centers and dimensions should stay within 5% of the canvas dimensions of the annotated layout unless the brief asks for adaptation.
- Clearly evidenced scene and motion landmarks should be within 0.2 seconds of the annotated target for same-duration matching. Uncertain or intentionally retimed events have a declared output target before evaluation.
- Typography, composition, motion, continuity and brief fidelity each score at least 4/5 in the final human review. Every held-out run counted as passing must meet each dimension. Record first-attempt and repaired pass rates separately.
- All blocking visual findings are resolved before marking a draft as passed. A manual export remains possible with an explicit approximation or review-pending status.
- Preview and MP4 agree at chosen frames and temporal landmarks. The complete file decodes, matches the requested duration and follows the persisted audio policy. A video-only submission with an audible source automatically includes the source audio. Check synchronization at the start, middle and end.
- Custom scene modules remain editable through stable IDs and declared parameters. Required visible copy, colors, timing and user assets must be changeable without flattening the entire film. Failed code evaluation leaves the browser responsive and preserves the last valid revision.
- A frontier-quality comparison requires paired baseline outputs and a recorded evaluation protocol. Passing internal checks alone establishes only the stated internal rubric.
- Editing and export complete within measured device limits. Repeated export/cancel/retry does not leave stuck decoders, orphaned tasks or accumulating media buffers. Compare memory and responsiveness against the baseline on the same hardware.

## First implementation batch

Start with A2–A4, BA1–BA8 and B1–B6, using currently qualified model routes. Prototype C0 before the rest of the runtime work. Complete C–D, then E–F, and finally G. Run small qualification probes when a new route is needed, and conduct full comparative model evaluation once the authoring loop exists. Verify and commit at the grouped checkpoints.

The first visible change is automatic reference audio. The central quality change is the persistent coding/rendering/review environment. Dependencies and SDKs are installed, pinned and bundled as their implementation tasks are completed. This revision is a plan update, and the new runtime, audio behavior and provider integrations remain pending.

This plan does not establish universal reconstruction of arbitrary video effects. Its release evidence must show repeatable visual quality across the declared reference families and identify capability gaps before generation.
