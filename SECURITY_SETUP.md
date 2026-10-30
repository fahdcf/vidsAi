# Private deployment configuration

This repository remains private. Review ownership and publish only an authorized,
sanitized showcase if a public portfolio link is needed; changing current files
does not make historical credentials safe to publish.

Copy `.env.example` to the ignored `.env` and supply your own Gemini, Deepgram,
optional Deepgram fallback, Pexels and other enabled provider credentials. Set
the `N8N_*_URL` variables and `VIDEO_TRIM_BASE_URL` to your private deployment
addresses. Credentials and deployment-specific URLs have no shipped fallback.
Rebuild Laravel's config cache after changing deployment settings.

Manual root-level diagnostics are development tools, not automated offline tests.
`test_deepgram_api.php` reads `DEEPGRAM_API_KEY` from the process environment,
exits when it is missing and must not print Authorization headers. The environment
check scripts describe variable names only; they never print usable key values.
Do not run provider-connected diagnostics in CI without explicit test credentials.

One-off scripts tied to individual database IDs and the obsolete backup view
were removed. Normal automated tests and useful project documentation remain.
Rotate previously committed provider keys at their providers; this cleanup does
not revoke keys or alter Git history. Protect private webhook URLs as appropriate.
