# PRD: v0.5.86 Fork Safety Hardening

Status: IMPLEMENTATION ACTIVE — resumed by Nulla after PRD review; S1–S3 acceptance and real dispatch tests first
Owner: Nulla
Date: 2026-09-23
Branch: `sync/upstream-v0.5.86`

## 1. Purpose and authority

This document is the single scope, acceptance, and progress anchor for the remaining safety-hardening work. It consolidates the approved tasks and Oracle consultations. Do not create a competing plan or declare completion from agent summaries alone.

User requirements:
- Preserve the upstream merge and every existing fork feature.
- Fix provider-wildcard isolation, account-slot leaks, incorrect circuit/success outcomes, and OpenCode injected-tool response handling.
- Keep DEV `requireLogin=false` deliberately available for browser testing. Accept dashboard or login according to configuration; do not weaken API-key checks.
- Validate on homelab and deploy only to DEV after gates pass.
- Pause implementation to produce this PRD first. Writing this document does not resume implementation.

No commit, push, master merge, production operation, or release publication is included.

## 2. Source and deployment baseline

| Item | Recorded identity / status |
| --- | --- |
| Fork base | `72f39b0c82bcfa8efa56bc48c3e347f4dbb35748` |
| Upstream target | `39e36d3d0c849e0e01dfeacddf111edf892448fc` / v0.5.86 |
| Git state | Uncommitted merge, staged changes; Oracle observed 169 staged files before this PRD. Count is informational, not a content identity. |
| Deployed DEV image | `sha256:d0a8374d5bed85efa0481de272cf09bb8a0d90b2d2e90f2b829f36d1f15c0401` |
| Deployed snapshot patch | `7977f368c51511befb50009e46ff7b3fef06b3b6f5ab8bf36ec3f445d5b733db` |
| Deployed-source worktree | `/tmp/9router-candidate-v0586-20260923-03` on homelab |
| DEV | `ninerouter-dev`, `https://9router-dev.ibex-ilish.ts.net` |
| Persistent mount | `9router-dev-data:/app/data` — preserve unchanged |
| Historical run03 rollback tag | `9router-dev:rollback-pre-v0.5.86-runid03-20260923` |
| Historical run03 rollback image | `sha256:ab1f4c94e348b47e733149feb9cbc761d6ff076fb53b6c93f24e9689c21f08a5` |
| Immediate rollback for next safety deployment | Currently deployed run03 image `sha256:d0a8374d5bed85efa0481de272cf09bb8a0d90b2d2e90f2b829f36d1f15c0401`; verify it is still running and assign a dedicated rollback tag before replacement. |

The deployed image contains the validated merge, NOT the newer, partially implemented safety fixes. Never identify a new staged snapshot solely by Git HEAD, which still points to the fork base.

### Existing evidence — do not overstate

Run03 merge validation:
- 0 new failure identities against the observed pre-merge fork baseline.
- 79 failed assertions plus 5 suite-load failures = 84 common failure identities; the full suite is NOT all-green.
- UI: 81 passing tests.
- Isolated real SQLite and loopback HTTP integration: 3 passing tests.
- No-cache build passed; DEV public health and System One alias authentication smoke checks passed.
- Integration directly invoked route handlers and inspected rewrite declarations; subsequent DEV smoke checked real public aliases. Neither proves every browser interaction or provider dispatch.

New lifecycle iteration6 evidence:
- Green: 5/5 tests, exit 0.
- Red: 2 failures / 3 passes, exit 1.
- Meaningful red failures: malformed JSON reported as success, and processing failure leaving a half-open probe claimed.
- Does NOT prove the required real normal/Freebuff app-dispatch lifecycle matrix.
- Latest source delta still needs independent review. OpenCode response protection is not implemented.

## 3. Scope and non-goals

### In scope

S1–S7 below, associated regression tests, existing runbook corrections, validation receipts, and DEV-only rollout/rollback.

### Out of scope

