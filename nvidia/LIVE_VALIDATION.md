# NVIDIA integration and development checks — 2 November 2026

Scene planning now uses **Super VL → Lightning**. The editing assistant uses **Super VL → Ultra → local deterministic tools**. NVIDIA replaces OpenRouter/Gemini for scenes and OpenRouter/Groq for editing when enabled. Existing credentials and rollback code are preserved. No future media, speech, retrieval or translation workflow has been enabled.

## Current order by use case

| Use case | Current usable order | Status and limits |
| --- | --- | --- |
| Editing assistant | Super VL → Ultra | Both passed the real planner with schema validation and document application. Lightning failed that planner and is excluded. |
| Scenes, scripts and captions | Super VL → Lightning | Both passed the application's full scene prompt in English, French and Darija with thinking disabled. Strict validation covers script wording, scene types, continuous timing and narration coverage. |
| Footage understanding | Nano Omni → Super VL → Mistral Large 4 | Stored only. All described a red square; this does not establish video or audio understanding. Mistral took about 22 seconds. Cosmos Reasoner returned HTTP 404; Gemma timed out. |
| Translation | Riva Translate → Ultra | Stored only, provisional. Both responded. Riva translated an instruction prefix as well as the sentence, so the final adapter needs a translation-specific prompt and multilingual evaluation. Other original candidates timed out. |
| Media search | Embed 3.5 1B → Embed 3.5 8B → Embed 3 1B; then Rerank 3.5 8B | Stored only. All returned successful response shapes. Keep separate indexes per embedding model; reranking and Nano Omni descriptions are separate stages. Retrieval relevance has not been evaluated. |
| Speech/audio/generated media | BNR → Studio Voice for noise cleanup; Studio Voice → BNR for enhancement; Active Speaker for speaker tracking | Stored only. Official NVIDIA clients processed sample media successfully. These are separate roles, not a universal fallback list. Body Pose exceeded 40 seconds. Magpie, Voicechat and both Cosmos generators still lack verified callable hosted contracts/access. |

The original five-model rankings remain in `rankedUseCases` for reference. `validatedUseCases` records the revised choices. Failed or slow candidates are not silently added to the active request chains. This is a small development smoke evaluation, not a claim that all models are production ready or that the chosen order is universally optimal.

## Checks and evidence

- All original HTTP lists were exercised in order. `LIVE_RESULTS.json` contains status, timing and failures without secrets or embedding vectors.
- Disabling Nemotron thinking changed the real scene checks from timeouts to successful responses in roughly 2.5–5.3 seconds. Both scene models passed three languages. The app still needs Deepgram for narration transcription and word timing; image understanding is not an ASR replacement.
- Actual editing checks used the real planner, operation schema and editing core. Super VL and Ultra returned valid operations. Malformed operations, network errors and empty final responses advance to the next model; outputs are never applied without validation.
- A live scene fallback check deliberately supplied an invalid primary key and succeeded through Lightning. Unit tests exercise invalid-output fallback and per-model credential selection.
- The editing fallback also passed with a deliberately invalid Super VL key and a real Ultra response. The browser test used NVIDIA for its two assistant operations, saved the edits, exercised undo/redo and uploads, and downloaded a real 48,114-byte MP4 without browser errors. Laravel passed 22 tests / 98 assertions; Node passed 10 tests and TypeScript checking.
- Audio clients produced WAV files; Active Speaker produced a video. Those endpoint smoke tests do not establish perceptual quality. Body Pose timed out and remains unavailable for recommendation.
- Magpie, Voicechat, Cosmos generation and Cosmos Transfer were not called because their hosted request contract/access remains unresolved. Their keys stay saved.

## Providers still needed

All values below were absent in the local `.env` during this audit. Add private credentials there; never add them to this document.

| Provider | Environment settings | Still needed for |
| --- | --- | --- |
| Deepgram | `DEEPGRAM_API_KEY`; optional `DEEPGRAM_FALLBACK_API_KEY` | Uploaded voice transcription and word timing, including existing Arabic/Darija alignment path. |
| Pexels | `PEXELS_API_KEY` | Stock video search and scene footage. NVIDIA language models do not supply licensed stock assets. |
| WAN AI / DashScope | `WAN_AI_API_KEY` | Optional generated videos and image-to-video. Cosmos is not a verified replacement. |
| FreeSound | `FREESOUND_API_KEY` | Optional music/sound search. |
| ImgBB | `IMGBB_API_KEY` | Optional image-hosting path for external image-to-video services; other hosting routes also exist. |
| Generic image API | `IMAGE_API_URL`, `IMAGE_API_TOKEN` | Declared configuration for a future/external image service; no active server-side use found in this audit. |
| Cloudflare AI | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Declared image configuration; no active server-side use found. |

OpenRouter, Groq and Gemini keys are also absent, but they are no longer required by the two NVIDIA-enabled language-model paths. Registration, local editing and export can work without the missing media-provider keys; creating videos from new narration and stock search cannot be fully verified until Deepgram and Pexels are configured.

## Operation

`config/nvidia.php` resolves Laravel model credentials and writing routes. The editing worker receives NVIDIA environment settings through `scripts/local.cjs`, including model aliases containing digits. Restart local services after changing `.env`. Set `NVIDIA_PROVIDER_ENABLED=false` to restore the old provider paths, which require their own credentials.

NVIDIA calls verify TLS. Scene attempts have a 35-second deadline; editing attempts have a 10-second deadline. Only the two validated models per active chain are attempted. Raw reasoning is never used as final scene or editing output.
