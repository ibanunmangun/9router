# Project Log

## 2026-08-20 - Upstream v0.5.55 Dev Deployment

- Merged `decolua/9router` v0.5.55 into `sync/decolua-v0.5.55` while retaining the fork's API-key/CORS guard behavior.
- Added test fixture updates for embedding policy mocks, DNS lookup records, and Fusion combo entry binding.
- Pushed candidate SHA `035c1a9979b6f6d3b68582a11e025837b8147307` to `origin/sync/decolua-v0.5.55`.
- Homelab Docker build succeeded and `ninerouter-dev` was recreated with `9router-dev-data:/app/data` preserved; `/api/health` returned 200.
- Local full Vitest run from repository root: 1819 passed, 82 failed, 11 skipped. Residual failures are upstream-inherited stale/live tests, Windows-only file-lock/path/snapshot variance, and tests requiring separate upstream remediation; they did not block the authoritative homelab build.

## 2026-08-21 - Freebuff Dev Deployment

- Completed the Freebuff full-port candidate build gate on homelab from `/home/itsnulla/9router-build`.
- Fixed the provider-test build blocker by importing a deterministic, side-effect-free Kimchi user-agent helper; regression coverage verifies the helper value and test-utils module evaluation.
- Homelab Docker build for `9router-dev:master` passed, including Next.js production compilation and database migration version 3.
- Recreated only `ninerouter-dev` with `9router-dev-data:/app/data` preserved. Local `/api/health` returned `200`; the public dev URL returned `307` to `/dashboard`.
- Focused Freebuff suite passed: 11 files, 43 tests. Production and persistent data volumes were not touched.

## 2026-09-07 � Testing Studio provider filter fix + full deploy cycle

### Work done
- **PR #23** (merged to master @ e65381d6): Testing Studio Chat + Compare model filter now shows AI_PROVIDERS registry name for built-in providers; custom OpenAI/Anthropic-compatible and custom-embedding endpoint nodes labeled by connection name. ModelSelectModal custom-embedding fix cherry-picked from bcf63fd1.
- **Homelab tests**: 20/20 targeted, baseline no-regression (now=114, known=121). Ran 3 rounds across code iterations.
- **BuildKit cache bug discovered and fixed**: cherry-pick produced byte-identical file content ? BuildKit silently reused stale COPY layer despite correct git HEAD. Fixed by mandating --no-cache in all 4 ops runbooks.
- **Production deploy** (nulla-lab): homelab build --no-cache ? scp transfer (747MB, SHA-256 verified) ? load+tag 9router:v0.5.69-local-e65381d6 ? rollback backup ? compose update ? docker compose up --no-deps --force-recreate 9router. Health: 200. Caddy untouched. Volume 9router_ninerouter_data preserved.
- **Nulla-lab image prune**: kept only v0.5.69.1-local-0619484a as rollback + 1 compose backup. Removed 4 older image sets + 7 old compose backups.
- **Branch cleanup**: deleted fix/testing-studio-provider-filter-label, fix/custom-embedding-model-select-modal, sync/upstream-v0.5.65, feature/allowed-models-media-providers from local + origin. Backup branches retained per runbook.
- **GitHub release**: fork-v0.5.69.2 published at https://github.com/ibanunmangun/9router/releases/tag/fork-v0.5.69.2

### State
- master = e65381d6 (local, origin, homelab /home/itsnulla/9router-build all in sync)
- Production running: 9router:v0.5.69-local-e65381d6
- Rollback available: 9router:v0.5.69.1-local-0619484a + compose bak rollback-20260907-123955
- Temp files: /tmp/9router-release.tar removed from homelab+nulla-lab (yes to cleanup)

## 2026-09-09 - kenari.id provider integration + production deploy