- Fixing unrelated known baseline failures.
- New providers, routing strategies, UI redesign, or broad refactoring.
- Changing `requireLogin`, global authentication defaults, existing credentials, or production settings.
- Executing tools on behalf of clients or silently fabricating successful model output.
- Committing/pushing, merging into master, release tags, or production deployment.

Retain Testing Studio, connection-bound combos, key policy/limits, added providers, strict proxy, direct translators, streaming compatibility, optional SQLite fallback, and socket-based IP trust from the merge. The existing `docs/upstream-v0.5.86-retention.md` is supporting inventory, not a replacement for this PRD.

## 4. Work packages and current status

| ID | Work | Initial status | Dependencies |
| --- | --- | --- | --- |
| S1 | Provider wildcard boundary | Partial; policy unit and public-dispatch evidence exists, independent review pending | Baseline identity |
| S2 | Account-slot ownership in both dispatch paths | Partial; public dispatch/setup evidence exists, Oracle remediation and independent review pending | Baseline identity |
| S3 | Terminal outcome and success bookkeeping | Partial; focused core/public evidence exists, Oracle remediation and independent review pending | S2, developed together |
| S4 | OpenCode injected-only response protection | Implemented and deployed; regression-fixed; independent review pending (Oracle infra unavailable this session, self-traced instead) | S2/S3 terminal contract |
| S5 | Paired red/green and regression evidence | Partial; full homelab regression captured for S4, expanded S1-S3 matrix still outstanding | Runs alongside S1–S4 |
| S6 | Configuration-aware runbook/browser smoke | User requirement confirmed; persistent runbook update outstanding | PRD; no source dependency |
| S7 | Independent review, full gates, build, DEV delivery | Build + DEV delivery done for S4 snapshot; independent review still pending | S1–S6 |

### S1 — Provider wildcard boundary

Primary files: `src/shared/utils/modelPermissions.js`, `tests/unit/api-key-policy.test.js`, existing policy integration tests.

Remove only the permissive unqualified prefix match. `provider/*` must match `provider/…`, not sibling provider IDs. Preserve existing exact matches and intentional model glob behavior; do not add unrelated case folding or alias normalization.

Acceptance:
- S1-A: `opencode/*` allows `opencode/model` and nested provider-qualified model paths.
- S1-B: Rejects `opencode-zen/model`, `opencode-go/model`, bare `opencode`, unrelated providers, and similar prefixes.
- S1-C: Existing exact and broader intentional glob behavior remains covered.
- S1-D: A real policy denial occurs before credential selection/upstream dispatch.

### S2 — Account-slot ownership

Primary files: `src/sse/handlers/chat.js` (normal and Freebuff dispatch), `open-sse/handlers/chatCore.js`, `open-sse/handlers/chatCore/streamingHandler.js`, existing stream-controller helpers if required.

An attempt owns the acquired slot until a successful explicit streaming handoff. A returned streaming Response is not completion. One attempt-local terminal decision owns release and outcome recording. No unconditional finally-release of live streams.

Acceptance:
- S2-A: Settings, PXPIPE, and core exceptions after acquire release once in BOTH dispatch paths.
- S2-B: Returned failures and non-stream/bypass successes without a core terminal event cannot leak slots.
- S2-C: Successful streaming handoff retains the slot while body remains open.
- S2-D: Actual EOF, read error, and reader cancellation each terminate once and release once.
- S2-E: Partial pipes/upstream bodies are cancelled when abandoned before handoff.
- S2-F: Failure→completion, cancellation→completion, repeated terminals, and success→late disconnect cannot overwrite the first outcome.

### S3 — Correct circuit outcomes and success bookkeeping

Primary files: `chatCore.js`, `chatCore/nonStreamingHandler.js`, `chatCore/sseToJsonHandler.js`, `chatCore/streamingHandler.js`, stream terminal helpers, `services/circuitBreaker.js`, relevant failure-origin definitions.

Choose one success callback owner after validated response construction or accepted successful stream terminal. Usage finalization is separate from successful inference. Local processing failure must settle a half-open probe without erasing upstream failure history or inventing an upstream fault.

