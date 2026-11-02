# NVIDIA models for VidsAI

Updated 2 November 2026. **NVIDIA now powers scene planning and editing commands.** See [live validation and current model order](LIVE_VALIDATION.md) and [machine-readable results](LIVE_RESULTS.json). All 21 credentials use the provider's “Never Expire” policy.

## Current completion boundary

The signed-in NVIDIA Build account was inspected through Chrome mouse and keyboard controls. All 21 model-labelled keys were created, saved directly to the ignored application `.env`, and verified as active in the account key list. Every key used the **Never Expire** option. NVIDIA displays that option as an expiration date in **2126**, so it should be described as the provider's “Never Expire” policy rather than a guarantee of infinite validity.

The initial 30-day Super VL and Mistral keys were replaced, their replacements were saved, and those two superseded keys were deleted. Other existing account keys were preserved. Key values are absent from this guide, the registry and the request examples.

These are general NVIDIA Build serverless credentials labelled for each model. Creating a key does not grant model-specific early access. Live checks subsequently exercised 17 model endpoints; four hosted contracts remain unavailable for testing. Results vary by task and are recorded separately.

With `NVIDIA_PROVIDER_ENABLED=true`, Laravel scene planning uses Super VL → Lightning, and the editing worker uses Super VL → Ultra. Per-model credentials and task routes are consumed by these adapters. The prior OpenRouter/Gemini/Groq paths are bypassed while NVIDIA is enabled and retained for rollback. Other task settings remain stored for future features.

## Files and credentials

- Private values belong only in the existing sibling application `.env` file (`vidsAi/.env`). Its prior contents were preserved, with an ignored backup under the parent `runtime/nvidia-config-backup` directory.
- `models.env.example` contains every new setting with blank credentials.
- `models.json` records all 21 unique catalog entries, six ranked lists, compatible task routes, source URLs and account-verification status.
- `requests.json` records per-model HTTP request shapes or official gRPC client arguments. Unknown hosted request contracts are explicitly blank.
- Each populated `NVIDIA_<ALIAS>_API_KEY` has matching `_KEY_ID`, `_KEY_LABEL`, `_KEY_EXPIRATION_POLICY=never` and `_KEY_DISPLAYED_EXPIRATION` metadata in the private `.env`. `NVIDIA_CREDENTIAL_STATUS=live_smoke_tested_partial_availability` distinguishes these development checks from comprehensive validation.
- The editing worker resolves a per-model credential, then the shared key. Laravel resolves the registry's credential variables through cached configuration. No credentials enter client-side assets.
- A key variable, catalog name or documented endpoint is not evidence of account entitlement or a successful live call. Early access cannot be bypassed by creating additional keys.

## Original six recommendation lists

These original orders are retained for traceability. Use `validatedUseCases` in `models.json` and `LIVE_VALIDATION.md` for current recommendations. Only the three active task routes listed above are integrated.

### 1. Editing assistant / complex planning