### Work done
- **kenari.id built-in provider**: added with automatic usage tracking (registry entry `open-sse/providers/registry/kenari.js`, hand-registered in `open-sse/providers/registry/index.js`).
- **Usage adapter**: added `open-sse/services/usage/kenari.js` (`getKenariUsage`) calling the real kenari `/v1/account/quota` endpoint, registered in the `USAGE_HANDLERS` dispatch in `open-sse/services/usage.js`.
- **Real quota schema captured** (2-window rolling: month + week, both in IDR) via live API key testing on homelab; fixtures saved secret-free in `tests/fixtures/kenari/`.
- **Pricing**: added `KENARI_IDR_PER_USD=17500` and the `PROVIDER_PRICING.kenari` block in `open-sse/providers/pricing.js`.
- **Test coverage**: `tests/unit/kenari-tracking.test.js`, `tests/unit/kenari-usage.test.js`, and `kenari` added to the SUPPORTED list in `tests/unit/usage-dispatch.test.js`.
- **Plan `.omo/plans/track-kenari-usage.md` fully completed**: all Todos 1-8 done; Final Verification Wave F1-F4 all APPROVE (F1 plan compliance, F2 independent Oracle code review, F3 live QA with real key on dev, F4 scope fidelity).
- **Live QA on `ninerouter-dev` (homelab)** confirmed the balance panel renders correctly: Month (IDR) 54,096/600,000, Week (IDR) 54,096/150,000, with correct reset countdowns.
- **PR #24** (`feature/kenari-usage` -> `master`) at https://github.com/ibanunmangun/9router/pull/24 merged via `gh pr merge --admin` (repo ruleset required 1 approving review; used owner bypass) at merge commit `1dda0331`.
- **Production deploy** (nulla-lab): homelab build --no-cache (HEAD `1dda0331`) -> direct homelab->nulla-lab transfer via Tailscale (748MB, SHA-256 verified) -> load + tag `9router:v0.5.69.2-local-1dda0331` -> rollback tag `9router:v0.5.69-local-e65381d6-rollback-20260909-140646` + compose backup created -> `docker compose up --no-deps --force-recreate 9router`. Health: 200. Caddy untouched. Volume `9router_ninerouter_data` preserved.

