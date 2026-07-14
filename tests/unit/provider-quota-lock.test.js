import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getProviderConnections: vi.fn(),
  updateProviderConnection: vi.fn(),
}));

vi.mock("@/lib/localDb", () => ({
  getProviderConnections: mocks.getProviderConnections,
  updateProviderConnection: mocks.updateProviderConnection,
  validateApiKey: vi.fn(),
  getSettings: vi.fn(),
  getProxyPools: vi.fn(),
  getApiKeyMetadata: vi.fn(),
  touchApiKey: vi.fn(),
}));

// Avoid picking up network/proxy configs by mocking it out entirely
vi.mock("@/lib/network/connectionProxy", () => ({
  resolveConnectionProxyConfig: vi.fn().mockResolvedValue({}),
  pickProxyPoolId: vi.fn().mockReturnValue(null)
}));

import { markAccountUnavailable } from "../../src/sse/services/auth.js";
import { MODEL_LOCK_ALL } from "../../open-sse/services/accountFallback.js";
import { MAX_RATE_LIMIT_COOLDOWN_MS } from "../../open-sse/config/errorConfig.js";

describe("Account-Wide Quota Lock via resetsAtMs", () => {
  const connectionId = "conn_123";
  const provider = "test_provider";
  const model = "test/model-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProviderConnections.mockResolvedValue([
      { id: connectionId, backoffLevel: 0, testStatus: "active" }
    ]);
  });

  it("applies per-model lock for transient 429 without resetsAtMs", async () => {
    const status = 429;
    const errorText = "Rate limited";

    const result = await markAccountUnavailable(connectionId, status, errorText, provider, model, null);

    expect(result.shouldFallback).toBe(true);
    expect(mocks.updateProviderConnection).toHaveBeenCalledWith(
      connectionId,
      expect.objectContaining({
        [`modelLock_${model}`]: expect.any(String), // The specific model is locked
        testStatus: "unavailable"
      })
    );
    // Ensure MODEL_LOCK_ALL is NOT set
    const updateCall = mocks.updateProviderConnection.mock.calls[0][1];
    expect(updateCall[MODEL_LOCK_ALL]).toBeUndefined();
  });

  it("applies per-model lock for quota exhaustion without explicit resetsAtMs", async () => {
    const status = 403;
    const errorText = "Quota exceeded";

    const result = await markAccountUnavailable(connectionId, status, errorText, provider, model, null);

    expect(result.shouldFallback).toBe(true);
    expect(mocks.updateProviderConnection).toHaveBeenCalledWith(
      connectionId,
      expect.objectContaining({
        [`modelLock_${model}`]: expect.any(String) // Currently per-model fallback applies
      })
    );
    const updateCall = mocks.updateProviderConnection.mock.calls[0][1];
    expect(updateCall[MODEL_LOCK_ALL]).toBeUndefined();
  });

  it("applies account-wide lock when resetsAtMs is provided with quota exhaustion", async () => {
    const status = 403;
    const errorText = "Usage limit reached";
    // 5 hours in the future
    const resetsAtMs = Date.now() + 5 * 3600 * 1000;

    const result = await markAccountUnavailable(connectionId, status, errorText, provider, model, resetsAtMs);

    expect(result.shouldFallback).toBe(true);
    expect(mocks.updateProviderConnection).toHaveBeenCalledWith(
      connectionId,
      expect.objectContaining({
        [MODEL_LOCK_ALL]: expect.any(String) // The whole account is locked
      })
    );
    // Ensure specific model lock is NOT set instead of account lock
    const updateCall = mocks.updateProviderConnection.mock.calls[0][1];
    expect(updateCall[`modelLock_${model}`]).toBeUndefined();
  });

  it("trusts provider resetsAtMs above MAX_RATE_LIMIT_COOLDOWN_MS for quota exhaustion", async () => {
    const status = 403;
    const errorText = "Usage limit reached";
    // 5 hours in the future (exceeds 30 min MAX_RATE_LIMIT_COOLDOWN_MS)
    const resetsAtMs = Date.now() + 5 * 3600 * 1000;

    const result = await markAccountUnavailable(connectionId, status, errorText, provider, model, resetsAtMs);

    expect(result.cooldownMs).toBeGreaterThan(MAX_RATE_LIMIT_COOLDOWN_MS);
    expect(result.cooldownMs).toBeCloseTo(5 * 3600 * 1000, -2);
  });
});
