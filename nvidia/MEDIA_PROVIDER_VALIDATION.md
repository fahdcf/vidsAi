# Media-provider setup and verification

Completed 2 November 2026. Credentials are in the ignored `.env` and `nvidia/private/PROVIDER_CREDENTIALS.md`. The private guide includes all 21 NVIDIA models and their actual keys, use cases, endpoints, request/client contracts, key metadata and limitations, plus Deepgram, FreeSound and the recovered Pexels credential. `/nvidia/private/` is ignored by Git; no secrets are stored in this report.

## Credential recovery and configuration

- Updated both GitHub remotes locally and searched five existing checkouts and their relevant history. One unique Pexels key was found in historical `config/services.php` changes, including `d02a466b164cb567a1031b19ca5d4d0eb634bae9` and the later cleanup commits. It returned HTTP 200 and usable stock-video search results.
- Configured the supplied Deepgram key. Live transcription of a short synthetic English voiceover produced 14 words with valid word timestamps and expected content. A separate backup Deepgram key remains unconfigured.
- Configured the supplied FreeSound API key and stored the client ID. The existing application's search, popular and trending methods each returned HTTP 200, results and audio preview URLs. Current search/preview use does not require an OAuth flow.
- Kept `WAN_AI_API_KEY` blank as a placeholder. No WAN requests were made. Other optional image-provider configuration remains unchanged.
- All 21 NVIDIA credentials and the current task-specific fallback chains were preserved. Unavailable, slow or task-incompatible models remain stored rather than being added to active fallback chains.

## Full application check

An authenticated browser session uploaded a fresh synthetic voiceover through `/create`. The queued job called Deepgram, the NVIDIA scene planner and Pexels, and produced three scenes with three caption segments. Scene review confirmation passed. FreeSound search and music attachment passed. The application exported and downloaded a **1,413,765-byte MP4** with stock footage, narration and the selected music preview. Verification project: **9**.

The live workflow exposed and fixed three integration issues:

1. Initial silence before the first spoken word is now included in the first visual scene without moving later cuts or word timestamps.
2. Narration positions are no longer stored as source-video trim offsets. Stock-source duration and planned scene duration are kept separate, and merging scenes preserves the selected source metadata.
3. Uploaded voiceovers use an authenticated project URL for preview and a temporary signed URL for the render worker. Previously saved storage URLs are translated during rendering. Unsigned requests by other users remain forbidden.

Validation: **26 Laravel tests / 119 assertions**, **11 Node tests**, TypeScript checking, successful live provider calls and the fresh real-media export. The language-model tests from `LIVE_VALIDATION.md` remain applicable. This English smoke check does not establish transcription accuracy for Arabic/Darija or every recording condition.