| Order | Model | Intended role |
| --- | --- | --- |
| 1 | [nvidia/nemotron-3.5-super-vl-120b-a12b](https://build.nvidia.com/nvidia/nemotron-3.5-super-vl-120b-a12b) | Complex editing plans and visual reasoning |
| 2 | [mistralai/mistral-large-4-1t-a52b](https://build.nvidia.com/mistralai/mistral-large-4-1t-a52b) | Planning, writing and image-based review |
| 3 | [nvidia/nemotron-3-ultra-550b-a55b](https://build.nvidia.com/nvidia/nemotron-3-ultra-550b-a55b) | Difficult long-context text plans |
| 4 | [deepseek-ai/deepseek-v4.1-flash](https://build.nvidia.com/deepseek-ai/deepseek-v4.1-flash) | Reasoning and structured writing |
| 5 | [google/gemma-4-31b-it](https://build.nvidia.com/google/gemma-4-31b-it) | Multilingual writing and visual analysis |

### 2. Scene planning / scripts / caption rewriting

| Order | Model | Intended role |
| --- | --- | --- |
| 1 | [mistralai/mistral-large-4-1t-a52b](https://build.nvidia.com/mistralai/mistral-large-4-1t-a52b) | Planning, writing and image-based review |
| 2 | [google/gemma-4-31b-it](https://build.nvidia.com/google/gemma-4-31b-it) | Multilingual writing and visual analysis |
| 3 | [nvidia/nemotron-3.5-super-vl-120b-a12b](https://build.nvidia.com/nvidia/nemotron-3.5-super-vl-120b-a12b) | Complex editing plans and visual reasoning |
| 4 | [deepseek-ai/deepseek-v4.1-flash](https://build.nvidia.com/deepseek-ai/deepseek-v4.1-flash) | Reasoning and structured writing |
| 5 | [nvidia/nemotron-3.5-lightning-30b-a3b](https://build.nvidia.com/nvidia/nemotron-3.5-lightning-30b-a3b) | Everyday text editing commands |

### 3. Footage understanding

| Order | Model | Intended role |
| --- | --- | --- |
| 1 | [nvidia/nemotron-3-nano-omni-30b-a3b-reasoning](https://build.nvidia.com/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning) | Footage descriptions, English transcription and media analysis |
| 2 | [nvidia/nemotron-3.5-super-vl-120b-a12b](https://build.nvidia.com/nvidia/nemotron-3.5-super-vl-120b-a12b) | Complex editing plans and visual reasoning |
| 3 | [google/gemma-4-31b-it](https://build.nvidia.com/google/gemma-4-31b-it) | Multilingual writing and visual analysis |
| 4 | [mistralai/mistral-large-4-1t-a52b](https://build.nvidia.com/mistralai/mistral-large-4-1t-a52b) | Planning, writing and image-based review |
| 5 | [nvidia/cosmos3-nano-reasoner](https://build.nvidia.com/nvidia/cosmos3-nano-reasoner) | Physical actions and motion reasoning |

### 4. Translation and localization

| Order | Model | Intended role |
| --- | --- | --- |
| 1 | [nvidia/riva-translate-4b-instruct-v2](https://build.nvidia.com/nvidia/riva-translate-4b-instruct-v2) | Translation including Arabic/French/English |
| 2 | [google/gemma-4-31b-it](https://build.nvidia.com/google/gemma-4-31b-it) | Multilingual writing and visual analysis |
| 3 | [mistralai/mistral-large-4-1t-a52b](https://build.nvidia.com/mistralai/mistral-large-4-1t-a52b) | Planning, writing and image-based review |
| 4 | [deepseek-ai/deepseek-v4.1-flash](https://build.nvidia.com/deepseek-ai/deepseek-v4.1-flash) | Reasoning and structured writing |
| 5 | [nvidia/nemotron-3-ultra-550b-a55b](https://build.nvidia.com/nvidia/nemotron-3-ultra-550b-a55b) | Difficult long-context text plans |

### 5. Media search pipeline

| Order | Model | Intended role |
| --- | --- | --- |
| 1 | [nvidia/nemotron-3.5-embed-1b](https://build.nvidia.com/nvidia/nemotron-3_5-embed-1b) | Primary media-description index |
| 2 | [nvidia/nemotron-3.5-embed-8b](https://build.nvidia.com/nvidia/nemotron-3_5-embed-8b) | Alternative index |
| 3 | [nvidia/nemotron-3.5-rerank-8b](https://build.nvidia.com/nvidia/nemotron-3_5-rerank-8b) | Rank retrieved candidates |
| 4 | [nvidia/nemotron-3-embed-1b](https://build.nvidia.com/nvidia/nemotron-3-embed-1b) | Older text index alternative |
| 5 | [nvidia/nemotron-3-nano-omni-30b-a3b-reasoning](https://build.nvidia.com/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning) | Footage descriptions, English transcription and media analysis |

This list contains cooperating specialists. Its order is preserved, but it is not one executable fallback chain. Use the task routes below.

### 6. Speech, audio and generated media

| Order | Model | Intended role |
| --- | --- | --- |
| 1 | [nvidia/nemotron-3-nano-omni-30b-a3b-reasoning](https://build.nvidia.com/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning) | Footage descriptions, English transcription and media analysis |
| 2 | [nvidia/magpie-tts-zeroshot](https://build.nvidia.com/nvidia/magpie-tts-zeroshot) | Narration generation |
| 3 | [nvidia/nemotron-voicechat](https://build.nvidia.com/nvidia/nemotron-voicechat) | Future full-duplex voice editor |
| 4 | [nvidia/bnr](https://build.nvidia.com/nvidia/bnr/api) | Remove background noise |
| 5 | [nvidia/studiovoice](https://build.nvidia.com/nvidia/studiovoice/api) | Enhance recorded speech |
| 6 | [nvidia/cosmos3-nano](https://build.nvidia.com/nvidia/cosmos3-nano) | Experimental generated images/video |
| 7 | [nvidia/cosmos-transfer2.5-2b](https://build.nvidia.com/nvidia/cosmos-transfer2_5-2b) | Controlled video transformation |
| 8 | [nvidia/active-speaker-detection](https://build.nvidia.com/nvidia/active-speaker-detection/api) | Speaker-aware cuts and framing |
| 9 | [nvidia/body-pose](https://build.nvidia.com/nvidia/body-pose/api) | Pose observations for future reframing |

This list contains cooperating specialists. Its order is preserved, but it is not one executable fallback chain. Use the task routes below.

## Stored routes and compatible fallback candidates

The original table below describes candidate routes. The active agent routes have been narrowed to Super VL → Ultra, and writing to Super VL → Lightning after live checks. Other candidates remain inactive.

| Task | Primary | Fallbacks in order |
| --- | --- | --- |
| agent_fast | `lightning` | `super_vl` → `mistral_large_4` → `ultra` → `deepseek_flash` → `gemma_4` |
| agent_complex | `super_vl` | `mistral_large_4` → `ultra` → `deepseek_flash` → `gemma_4` |
| writing | `mistral_large_4` | `gemma_4` → `super_vl` → `deepseek_flash` → `lightning` |
| media_understanding | `nano_omni` | `super_vl` → `gemma_4` → `mistral_large_4` → `cosmos_reasoner` |
| translation | `riva_translate` | `gemma_4` → `mistral_large_4` → `deepseek_flash` → `ultra` |
| embedding | `embed_35_1b` | `embed_35_8b` → `embed_3_1b` |
| reranking | `rerank_35_8b` | None from the selected list |
| media_captioning | `nano_omni` | `super_vl` → `gemma_4` → `mistral_large_4` |
| english_asr | `nano_omni` | None from the selected list |
| tts | `magpie` | None from the selected list |
| voicechat | `voicechat` | None from the selected list |
| speech_cleanup | `bnr` | `studio_voice` |
| speech_enhancement | `studio_voice` | `bnr` |
| image_generation | `cosmos_generator` | None from the selected list |
| video_generation | `cosmos_generator` | None from the selected list |
| video_transformation | `cosmos_transfer` | `cosmos_generator` |
| speaker_detection | `active_speaker` | None from the selected list |
| pose | `body_pose` | None from the selected list |

Alias-to-model IDs are in `models.json` and in each `NVIDIA_<ALIAS>_MODEL_ID` environment setting.

### Fallback constraints

- Walk the entire compatible list on unavailable providers or invalid outputs, with a configurable overall time budget. Do not broadcast every request to every model. Stored `NVIDIA_MAX_ATTEMPTS=6` accommodates the longest saved route, including every fallback; budget and latency behavior still require evaluation when implemented.
- Vision fallbacks must support the actual input. An image-only model needs sampled frames, and does not automatically replace synchronized video/audio analysis. Validate any proposed operations before committing one revision.
- Embedding alternatives need their own model-specific indexes and query vectors. Never query an Embed 1B index with Embed 8B vectors, even if dimensions are forced equal. Switching the embedding model requires a matching existing index or reindexing.
- Reranking is a later search stage. If unavailable, preserve the retrieved order; an embedding model is not a reranker fallback. Nano Omni creates descriptions before indexing; it does not produce embedding vectors.
- The two speech-cleanup models can be evaluated as alternatives, but their effects differ. TTS, ASR, voice chat, generation, transformation, speaker detection and pose estimation remain separate routes.
- Cosmos Generator can be considered as a video-transformation fallback only with an adapter that supplies supported conditioning. Do not send Cosmos Transfer payloads unchanged to it.
- Nano Omni currently documents English-only support. Preserve the current Arabic/Darija transcription path. Translation Arabic coverage and Darija quality are separate claims.

## API contracts and implementation notes

| Family | Invocation | Authentication / payload |
| --- | --- | --- |
| Chat and vision | `POST https://integrate.api.nvidia.com/v1/chat/completions` | Bearer token; model + messages. Use model-specific settings and media encoding. |
| Embeddings | `POST https://integrate.api.nvidia.com/v1/embeddings` | Bearer token; model, input, input_type=query/passage, encoding_format. |
| Reranking | `POST https://ai.api.nvidia.com/v1/retrieval/nvidia/nemotron-3.5-rerank-8b/reranking` | Bearer token; model, query object, passages objects. This is not the chat endpoint. |
| Media gRPC | `grpc.nvcf.nvidia.com:443` | Official service client, TLS, API key and service function ID. |
| Magpie, Voicechat and Cosmos generation/transfer | Pending | Catalog presence does not confirm a general hosted invocation contract. Access/deployment inspection remains required. |

### Request examples

Every catalog entry has an entry in `requests.json`. HTTP examples contain no credentials and are not auto-executed. The generic image example demonstrates the request shape only; audio/video requests require their model-specific preprocessing and encoding. For gRPC, the argument vector refers to the matching official Python client and its protobuf contract, not to a fabricated JSON REST route.

### Public references inspected

- [Translation request](https://docs.api.nvidia.com/nim/reference/nvidia-riva-translate-4b-instruct-v2-infer)
- [Embed 1B request](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3_5-embed-1b-infer)
- [Embed 8B request](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3_5-embed-8b-infer)
- [Older Embed 1B request](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-embed-1b-infer)
- [Reranking request](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3_5-rerank-8b-infer)
- [BNR client](https://build.nvidia.com/nvidia/bnr/api)
- [Studio Voice client](https://build.nvidia.com/nvidia/studiovoice/api)
- [Active Speaker client](https://build.nvidia.com/nvidia/active-speaker-detection/api)
- [Body Pose client](https://build.nvidia.com/nvidia/body-pose/api)
- Per-model catalog links appear in the tables above. Hosted development access and downloadable/self-hosted licenses are distinct; see [NVIDIA FAQ](https://docs.api.nvidia.com/nim/docs/product).

## Remaining integration and live verification

1. Resolve the four pending hosted contracts and access requirements. For early-access models, record access status rather than claiming success from a generic key.
2. Capture the actual generated request for each hosted version; fill missing Magpie/Voicechat/Cosmos URLs, schemas and function IDs only from observed references. The inventory currently contains 13 HTTP examples, four gRPC client contracts and four pending hosted contracts.
3. Broaden the smoke checks into quality evaluations using representative footage, multilingual narration, retrieval relevance and latency samples.
4. Add adapters for future features only when the product workflow and its quality checks exist. Deepgram, Pexels, WAN and other media services remain separate.
