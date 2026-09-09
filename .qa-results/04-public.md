# Todo 4 — Public endpoint capture QA

Wave 0 of `track-kenari-usage`. No auth, no API key, no dependencies. Runs first.

## Fixtures captured (real live responses, fetched 2026-09-09)

| File | Source | Models/items |
| --- | --- | --- |
| `tests/fixtures/kenari/models.json` | `GET https://kenari.id/v1/models` | 76 models |
| `tests/fixtures/kenari/pricing.json` | `GET https://kenari.id/api/public/pricing` | 76 items |

Both bodies saved verbatim (pretty-printed, content untouched).

## HTTP status checks

| Request | Status |
| --- | --- |
| `GET https://kenari.id/api/public/pricing` | **200** |
| `GET https://kenari.id/v1/models` | **200** |
| `GET https://kenari.id/api/public/does-not-exist` (bogus path) | 200 — SPA catch-all, returns `text/html` (see `04-malformed.txt`) |
| `POST https://kenari.id/api/public/pricing` | **405** (real non-200 evidence) |
| `POST https://kenari.id/v1/models` | **405** |

## Pricing field names + unit (kenari's OWN schema — do NOT force-map to 9router internal names yet; that is Todo 7)

### `pricing.json` — per-item fields (unit: **micro-IDR per 1,000,000 tokens**)

| Field | Meaning | Unit |
| --- | --- | --- |
| `model` | model id (matches `models.json[].id`) | — |
| `provider` | upstream provider slug | — |
| `free` | bool, free tier flag | — |
| `price_in_micro_idr_per_1m` | **input** price | micro-IDR / 1M tokens |
| `price_out_micro_idr_per_1m` | **output** price | micro-IDR / 1M tokens |
| `price_cached_micro_idr_per_1m` | **cache-read** price | micro-IDR / 1M tokens |
| `price_cache_write_micro_idr_per_1m` | **cache-write** price | micro-IDR / 1M tokens |
| `image_micro_idr_per_image` | image price (non-chat) | micro-IDR / image |
| `market_in_micro_idr_per_1m` / `market_out_micro_idr_per_1m` | market reference prices | micro-IDR / 1M tokens |
| `pricing_lines[]` | granular lines: `{billable, endpoint, micro_idr, unit, variant}` | micro-IDR per `unit` (`token_1m`, `image`, `second`, `1k_chars`) |
| `endpoints`, `input_modalities`, `output_modalities`, `subscriber_only`, `sunset_at` | metadata | — |

Top-level: `free_tier` (daily/rpm limits, `threshold_idr`), `usd_idr_rate: 17500`.

### `models.json` — per-model pricing object (same unit)

`pricing: { input, output, cache_read, cache_write, currency: "IDR", free, unit: "micro_idr_per_1m_tokens" }` — `null` means "not offered" (e.g. `cache_write: null` on most models). `pricing_lines[]` mirrors the same billable dimensions.

## Seed model ids for Todo 1 (registry entry `open-sse/providers/registry/kenari.js`)

Confirmed present in BOTH `models.json` and `pricing.json` (verified programmatically). Small, clearly-priced chat models:

| Model id | input | output | cache_read | cache_write |
| --- | --- | --- | --- | --- |
| `step-3-7-flash` | 4,200,000,000 | 24,000,000,000 | 840,000,000 | null |
| `glm-5-3-flash` | 15,000,000 | 50,000,000 | 2,500,000 | null |
| `gemini-2-5-flash-lite` | 400,000,000 | 1,700,000,000 | 40,000,000 | 350,000,000 |
| `gpt-oss-120b` | 630,000,000 | 3,500,000,000 | 63,000,000 | null |

(All values micro-IDR per 1M tokens.)

## JSON.parse verification

```
node -e "JSON.parse(require('fs').readFileSync('tests/fixtures/kenari/models.json'))"  → exit 0
node -e "JSON.parse(require('fs').readFileSync('tests/fixtures/kenari/pricing.json'))" → exit 0
```

Both parse cleanly (exit 0). See `04-malformed.txt` for the failure-path proof that the parse step rejects garbage.