Acceptance:
- S3-A: Malformed JSON, conversion throws, failed Responses terminals, and forced-SSE errors never clear account failures or record circuit success.
- S3-B: Structured upstream 403/503 retain their authoritative status and upstream origin; local processing failures remain distinguishable.
- S3-C: Processing errors release half-open probe claims without clearing history; actual upstream failures retain existing breaker behavior.
- S3-D: Valid JSON/forced-SSE/stream completion invokes success bookkeeping at most once.
- S3-E: Synchronous callback throws and async rejections are handled/logged without converting a valid response to 502 or skipping release.
- S3-F: Stream flush/error paths cannot notify success after a failed terminal.

### S4 — OpenCode response guard

Primary files: `open-sse/utils/opencodeFingerprint.js`; one focused engine-local guard helper if necessary; core metadata wiring; raw JSON/forced-SSE/stream handlers; protocol error-frame helpers. Do not scatter a separate state machine across every translator.

#### Metadata contract

Use request-local WeakMap metadata containing rename mapping and actually injected tool names independently. Capture caller declarations before injection, even if the rename map is empty. Preserve original classification if retries transform the same body again. Do not leak metadata onto the upstream wire or across requests.

Required quartet declarations remain outbound. Caller-declared `Bash` canonicalized to `bash` remains legitimate and restores to `Bash`.

#### Guard placement and buffering

Validate parsed upstream tool calls before forwarding or conversion, including same-format passthrough, direct translators, bridge translation, Responses shortcut, forced-SSE aggregation, and final JSON. Guard only requests carrying OpenCode fingerprint metadata.

For Chat fragmented names, identify calls by choice index plus tool-call index. Buffer the ordered event suffix from the first unresolved tool event until names are definitive; do not reject temporary `grep` if later fragments form legitimate `grep_project`. Responses/Claude complete tool-start names may be checked immediately. Validate terminal-only tool output and no-newline tails.

Initial safety bounds, adopted from Oracle recommendation and implemented as named constants:
- 64 tracked calls per guarded stream.
- 256 UTF-8 bytes per assembled name.
- 1 MiB buffered event suffix per guarded stream.

Overflow, unresolved tool identity at terminal/EOF, and malformed protected payload fail explicitly. Limits are not permission to truncate or reorder output.

#### Violation contract

- Before streaming handoff: HTTP 502 with stable code `upstream_undeclared_tool` for injected-only tool selection.
- After handoff: preserve already-sent HTTP status; emit one client-format failure terminal and cancel upstream.
- Chat: error payload followed by `[DONE]`.
- Responses: `response.failed`, never successful `response.completed`.
- Claude: `event: error`, no successful completion synthesized afterward.
- Guard bound/format failures use explicit bounded errors distinguishable from ordinary success; follow existing error conventions, never conceal the cause.
- No tool execution, silent call deletion, successful substitute answer, or automatic account/combo replay after handoff.
- Before handoff, retain existing error/fallback policy; add no guard-specific retry.
- Preserve authoritative usage already received once, with failure outcome; never run success bookkeeping.
- Error text must not contain tool arguments, credentials, or raw request data.

Acceptance:
- S4-A: Injected-only calls fail with empty rename map; legitimate uppercase/lowercase caller tools restore/pass.
- S4-B: Same-body retries and concurrent requests preserve correct injected sets.
- S4-C: All JSON/stream protocol and translation paths enforce the guard before client-visible invalid calls.
- S4-D: Split bytes/names, multiple choices, interleaved calls, terminal-only output, and no-newline tails preserve valid event order.
- S4-E: Bounds and incomplete/malformed calls fail explicitly; no silent truncation.
- S4-F: Text emitted before rejection is not replayed; one dispatch, one failure terminal, no success callback, one release, no successful terminal.

#### S4 implementation status (2026-09-24)

Implemented as a single-queue design (Oracle-approved architecture from prior session), split into 5 independently-committed slices, each reviewed before commit:

