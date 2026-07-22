# 9Router Fork

A local-first fork of [`decolua/9router`](https://github.com/decolua/9router) focused on practical self-hosted AI routing, API-key model policy, and combo account control.

This repository keeps the core 9Router dashboard and OpenAI-compatible gateway from upstream, while carrying fork-specific changes for stricter access control and easier fork maintenance.

## What This Fork Is

9Router is an OpenAI-compatible routing gateway for AI coding tools and model providers. It sits between clients such as Claude Code, Codex, Cursor, OpenCode, Cline, Continue, Roo, and upstream providers such as Claude, Codex, Kiro, GLM, MiniMax, OpenRouter, and custom-compatible endpoints.

This fork is useful when you want:

- One local/self-hosted gateway for multiple AI clients.
- API keys that only expose the models they are allowed to use.
- Combo fallback lists that can target specific provider accounts.
- A fork workflow that tracks upstream releases without losing local changes.

## How This Fork Differs From Upstream

| Area | Upstream 9Router | This fork |
| --- | --- | --- |
| Project goal | Broad public gateway and dashboard | Local-first fork with stricter access control |
| API keys | General endpoint keys | Keys can restrict visible and usable models |
| Model listing | Broad model catalog by default | `/v1/models` can be filtered by key policy |
| Combos | Ordered fallback model lists | Combo entries can bind to provider accounts with `connectionId` |
| Release flow | Upstream release cadence | Fork releases use tags like `fork-v0.5.40` |

## Current Base

This fork is currently synced with upstream `decolua/9router` **v0.5.40**.

Current fork release:

```text
fork-v0.5.40
```

Fork releases use the upstream version as the base version, then prefix it with `fork-`.

## Features

Core 9Router features retained from upstream:

- OpenAI-compatible `/v1/*` API.
- Web dashboard for providers, aliases, combos, API keys, usage, pricing, and settings.
- Provider routing across OAuth, API-key, free, cheap, subscription, and custom-compatible providers.
- Ordered combo fallback, where one model name can try multiple provider models in sequence.
- Format translation across OpenAI-compatible, Claude, Gemini, Cursor, Kiro, and related provider formats.
- Token-saver support, including RTK-style tool output compression.
- SQLite-backed local persistence under `DATA_DIR`.
- Source and container-based self-hosting.

Fork-specific additions:

- API key `allowedModels` and `blockedModels` policy support.
- Policy-gated `/v1/models` responses for restricted keys.
- Combo-level access checks for restricted API keys.
- Per-model account binding in combos through `connectionId`.
- Repeatable fork sync and release naming conventions.

## Architecture at a Glance

```text
AI client / editor / agent
        |
        | OpenAI-compatible request
        v
9Router API and dashboard
        |
        | auth, model policy, combo resolution, account selection
        v
provider executor / translator
        |
        v
upstream model provider
```

Key code areas:

- `src/app/api/v1/*` and `src/app/api/v1beta/*` — OpenAI-compatible API routes.
- `src/app/api/keys*` — API key lifecycle and policy data.
- `src/app/api/combos*` — combo management.
- `src/sse/handlers/chat.js` — request parsing, combo handling, and account selection.
- `open-sse/` — provider execution, SSE streaming, and request/response translation.

For deeper internals, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Quick Start

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Build and start a production build:

```bash
npm run build
npm run start
```

Useful package scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Next.js dev server. |
| `npm run build` | Build the production app. |
| `npm run start` | Start the built app. |
| `npm run cli:pack` | Build the CLI package. |

## API Key Model Policy

This fork supports model-scoped API keys. A key can be limited to specific models, providers, or combos, so sharing a key does not automatically expose every connected account.

Example policy intent:

- Allow one key to use only `kr/*` models.
- Allow another key to use cheaper fallback providers such as `glm/*` or `minimax/*`.
- Block subscription-backed models from shared keys.
- Keep older unrestricted keys backward compatible.

Policy-related fields include:

- `allowedModels`
- `blockedModels`
- `allowedCombos`
- scopes
- expiration metadata
- last-used metadata

The same policy affects model discovery. When a restricted key calls `/v1/models`, the response should only include models that key is allowed to use.

## Combo Account Binding

Combos remain ordered fallback lists, but this fork can bind a combo entry to a specific provider connection through `connectionId`.

That matters when the same provider has multiple connected accounts with different quotas, subscriptions, or trust levels. Instead of saying “use any account for this provider,” a combo can say “use this model through this exact connection.”

Think of a combo as a route list, and `connectionId` as the specific lane that route should use.

## Fork Sync and Release Flow

This fork tracks upstream through explicit sync branches.

Standard naming:

| Purpose | Pattern | Example |
| --- | --- | --- |
| Sync branch | `sync/upstream-vX.Y.Z` | `sync/upstream-v0.5.40` |
| Backup branch | `backup/master-before-sync-upstream-vX.Y.Z` | `backup/master-before-sync-upstream-v0.5.40` |
| Fork release tag | `fork-vX.Y.Z` | `fork-v0.5.40` |
| Fork release title | `Fork release vX.Y.Z` | `Fork release v0.5.40` |

High-level process:

1. Create a sync branch for the upstream version.
2. Merge upstream into that branch.
3. Build and test the branch.
4. Open a PR into fork `master`.
5. Create a backup branch from pre-merge `origin/master`.
6. Merge the PR.
7. Verify the deployed/runtime environment separately.
8. Publish a fork release tag.
9. Delete the merged sync branch, but keep the backup branch.

## Configuration

Important runtime settings:

| Variable | Purpose |
| --- | --- |
| `DATA_DIR` | App data directory; SQLite lives under this path. |
| `PORT` | App port. |
| `HOSTNAME` | Bind address. |
| `BASE_URL` | Server-side app URL. |
| `NEXT_PUBLIC_BASE_URL` | Browser-visible app URL. |
| `CLOUD_URL` | Cloud sync endpoint base URL. |
| `NEXT_PUBLIC_CLOUD_URL` | Browser-visible cloud sync URL. |
| `REQUIRE_API_KEY` | Require Bearer API keys for `/v1/*` routes. |
| `AUTH_COOKIE_SECURE` | Use secure cookies behind HTTPS. |
| `ENABLE_REQUEST_LOGS` | Enable request/translator logs. |
| `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, `NO_PROXY` | Optional outbound proxy settings. |

Do not commit `.env` files or secrets.

## OpenAI-Compatible API

Chat completions:

```bash
curl http://localhost:20128/v1/chat/completions \
  -H 'Authorization: Bearer your-9router-api-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "your-model-or-combo",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

List models visible to the provided key:

```bash
curl http://localhost:20128/v1/models \
  -H 'Authorization: Bearer your-9router-api-key'
```

For restricted keys, the model list is intentionally filtered by policy.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — request lifecycle, routing, combo fallback, OAuth/token refresh, cloud sync, and data model.
- `docs/PRD-api-key-model-scope.md` — model policy design notes, if present in your checkout.
- Upstream README and docs remain the best source for broad provider setup and public marketing details.

## Upstream Credit

This fork is based on [`decolua/9router`](https://github.com/decolua/9router). Upstream provides the core dashboard, OpenAI-compatible router, provider integrations, token savers, combo routing, translations, and broad setup documentation.

Fork changes are maintained separately for local-first routing and access-control needs. When possible, upstream improvements are merged instead of reimplemented.

## License

MIT, following upstream 9Router. See [`LICENSE`](LICENSE).
