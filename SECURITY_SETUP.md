# Private configuration

Copy `.env.example` to `.env` and fill local credentials. Use different random values for `APP_KEY` and `WORKER_TOKEN`. Neither credentials nor runtime databases/media belong in Git. The ignored `nvidia/private/PROVIDER_CREDENTIALS.md` retains the complete private model inventory.

The control server uses hashed session tokens, HttpOnly cookies, CSRF checks, per-project ownership and expiring signed renderer media URLs. Workers require the shared bearer token and bind to loopback in the local launcher. Recovery links expire after 30 minutes, are single-use and invalidate existing sessions. Local recovery mail is saved outside the web root; configure SMTP to deliver it.

Before publishing changes, check the staged diff and outgoing history for configured secrets. Never put real values in examples, screenshots, logs or issues. Provider errors returned to users omit credentials.