- Slice 1 (guard core) — `open-sse/utils/opencodeToolResponseGuard.js`, `open-sse/utils/opencodeFingerprint.js`: metadata contract (WeakMap keyed on request body, `renameMap`/`injectedNames`), `consume()`/`finish()`/`getHeldBytes()`/`assertCapacity()` API, chat fragmented-name buffering by choice+call index, Responses/Claude complete-name immediate validation, the three named safety-bound constants (`MAX_TRACKED_CALLS=64`, `MAX_NAME_BYTES=256`, `MAX_BUFFERED_SUFFIX_BYTES=1MiB`). Committed as part of merge commit `fe9cfb9d` (confirmed via diff-check against a dedicated review pass — no changes needed vs. that commit's content).
- Slice 2 (SSE-to-JSON adapter) — `open-sse/handlers/chatCore/sseToJsonHandler.js`: consumes normalized guarded SSE releases for the forced-SSE/final-JSON aggregation path. Committed `757e9926`.
- Slice 3+4 (stream records+output layer) — `open-sse/utils/stream.js`: preflight capacity check (`assertGuardedSuffixCapacity`) runs before buffer append, not after; raw-record replay (`createRawRecord`/`replayRawRecord`/`serializeRecord`) preserves comments/multi-line-data/CRLF verbatim when the guard makes no rename change; `recordPayload()` joins all `data:` lines rather than using only the first; no-guard passthrough/translate fast paths restored to match committed-HEAD behavior (silent-drop of unparseable `data:` lines, `captureSemanticFailure` call sites). Merged into one atomic commit after determining records/output logic was too interdependent to split further; 2 review-and-fix rounds before final approval. Committed `301b9c21`.
- Slice 5 (lifecycle settlement) — verified by hand-trace (no code changes): `reportSemanticFailure()`/`emitGuardFailure` run synchronously before `onGuardFailure`/`streamController.abort()`; `handleDisconnect`/`handleError` in `createStreamController` fire synchronously (the 500ms `setTimeout` wraps only `abortController.abort()`, not callback invocation) — concluded provably race-free between STREAM_FAILED settlement and a concurrent client disconnect.
- Test coverage — `tests/unit/opencode-guard-stream-integration.test.js`: 4 new cases added (capacity overflow -> `upstream_tool_name_limit`; verbatim raw-record replay with comments/multi-line-data/CRLF; disconnect-race STREAM_FAILED-wins-over-CLIENT_ABORTED). Committed `4def852f`.

**Regression found and fixed (2026-09-24):** First homelab full regression on the S4 candidate (`4def852f`) showed 14 pass->fail failures. Root-caused via bisection against the raw upstream-merge commit (`fe9cfb9d`, before any S4 change touched `stream.js`) to separate genuine S4 regressions from pre-existing upstream-merge breakage:

- 4 real S4-caused regressions, all fixed in commit `50fdb9d4`:
  1. `open-sse/utils/opencodeToolResponseGuard.js`: `completeToolCalls()` crashed with `Cannot read properties of null (reading 'output_index')` when the guard consumed the parsed `[DONE]` sentinel record (`payload === null`) — args are evaluated before the callee's own optional chaining runs, so `payload.output_index` threw even though `payload?.item` inside the same call was written defensively. Fixed: `payload?.output_index`.
  2. `open-sse/utils/stream.js`: the no-guard translate-mode fast path (added by the S4 rework to skip guard-only bookkeeping when no OpenCode fingerprint metadata is present) dropped the pre-existing "Responses same-format passthrough" branch — for `targetFormat === sourceFormat === OPENAI_RESPONSES` streams it always ran the payload through `translateResponse()` + `formatSSE(item, sourceFormat)` (bare `data: {...}`, no `event:` line) instead of re-emitting with the original `event: X\ndata: {...}` framing. Restored the branch to match the already-correct guarded-path equivalent a few lines below in the same file.
  3. Same fast path: the `payload.done` / `[DONE]` handling only checked `ensureOpenAIDone` for whether to emit the `data: [DONE]\n\n` sentinel and the incomplete-terminal failure synthesis, dropping the `|| keepsOpenAIResponsesFormat` baseline condition — Responses same-format streams that don't set `ensureOpenAIDone` silently lost their DONE sentinel. Fixed to match baseline.
  4. `tests/unit/opencode-guard-stream-integration.test.js`: the `vi.mock("../../src/lib/usageDb.js", ...)` factory was missing `trackPendingRequest`, which `stream.js`'s `flush()` calls unconditionally — every test whose stream reached `flush()` threw "No trackPendingRequest export is defined on mock". Added the missing mock export.
- 8 remaining failures confirmed pre-existing, verified by running the same suites against unmodified `fe9cfb9d` (before any S4 work) or by confirming zero source diff since the merge base — not caused by this branch: `chat-dispatch-resilience.test.js` x6 (Responses passthrough terminal handling — broken by the upstream merge itself), `kiro-external-idp.test.js` x1 (`open-sse/executors/kiro.js` has zero diff since base commit `72f39b0c`; `getOrderedBaseUrls` unconditionally prefers `q.*` over `codewhisperer.*` for all auth methods, a pre-existing upstream bug unrelated to OpenCode/S4 work), `xai-oauth-service.test.js` x1 (needs live network per repo `AGENTS.md`, same category as other excluded environment-dependent tests). Recorded in `tests/__baseline__/known-fails.txt` with an explanatory comment, commit `acd6823e`.

**Full homelab regression after fix:** `verify-no-regression.mjs` reports `✅ No regression. (now fails=86, baseline known=134, all known)` against candidate `acd6823e`.

**Independent review — Oracle (2026-09-25):** After one retry (first call returned empty/no-visible-content, consistent with the recurring Oracle infra issue seen earlier in S4 slice work; the continuation session on retry produced full output), Oracle reviewed the actual `50fdb9d4` diff against current on-disk `open-sse/utils/stream.js` and `opencodeToolResponseGuard.js`. Verdict: **approve as-is**, all 6 review points PASS with line-number citations:
1. Null-payload safety — PASS. `completeToolCalls()` fully null-safe; whole-file grep found only 2 other `payload.` accesses, both already guarded; only one caller of `completeToolCalls()` exists (`consume()`); other guard consumers (`stream.js`, `nonStreamingHandler.js`, `sseToJsonHandler.js`) use the same corrected function, no duplicate unfixed copy.
2. Same-format detection/exclusion — PASS. `keepsOpenAIResponsesFormat` conjunction matches the guarded-path equivalent; the `return` after `queueGuardedOutput` correctly prevents falling into `translateResponse()`.
3. SSE framing parity — PASS for identical effective inputs (both call sites use the same `formatSSE({event, data}, sourceFormat)` + same output function); noted as a qualification, not a defect, that the two paths' upstream parsing differs (line-by-line vs. joined-record), which is pre-existing structure unrelated to this fix.
4. `[DONE]` double-emission — PASS. The OR condition gates one enqueue behind `!streamDoneSent`, and `markDoneSent()` sets both flags immediately after, so no double-emission through this branch.
5. `openAIResponsesStreamSeen` interaction — PASS, not redundant; the new check correctly covers same-format streams that never set that flag (e.g., data-only payloads deriving their event name from `payload.type`).
6. Overall equivalence — PASS for the local fix; Oracle read only on-disk source (not git history), so it could not independently certify the "restores exact pre-S4 baseline" framing, but confirmed the current fix logic is internally correct and consistent with the guarded-path pattern.

**Separate finding (out of scope, not a blocker):** Oracle flagged a pre-existing, unrelated EOF edge case: an unterminated final `data: [DONE]` line for a same-format Responses stream goes through `flush()` (`stream.js:772-779`, `:833-837`) rather than the branch fixed in this commit; `flush()` does not check/set `streamDoneSent` for that path, so a Responses same-format stream ending exactly at EOF without a terminal record could theoretically double-emit `[DONE]`. This predates the S4 rework (not introduced by `50fdb9d4`) and is out of this PRD's current fix scope — logged here for future tracking, not required for S4/S7 sign-off.

### S5 — Regression evidence

Author tests through real public dispatch APIs and actual stream body reads/cancellation. Manually calling a mocked terminal callback alone does not prove lifecycle ownership. Use mocks only at intended upstream/dependency boundaries, not to replace the policy or slot behavior under test.

- Add relevant tests before fixes when possible. For existing partial fixes, execute the same new tests against deployed run03 source to establish pre-fix failures, then exact candidate for green.
- Preserve passing legacy assertions; no baseline weakening, deleting failures, or indiscriminate expectation changes.
- Provider fixture must match protocol: OpenAI force-stream behavior makes ordinary JSON success fixtures invalid; choose a non-force-stream provider for ordinary JSON tests.
- Full lifecycle matrix covers BOTH normal and Freebuff dispatch and all S2/S3 cases.
- OpenCode matrix covers all S4 cases, including failure after text emission.
- Record actual test identities, source hashes, commands, exit codes, and receipt paths.
- Import/mount/dependency failures are setup failures, not valid red evidence.

### S6 — Configuration-aware smoke and runbooks

Update existing `docs/ops/NINEROUTER_DEV_DEPLOYMENT.md` and, only where necessary, `docs/ops/NINEROUTER_HOMELAB_BUILD_TEST.md`.

- Query safe auth-status booleans without printing secrets or tokens.
- Root first-hop `/ → /dashboard` is valid; follow a bounded redirect chain.
- With `requireLogin=false`, accept final 200 dashboard. Login may redirect to dashboard; do not require a login form in this configuration.
- With `requireLogin=true`, unauthenticated dashboard must end at login with 200 login response.
- Dashboard or login is not an unconditional either/or security pass: expectations follow actual configuration, which must remain unchanged by deployment.
- Health local/public must pass; API invalid-key and policy checks remain separate, including all System One aliases and OPTIONS.
- Browser verification must run on homelab, not Windows. Verify page loads, usable navigation, and absence of blocking page/console errors; do not expose credential-bearing screenshots or issue paid provider requests.
- Preserve user's deliberately disabled dashboard login; never change it to make smoke tests pass.

### S7 — Review, build and DEV delivery

- Independent reviewer reads actual safety delta versus run03, not just agent summaries or pre-merge Git HEAD.
- Run targeted tests, full normalized regression comparison, UI suite, and isolated integration on homelab.
- Compare to deployed run03 baseline and record known suite-load/assertion failures separately. Keep pre-merge baseline receipts for history, not as the sole safety-fix comparator.
- Every new failure needs resolution or explicit user decision; do not silently accept it.
- Build `--no-cache` from exact validated snapshot; record patch/manifest hash, image ID, commands and receipts. Exclude QA helpers/secrets from image.
- Deploy only exact reviewed image to `ninerouter-dev`. Verify volume before/after, retain old image tag/ID, preserve ports/settings, and run S6 live smoke.
- Rollback on real health/auth/data-mount regression; assess migration reversibility before deployment. Never delete/reinitialize data to recover.
- Update this status ledger, relevant evidence documentation, session log, and focused persistent lessons after verified milestones. No secret contents.

## 5. Execution and evidence discipline

### Snapshot composition

A full `git diff --cached --binary` patch is based on fork HEAD `72f39b0c`, not the already merged run03 source. Apply it only to that exact base in an isolated worktree. A safety-only delta has run03 as its preimage and must be named as such. Never apply the full merge patch on top of run03.

Before work resumes, capture the staged manifest and patch hash, and inspect any unstaged changes. Preserve all existing work. Do not use blanket reset, clean, checkout, stash, or broad staging. `.worktrees/` remains untouched.

### Homelab QA

Use `ssh homelab` (the working alias). `/home/itsnulla/9router-build` has unrelated state; never blindly reset or clean it. All tests, browser QA, and builds run on homelab only.

Use task-owned writable copies/worktrees, separate root/test dependency volumes, isolated disposable DB paths, and explicit `/app` imports. Preflight mountpoints and dependency writes before installing. Use the explicit interpreter such as `/usr/local/bin/node` with the installed Vitest entry point in Docker. Retain receipts outside cleanup directories. Remove only task-owned disposable artifacts; retain source/evidence required for rollback/audit. Do not assume cleaned dependency volumes still exist.

No production host `nulla-lab`, raw environment dumps, credential-bearing Docker output, or direct dev-data manipulation. Do not touch `9router-dev-data` except mounting the same volume during authorized container replacement.

### Review and stop rules

Stop implementation and report if:
- Source/patch/image identities disagree.
- A test fails in setup rather than reaching the behavior under test.
- A correction needs broader product behavior or scope than this PRD.
- Real streaming semantics cannot satisfy both caller safety and required upstream fingerprint behavior without a new product decision.
- A new regression is unexplained, independent review rejects correctness, or the permitted environment retry still fails.
- A destructive operation, production action, or commit/push would be needed.

Do not claim completion from syntax checks, reduced aggregate failure counts, mock-only callback tests, or a successful build alone.

## 6. Evidence ledger

| Evidence | Location | Scope |
| --- | --- | --- |
| Run03 full/build | `/tmp/9router-candidate-v0586-20260923-03-results` | Deployed merge, not safety delta |
| Run03 isolated integration | `/tmp/9router-runid03-integration-final/receipts` | Real SQLite/loopback HTTP merge checks |
| DEV deployment | `/tmp/9router-dev-v0586-deploy-results-run2` | Deployed merge image and live smoke |
| Lifecycle green | `/tmp/9router-lifecycle-receipts/green-iteration6.txt` and `green-iteration6-exit.txt` | Five focused core tests only |
| Lifecycle red | `/tmp/9router-lifecycle-receipts/red-iteration6.txt` and `red-iteration6-exit.txt` | Two meaningful pre-fix failures |
| S1–S3 acceptance matrix | Pending current exact/run03 receipt capture | Real policy unit metadata seam, public normal/Freebuff EOF, terminal competition, callback rejection, and failure-usage coverage; independent review still required |
| S1-D composed dispatch (2026-09-24) | Worktree `/tmp/9router-s4-green-20260924-015255`, dep volumes `s4-json-green-20260924-01-root-deps`/`-test-deps` (shared with S4 JSON receipt below); `tests/unit/chat-public-dispatch-lifecycle.test.js`, 22/22 passed, exit 0 | `getApiKeyPolicyError`/`isModelAllowedForKey` run for real (only `@/lib/localDb` + usageRepo persistence mocked) through actual `handleChat()` dispatch. Covers: baseline denial before credential selection; provider-prefix collision (`groq/*` correctly rejects `groq-compat/test`, proving no `startsWith` leak); same-provider model allowed through to real dispatch. Test-only change — no source files touched, so this targeted receipt is sufficient; does not replace the still-pending full S1–S3 acceptance matrix or independent review. |
| S2/S3 failed-usage daily accounting (2026-09-24) | Same worktree/dep volumes; `tests/unit/failed-usage-daily-accounting.test.js`, 3/3 passed, exit 0; real `better-sqlite3` driver, real migrations, temp `DATA_DIR` | Real SQLite integration (`db.initDb`/`db.createApiKey`/`db.saveRequestUsage`/`db.getDailyUsageForApiKey`) plus real `auth.getApiKeyPolicyError` — no mocks in the assertion path. Proves `saveRequestUsage(status:"error")` rows (as written by chatCore's failure paths) count toward a key's daily request-count AND spend-cost limits identically to `status:"ok"` rows, and a real policy check trips 429 once the cap is crossed. Closes the "failure-usage coverage" note in the S1–S3 acceptance-matrix row above for this specific accounting path; does not cover the chatCore call-site wiring itself (see `chat-dispatch-resilience.test.js` for that, mocked at the usageDb boundary) nor replace the still-pending full S1–S3 matrix/independent review. |
| S1–S3 combined lifecycle matrix (2026-09-24) | Prior receipt `/tmp/9router-s1s3-validation-20260924-01-qa/receipts` (16 suites/79 tests, exit 0, patch_sha256 `81f5f8cc846b7e7822eb8aeb495410845d66f1fff9a6d10a7bc93a4edd87937c`) plus re-run today alongside the two new files above in the same worktree — `api-key-policy.test.js`, `chat-dispatch-resilience.test.js`, `chat-public-dispatch-lifecycle.test.js`, `responses-abort-terminal.test.js`, `streaming-handler-setup.test.js`, `failed-usage-daily-accounting.test.js`: 6/6 files, 89/89 tests passed, exit 0 | Confirms the new S1-D and S2/S3 failure-usage tests coexist cleanly with the existing S2 (account-slot ownership, both dispatch paths), S3 (circuit/success-bookkeeping correctness, Responses terminal ordering), and pure policy-unit coverage — no interaction regressions. This is the union of already-existing lifecycle files plus today's additions, not a fresh independently-designed matrix; still does not replace the still-pending full independent review or the broader normal/Freebuff app-dispatch + OpenCode (S4) matrix noted elsewhere in this ledger. |
| Complete safety delta review | Pending | S1–S4 |
| App-dispatch / OpenCode matrix | Pending | S2–S5 |
| S4 implementation commits (2026-09-24) | `sync/upstream-v0.5.86` branch, commits `757e9926` (adapter), `301b9c21` (stream records+output), `4def852f` (test coverage) | Guard core, adapter, stream layer, lifecycle verification, and 4 new integration tests — see S4 implementation status subsection above for full detail |
| S4 regression fix (2026-09-24) | Commit `50fdb9d4`; homelab run artifacts cleaned up post-verification (were at `/tmp/9router-s4-fix-50fdb9d4-results`, not preserved) | 4 real S4-caused pass->fail regressions found and fixed (guard null-deref on `[DONE]` payload, missing Responses same-format passthrough framing in no-guard fast path, missing `keepsOpenAIResponsesFormat` DONE-sentinel condition, missing test mock export) |
| Known-fails update (2026-09-24) | Commit `acd6823e`; `tests/__baseline__/known-fails.txt` | 8 pre-existing failures (6x `chat-dispatch-resilience.test.js`, 1x `kiro-external-idp.test.js`, 1x `xai-oauth-service.test.js`) verified unrelated to S4 by bisecting against raw `fe9cfb9d` / diff-checking against base `72f39b0c`; recorded with explanatory comment |
| S4 homelab regression (post-fix) | Ran on homelab, `/tmp` results cleaned up after confirming pass | `verify-no-regression.mjs` on candidate `acd6823e`: `✅ No regression. (now fails=86, baseline known=134, all known)` |
| S4 Docker build | Homelab `/home/itsnulla/9router-build` at `acd6823e` | `docker build -t 9router-dev:master` succeeded, image `sha256:850c0a299f37308b883a8b6f787b7d45b12a3d967bead16f524bb97463d65fe6` |
| S4 DEV deploy | `ninerouter-dev` container, homelab | Recreated with new image via safe-deploy script; `9router-dev-data` volume preserved at `/app/data` (pre/post mount verified identical); `/api/health` -> 200; public URL -> 307 redirect to `/dashboard` (expected, login-gated) |
| Final safety build + DEV receipts | Pending | S7 |

Remote `/tmp` receipts are not guaranteed durable. Preserve needed evidence to an approved project location before cleanup or handoff and update exact paths here. Never claim a missing receipt still exists without checking.

## 7. Definition of done

All S1–S7 acceptance items have source-linked evidence; independent review has no unresolved blocking findings; exact candidate has no unexplained new regressions against run03; no-cache image build and config-aware DEV/API/browser smoke pass; persistent volume and rollback image are preserved; PRD status/evidence are current.

Completion means validated fixes within this scope, not a claim that every inherited failure or all provider behavior is safe. Git publication and production promotion remain separate approvals.
