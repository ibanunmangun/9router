# Learnings â€” track-kenari-usage

Conventions, patterns, and successful approaches discovered during work on this plan.

_Auto-scaffolded by /start-work. Append new entries below - never overwrite._

---

## Todo 4 — Public endpoint capture (2026-09-09)

- Both endpoints are live and truly public (no auth): GET /v1/models -> 200 (76 models), GET /api/public/pricing -> 200 (76 items, top-level keys: free_tier, items, usd_idr_rate=17500).
- kenari pricing unit is micro-IDR per 1M tokens (NOT USD). Field names in pricing.json items: price_in_micro_idr_per_1m, price_out_micro_idr_per_1m, price_cached_micro_idr_per_1m, price_cache_write_micro_idr_per_1m. models.json embeds the same numbers under pricing.{input,output,cache_read,cache_write} with unit:"micro_idr_per_1m_tokens", currency:"IDR". null = dimension not offered (most models have cache_write:null).
- pricing.json also carries market_in/market_out_micro_idr_per_1m (market reference) and pricing_lines[] with {billable, endpoint, micro_idr, unit, variant} — unit can be token_1m, image, second, 1k_chars for non-chat models.
- Seed ids confirmed in BOTH fixtures for Todo 1 registry: step-3-7-flash, glm-5-3-flash, gemini-2-5-flash-lite, gpt-oss-120b.
- GOTCHA: kenari.id serves an HTML SPA catch-all for unknown GET paths — every bogus GET returns 200 text/html (incl. /api/public/does-not-exist). Real non-200 only via method mismatch (POST/DELETE -> 405). The fetch layer must validate Content-Type/JSON.parse, not just HTTP status.
- Windows shell note: curl.exe spawn fails with uv_spawn in this environment; node fetch works fine.
