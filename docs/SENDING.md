# Sending test emails (milestone 2, local)

Test sends go through a small **local send server** (`server/`) that talks to Amazon SES. The browser only calls `/api/send-test`; it never sees AWS credentials.

## Two ways to run the API locally

The same Hono app (`server/app.ts`) can be hosted by two adapters. Pick one per terminal session:

| Runtime              | Start with                            | `/api/*` is served by                                                      | Can send through SES?                                                  |
| -------------------- | ------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Cloudflare (default) | `npm run dev`                         | `worker/index.ts` running in workerd next to Vite (the production runtime) | **Not yet.** Disabled or dry-run only; variables come from `.dev.vars` |
| Node                 | `npm run dev:node` + `npm run server` | Vite proxies to `server/node.ts` on `127.0.0.1:8787`                       | Yes (this page)                                                        |

```
Node runtime:
Browser (Vite, :5173) ──/api──▶ send server (Node, 127.0.0.1:8787) ──SDK──▶ Amazon SES (SESv2 SendEmail)

Cloudflare runtime:
Browser (Vite, :5173) ──/api──▶ worker/index.ts in workerd ──(phase 1: aws4fetch)──▶ Amazon SES
```

`STUDIO_RUNTIME=node` in `.env` makes the Node runtime the default for `npm run dev` on that machine. The deployed Worker is described in `docs/DEPLOYMENT.md`.

## Guards

| Guard                 | Where                      | Effect                                                                                                |
| --------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `STUDIO_SEND_ENABLED` | `server/config.ts`         | Anything but `true` keeps the server in disabled mode; the UI says so.                                |
| Allow-list            | `server/app.ts`            | `SES_ALLOWED_RECIPIENTS` is the only set of addresses that can receive.                               |
| Subject prefix        | `server/app.ts`            | Every test subject starts with `[TEST]`.                                                              |
| Rate limit            | `server/app.ts`            | `STUDIO_SEND_RATE_LIMIT_PER_MINUTE` (default 5), sliding window.                                      |
| HTML size cap         | `server/app.ts`            | 500 KB.                                                                                               |
| Host policy           | `server/app.ts`            | Node: Host and Origin must be localhost (`loopback`). Worker: Origin must equal Host (`same-origin`). |
| Loopback only         | `server/node.ts`           | The Node adapter binds to 127.0.0.1.                                                                  |
| Dry run               | `STUDIO_SEND_DRY_RUN=true` | Full path, no AWS call, `dry-run-N` message ids.                                                      |
| Credentials           | AWS SDK                    | Read by the SDK from `AWS_PROFILE` / `~/.aws` or `AWS_*` env vars; never by this code.                |

## Notes

- Changing `STUDIO_SERVER_PORT` in `.env` is picked up by both the server and the Vite proxy (restart `npm run dev`).
- Do not run Vite with `--host` while the send server is enabled: the proxy would let other machines on your network reach the server (their requests still need a localhost `Origin`, but do not rely on that).
- Requires Node 22.18 or newer (`--env-file-if-exists` and running TypeScript directly).

## Setup

1. Verify a sender identity in SES (an email address or a domain) in the region you will use. Identities are **per region**.
2. While the account is in the SES sandbox, recipients must also be verified identities.
3. Copy `.env.example` to `.env` and fill in:
   - `AWS_PROFILE` and `AWS_REGION` (the region that holds your identities)
   - `SES_FROM_ADDRESS` (a verified identity)
   - `SES_ALLOWED_RECIPIENTS` (comma separated)
4. Run the two processes in two terminals:

```bash
npm run server      # send server, reads .env; prints mode/from/recipients on start
npm run dev:node    # the studio, proxying /api to the send server
```

5. In the studio: select a template, open **Send test email**, check the preflight line (sender verified, sandbox or not), pick a recipient, press **Send test**. The dialog shows the SES message id.

Rehearse without sending: `npm run server:dry-run`.

## Verifying from the command line

```bash
curl -s http://127.0.0.1:8787/api/send-test/status
curl -s -X POST http://127.0.0.1:8787/api/send-test \
  -H 'content-type: application/json' -H 'x-studio-send: 1' \
  -d '{"to":"you@example.com","subject":"Hello","html":"<p>Hi</p>","templateId":"manual"}'
```

## Common SES errors

| Message                          | Meaning / fix                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------- |
| `Email address is not verified`  | From or (in sandbox) To is not a verified identity in that region.                |
| `ExpiredToken` / `NoCredentials` | The AWS profile has no valid credentials; run `aws login` or refresh the profile. |
| `MessageRejected: ... sandbox`   | Request production access in the SES console to send to unverified addresses.     |
| `Throttling`                     | SES send rate exceeded; the server's own limit is separate.                       |

## What this is not

- Not a production sending path. No queue, retries, templates-as-a-service or tracking.
- Not the deployed path. The Cloudflare Worker (`docs/DEPLOYMENT.md`) cannot send until phase 1 of `docs/PLAN.md` replaces the AWS SDK with a Worker-compatible client.
- Not authenticated. It relies on binding to loopback; do not expose the port.
