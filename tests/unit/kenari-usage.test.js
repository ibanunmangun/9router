// kenari usage — NO-KEY subset only (Todo 8).
// Quota fetch / getKenariUsage / usage-dispatch tests are DEFERRED to when
// Todo 5/6 unblock (no non-shared `kn-` API key available yet). Do NOT add
// kenari to usage-dispatch.test.js until then — it would hit the
// unsupported-provider message and fail.
import { describe, it, expect } from "vitest";

import {
  getPricingForModel,
  KENARI_IDR_PER_USD,
  MODEL_PRICING,
} from "../../open-sse/providers/pricing.js";
import { isValidModel } from "../../src/shared/constants/models.js";
import { parseModel } from "../../open-sse/services/model.js";
import { getModelUpstreamId } from "../../open-sse/config/providerModels.js";

describe("kenari pricing conversion (IDR micro-units → USD/1M)", () => {
  it("converts seeded kenari models from the PROVIDER_PRICING.kenari override", () => {
    // Exact values computed in Todo 7: microIdrPer1M / 1_000_000 / KENARI_IDR_PER_USD.
    expect(KENARI_IDR_PER_USD).toBe(17500);

    expect(getPricingForModel("kenari", "step-3-7-flash")).toEqual({
      input: 0.24,
      output: 1.371429,
      cached: 0.048,
    });
    expect(getPricingForModel("kenari", "glm-5-3-flash")).toEqual({
      input: 0.000857,
      output: 0.002857,
      cached: 0.000143,
    });
    expect(getPricingForModel("kenari", "gemini-2-5-flash-lite")).toEqual({
      input: 0.022857,
      output: 0.097143,
      cached: 0.002286,
      cache_creation: 0.02,
    });
    expect(getPricingForModel("kenari", "gpt-oss-120b")).toEqual({
      input: 0.036,
      output: 0.2,
      cached: 0.0036,
    });
  });

  it("falls through to canonical MODEL_PRICING for a model absent from the kenari override", () => {
    // gpt-4o-mini is not in PROVIDER_PRICING.kenari but is in MODEL_PRICING —
    // proves the canonical (2nd) fallback tier.
    const pricing = getPricingForModel("kenari", "gpt-4o-mini");
    expect(pricing).not.toBeNull();
    expect(pricing).toEqual(MODEL_PRICING["gpt-4o-mini"]);
  });

  it("falls through to PATTERN_PRICING for a model absent from both the kenari override and MODEL_PRICING", () => {
    // gemini-9-flash is not in PROVIDER_PRICING.kenari nor MODEL_PRICING, but
    // matches the "gemini-*-flash" glob in PATTERN_PRICING — proves the
    // pattern (3rd) fallback tier.
    expect(getPricingForModel("kenari", "gemini-9-flash")).toEqual({
      input: 0.3,
      output: 2.5,
      cached: 0.03,
      reasoning: 3.75,
      cache_creation: 0.3,
    });
  });

  it("returns null for a synthetic model matching neither canonical nor pattern", () => {
    expect(getPricingForModel("kenari", "kenari-nonexistent-synthetic-model-xyz")).toBeNull();
  });

  it("regression guard: unrelated gh override is untouched by the kenari block", () => {
    expect(getPricingForModel("gh", "gpt-5.3-codex")).toEqual({
      input: 1.75,
      output: 14,
      cached: 0.175,
      reasoning: 14,
      cache_creation: 1.75,
    });
  });
});

describe("kenari passthrough routing", () => {
  it("routes a nested unseeded model id through the passthroughModels flag", () => {
    // kenari's registry entry sets passthroughModels: true, so isValidModel
    // accepts any model id — including nested vendor-prefixed ids that are
    // not among the 4 seeded models.
    expect(isValidModel("kenari", "vendor/new-model")).toBe(true);
    // Seeded models remain valid too.
    expect(isValidModel("kenari", "step-3-7-flash")).toBe(true);
  });

  it("contrast: a non-passthrough provider rejects the same unseeded id", () => {
    // groq has no passthroughModels flag and does not list vendor/new-model,
    // proving the passthrough behavior is specific to the kenari entry.
    expect(isValidModel("groq", "vendor/new-model")).toBe(false);
  });

  it("routes a nested unseeded model id to the upstream unchanged", () => {
    // Plan line 133: kenari/vendor/new-model → upstream vendor/new-model.
    // parseModel splits on the first slash and resolves the provider segment
    // (kenari's alias === id, so no alias rewrite).
    expect(parseModel("kenari/vendor/new-model")).toEqual({
      provider: "kenari",
      model: "vendor/new-model",
      isAlias: false,
      providerAlias: "kenari",
    });
    // getModelUpstreamId is what decides the model string sent upstream. kenari
    // has no registry entry for vendor/new-model, so findModel returns undefined
    // and the fallback returns the base id unchanged — passthrough at the
    // routing layer, distinct from the isValidModel validation-layer test above.
    expect(getModelUpstreamId("kenari", "vendor/new-model")).toBe("vendor/new-model");
  });
});