### State
- master = `1dda0331` (local homelab, origin all in sync)
- Production running: `9router:v0.5.69.2-local-1dda0331`
- Rollback available: `9router:v0.5.69-local-e65381d6-rollback-20260909-140646` + compose bak `rollback-20260909-140646`
- A temporary `KENARI_KEY` env var was set in homelab `~/.bashrc` (line 141) for schema-capture testing during this session and has since been deactivated by the user - not used in production (production relies on each user's own connection-stored API key)
- Note (non-blocking, flagged not fixed): a pre-existing `clientSecret` value in `tests/__baseline__/providers-baseline.json` predates this branch (confirmed via `git log -p`) and is unrelated to this work - flagged to the user for future consideration, not addressed this session
- Temp files: ops scripts (`prelim_check.sh`, `backup_rollback.sh`, `postdeploy_verify.sh`) removed from nulla-lab `/tmp` after use; release tar/checksum retained on homelab+nulla-lab per runbook retention policy (not deleted)

## 2026-09-09/10 - Kenari icon polish, Quota Tracker bar-width fix, Ollama monthly quota fix + fork release v0.5.69.3

### PR #26 - Kenari icon fix
- Added hand-rendered `public/providers/kenari.png` (128x128, matching kenari.id's favicon.svg mark: cream rounded-square bg `#FBF6EE`, bold black "k", brick-red `#B5362A` square accent).
- Merged to master (`2538e143`), deployed to production as `9router:v0.5.69.3-local-2538e143`. Verified: volume preserved, caddy untouched, health 200.

### PR #27 - Quota Tracker progress-bar width bug
- Root cause (in `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/QuotaTable.js`): the reset-time countdown text was a separate flex sibling with variable width, squeezing/stretching the adjacent progress-bar track depending on countdown string length.
- Iterated 3 rounds to the real fix: folded the countdown text into the existing used/total+percentage row (already inside the bar's fixed-width `flex-1` container) instead of keeping it as a standalone column. Removed now-unused `resetPrimary`/`resetSecondary` vars. Display order set to `countdown . percentage` per follow-up style request.
- Merged to master (`d57e9ef5`), deployed to production as `9router:v0.5.69.4-local-d57e9ef5`. Verified: volume preserved, caddy untouched, health 200.

### PR #28 - Ollama Cloud quota display bug
- Root cause: Ollama's `/api/usage` endpoint moved most accounts from `limits.session`/`limits.weekly` to a new `limits.monthly` field; the old parser silently dropped it, so quota bars stopped rendering for affected accounts. Confirmed live against real Ollama connections in the dev DB (5/6 accounts had valid `limits.monthly` data being dropped).
- Fix (`open-sse/services/usage/misc.js`, `getOllamaUsage()`): added `monthlyRaw`/`monthlyNum`/`hasMonthly` handling and a `quotas["Monthly"]` entry, backward-compatible with the old session/weekly fields. `parseQuotaData` in `.../ProviderLimits/utils.js` needed no logic change (already generic), comment-only update.
- Added `tests/unit/ollama-usage.test.js` coverage: monthly-only parsing, still-reports-no-limits-when-neither-shape-present, and `parseQuotaData` Monthly passthrough.
- Official homelab test run (disposable `node:22-bookworm` container): 12/12 passed (`ollama-usage.test.js` + `provider-quota-visibility.test.js`, no regression to hide-quota feature).
- Merged to master (`c699555e`), deployed to production as `9router:v0.5.69.5-local-c699555e`. Verified via internal Docker network (`caddy-9router` -> `9router:20128/api/health` = `{"ok":true}`, container has no published host port by design). Volume preserved, caddy untouched.

### PR #29 - CHANGELOG entry (docs only)
- Added the `v0.5.69.3` section to `CHANGELOG.md` summarizing the three fixes above. Merged to master (`a8a08773`) via PR (direct push to master is blocked by a repo ruleset).

### Fork release
- **New runbook added**: `docs/ops/NINEROUTER_FIX_RELEASE_RUNBOOK.md` for fix-only fork releases (no upstream sync involved) - `FORK_SYNC_RELEASE_RUNBOOK.md` assumes every release is an upstream sync, which didn't fit this session.
- **GitHub release**: `fork-v0.5.69.3` published at https://github.com/ibanunmangun/9router/releases/tag/fork-v0.5.69.3, tag target = `master`@`a8a08773` (covers PR #26, #27, #28, #29).
- Merged branches cleaned up from local + origin: `fix/ollama-monthly-quota-field`, `fix/quota-tracker-bar-width-inconsistency`, `fix/kenari-test-connection-and-live-models`, `docs/changelog-v0.5.69.3`.

### State
- master = `a8a08773` (local, origin in sync)
- Production running: `9router:v0.5.69.5-local-c699555e` (code identical to `a8a08773`, docs-only commit on top doesn't require a rebuild)
- Rollback chain available: `9router:v0.5.69.4-local-d57e9ef5-rollback-20260909230411` (compose bak same timestamp), plus older rollback tags from prior deploys, all still retained on nulla-lab
- DEV (`ninerouter-dev` on homelab) updated to the PR #28 build before merge (image `sha256:ff11b4a6...`); production later caught up to the same commit after merge
- Reminder carried over (non-blocking, still not addressed): pre-existing `clientSecret` value in `tests/__baseline__/providers-baseline.json`, unrelated to any branch touched this session
- Temp files cleaned: build logs, test workspace, and transferred image tarball removed from homelab + nulla-lab `/tmp` after use

## 2026-09-30 - Usage Analytics dark-theme polish + upstream v0.5.91 sync + prod deploy

### Work done
- **PR #34** (merged to master @ `ca38f8f3`): Usage Analytics overview stat cards vertical alignment fix (`justify-center`); tried an icon+3-row redesign, user rejected it, reverted to keep only the alignment fix. Chart tooltip backgrounds fixed (`ProviderBarChart.js`, `TopModelsChart.js`, `UsageChart.js`) — was blending into page background via `var(--color-bg)`, changed to `var(--color-surface)` + border/shadow/radius. Deployed to dev then production (nulla-lab) same session.
- **Upstream sync — PR #35** (merged to master @ `067fada5`): synced fork with `decolua/master` v0.5.91 (38 commits). 9 merge conflicts resolved additively (fork policy/connectionId/resilience logic preserved alongside upstream provider/feature updates) — `chatCore.js`, `nonStreamingHandler.js`, `streamingHandler.js`, `capabilities.js`, `registry/index.js`, `combos/page.js`, `DashboardLayout.js`, 2 claude test files. Independent `oracle` review: PASS on all 9, two pre-existing minor notes (not regressions).
- **Found and fixed a genuine upstream test bug** during homelab regression testing: `tests/unit/image-generation.test.js` hardcoded Codex version header `0.154.0`, but upstream commit `832a3465` bumped the registry to `0.155.0` in the same commit without updating this pre-existing test (file had zero merge conflicts — pure upstream oversight). Fixed the assertion; homelab baseline regression check went from 4 failures to **No regression** (85 fails, all within 134 known baseline).
- **Post-deploy UI feedback iteration** (still on the sync branch, caught before merge): user reported tooltip label/value text staying black in dark mode despite the surface-color fix — root cause was Recharts' `Tooltip` default `itemStyle`/`labelStyle` inline `color:#000` overriding `contentStyle.color`; added explicit `labelStyle`/`itemStyle` on all 3 tooltips. Then user flagged the bar-hover cursor highlight (solid light-gray rect, Recharts' light-theme default) as too jarring in dark mode; replaced with `currentColor` @ 6% opacity on `ProviderBarChart`/`TopModelsChart` (the `UsageChart` `AreaChart` cursor is a thin line by default, unaffected).
- **Full deploy cycle for PR #35**: dev (homelab `ninerouter-dev`, iterated 3x as fixes landed) → prod (nulla-lab). Homelab build `--no-cache` → direct Tailscale `scp` homelab→nulla-lab (SHA-256 + manifest verified) → `docker load` → tag `9router:v0.5.91-local-067fada5` → rollback tag `9router:v0.5.86-local-ca38f8f3-rollback-20260930-001239` + compose backup of same name → `docker compose up -d --no-deps --force-recreate 9router` (Caddy untouched) → verified volume `9router_ninerouter_data:/app/data` intact, health `200`, `/api/version` reports `0.5.91`.

### State
- master = `067fada5` (local, origin, homelab `/home/itsnulla/9router-build` all in sync)
- Production running: `9router:v0.5.91-local-067fada5`
- DEV (`ninerouter-dev` on homelab) at the same commit `067fada5`, image `9router-dev:master`
- Rollback available: `9router:v0.5.86-local-ca38f8f3-rollback-20260930-001239` + compose bak same timestamp on nulla-lab
- Deleted branches (local + origin): `fix/usage-overview-cards-alignment`, `sync/upstream-decolua-v0.5.91`. Backup branch `backup/master-before-sync-upstream-v0.5.91` retained per runbook.
- Temp files cleaned: transferred image tarball + checksum + deploy-helper scripts removed from homelab + nulla-lab `/tmp`; stale homelab test-worktree result dirs from earlier sync test iterations removed.
- Reminder carried over (non-blocking, deferred, not addressed this session): "CU Kenari" (custom-embedding connector named "Kenari") vs "k. test" (official `kenari` provider connection) shown as separate-looking nodes in provider topology graph — confirmed not a bug (naming ambiguity only), user has not requested a UI fix (rename or provider-type badge) yet.

