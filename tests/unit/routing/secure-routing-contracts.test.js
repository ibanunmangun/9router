import { describe, expect, it } from "vitest";

import { getProxyBucketIdentity } from "../../../src/lib/network/connectionProxy.js";
import {
  ROUTING_CONTRACT_VERSION,
  classifyQuotaObservation,
  createConnectionRef,
  createProxyBucketRef,
  createRoutingId,
  getRoutingReasonCode,
  validateRouteDecisionProjection,
} from "../../../src/sse/contracts/secureRouting.js";

const PRIVACY_SALT = "synthetic-test-privacy-salt";
const RAW_CONNECTION_ID = "synthetic-connection-42";
const RAW_PROXY_BUCKET = "pool:synthetic-pool-a";

function createValidInput() {
  return {
    schemaVersion: 1,
    requestId: "req_0123456789ABCDEFGHJKMNPQRS",
    routeDecisionId: "rtd_0123456789ABCDEFGHJKMNPQRS",
    terminalOutcome: "succeeded",
    reasonCode: "dispatch.succeeded",
    attempts: [
      {
        attemptId: "att_0123456789ABCDEFGHJKMNPQRS",
        rawConnectionId: RAW_CONNECTION_ID,
        rawProxyBucketIdentity: RAW_PROXY_BUCKET,
        outcome: "succeeded",
        reasonCode: "dispatch.succeeded",
        quotaState: "finite_available",
      },
    ],
  };
}

describe("secure routing baseline characterization", () => {
  it("pins existing raw proxy identities as derivation inputs only", () => {
    expect(getProxyBucketIdentity({ source: "none" })).toBe(
      "direct:33e6c764b686eabe5d36ef42",
    );
    expect(getProxyBucketIdentity({ source: "pool", proxyPoolId: "pool-a" })).toBe(
      "pool:pool-a",
    );
    expect(
      getProxyBucketIdentity({
        source: "legacy",
        connectionProxyEnabled: true,
        connectionProxyUrl: "http://proxy.invalid:8080",
        connectionNoProxy: "localhost",
      }),
    ).toMatch(/^legacy:[a-f0-9]{24}$/);
    expect(getProxyBucketIdentity({ source: "error" })).toBeNull();
  });
});

describe("secure routing identity boundary", () => {
  it("derives stable pseudonyms without retaining raw connection or pool IDs", () => {
    expect(ROUTING_CONTRACT_VERSION).toBe(1);
    expect(createRoutingId("request", "stable-seed")).toBe(
      createRoutingId("request", "stable-seed"),
    );
    expect(createRoutingId("routeDecision", "stable-seed")).toMatch(/^rtd_[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(createRoutingId("attempt", "stable-seed")).toMatch(/^att_[0-9A-HJKMNP-TV-Z]{26}$/);

    const connectionRef = createConnectionRef(RAW_CONNECTION_ID, PRIVACY_SALT);
    const proxyBucketRef = createProxyBucketRef(RAW_PROXY_BUCKET, PRIVACY_SALT);
    expect(connectionRef).toMatch(/^conn_[a-f0-9]{24}$/);
    expect(proxyBucketRef).toMatch(/^pxy_[a-f0-9]{24}$/);
    expect(proxyBucketRef).toBe(createProxyBucketRef(RAW_PROXY_BUCKET, PRIVACY_SALT));
    expect(`${connectionRef}${proxyBucketRef}`).not.toContain(RAW_CONNECTION_ID);
    expect(`${connectionRef}${proxyBucketRef}`).not.toContain("synthetic-pool-a");
    expect(proxyBucketRef).not.toBe(RAW_PROXY_BUCKET);
  });
});

describe("secure routing observable scenarios", () => {
  it.each([
    ["request accepted", "requestAccepted", "request.accepted"],
    ["policy denial", "policyDenied", "policy.denied"],
    ["capability mismatch", "capabilityUnsupported", "capability.unsupported"],
    ["account unavailable", "accountUnavailable", "account.unavailable"],
    ["stale quota", "quotaStale", "quota.stale"],
    ["open circuit", "circuitOpen", "circuit.open"],
    ["capacity exhausted", "capacityExhausted", "capacity.exhausted"],
    ["proxy unresolved", "proxyUnresolved", "proxy.unresolved"],
    ["dispatch failure", "dispatchFailed", "dispatch.failed"],
    ["stream aborted", "streamAborted", "stream.aborted"],
    ["fallback exhausted", "fallbackExhausted", "fallback.exhausted"],
    ["observability dropped", "observabilityDropped", "observability.dropped"],
  ])("maps %s to %s", (_label, scenario, expectedReason) => {
    expect(getRoutingReasonCode(scenario)).toBe(expectedReason);
  });

  it.each([
    ["provider has no quota adapter", { supported: false }, "unsupported"],
    ["adapter yielded no observation", { supported: true, observed: false }, "unavailable"],
    ["cached observation expired", { supported: true, observed: true, stale: true }, "stale"],
    ["credential lookup failed", { error: "credential" }, "credential_error"],
    ["provider quota call failed", { error: "provider" }, "provider_error"],
    ["observation is estimated", { estimated: true }, "estimated"],
    ["provider declares unlimited quota", { unlimited: true }, "unlimited"],
    ["finite quota is exhausted", { remaining: 0, limit: 100 }, "finite_exhausted"],
    ["finite quota remains", { remaining: 1, limit: 100 }, "finite_available"],
    ["contract observation is malformed", { remaining: "bad", limit: 100 }, "unavailable"],
  ])("classifies %s", (_label, observation, expectedState) => {
    expect(classifyQuotaObservation(observation)).toBe(expectedState);
  });
});

describe("secure route-decision projection", () => {
  it("constructs a new deeply immutable plain projection", () => {
    const input = createValidInput();
    const projection = validateRouteDecisionProjection(input, { privacySalt: PRIVACY_SALT });

    expect(projection).not.toBe(input);
    expect(projection.attempts).not.toBe(input.attempts);
    expect(projection.attempts[0]).not.toBe(input.attempts[0]);
    expect(Object.getPrototypeOf(projection)).toBe(Object.prototype);
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(projection.attempts)).toBe(true);
    expect(Object.isFrozen(projection.attempts[0])).toBe(true);
    expect(projection.attempts[0]).toEqual({
      attemptId: input.attempts[0].attemptId,
      connectionRef: createConnectionRef(RAW_CONNECTION_ID, PRIVACY_SALT),
      proxyBucketRef: createProxyBucketRef(RAW_PROXY_BUCKET, PRIVACY_SALT),
      outcome: "succeeded",
      reasonCode: "dispatch.succeeded",
      quotaState: "finite_available",
    });
    expect(JSON.stringify(projection)).not.toContain(RAW_CONNECTION_ID);
    expect(JSON.stringify(projection)).not.toContain(RAW_PROXY_BUCKET);

    input.reasonCode = "dispatch.failed";
    input.attempts[0].rawConnectionId = "changed-after-validation";
    expect(projection.reasonCode).toBe("dispatch.succeeded");
    expect(projection.attempts[0].connectionRef).toBe(
      createConnectionRef(RAW_CONNECTION_ID, PRIVACY_SALT),
    );
    expect(() => { projection.reasonCode = "dispatch.failed"; }).toThrow();
    expect(() => { projection.attempts[0].connectionRef = RAW_CONNECTION_ID; }).toThrow();
  });

  it.each([
    ["requestId", "Bearer synthetic-sensitive-value"],
    ["routeDecisionId", "http://proxy.invalid/private"],
    ["terminalOutcome", "cookie=synthetic-sensitive-value"],
    ["reasonCode", "synthetic-raw-connection-id"],
  ])("rejects a raw sensitive value in root string field %s", (field, value) => {
    expect(() => validateRouteDecisionProjection(
      { ...createValidInput(), [field]: value },
      { privacySalt: PRIVACY_SALT },
    )).toThrow();
  });

  it.each([
    ["attemptId", "Bearer synthetic-sensitive-value"],
    ["outcome", "http://proxy.invalid/private"],
    ["reasonCode", "cookie=synthetic-sensitive-value"],
    ["quotaState", "synthetic-raw-connection-id"],
  ])("rejects a raw sensitive value in attempt string field %s", (field, value) => {
    const input = createValidInput();
    input.attempts[0][field] = value;
    expect(() => validateRouteDecisionProjection(input, { privacySalt: PRIVACY_SALT })).toThrow();
  });

  it("rejects pre-shaped or raw proxy and connection projection fields", () => {
    const input = createValidInput();
    input.attempts[0] = {
      ...input.attempts[0],
      connectionRef: "conn_0123456789abcdef01234567",
      proxyBucketRef: "pool:raw-pool-id",
    };
    expect(() => validateRouteDecisionProjection(input, { privacySalt: PRIVACY_SALT })).toThrow(/not allowed/i);
  });

  it("rejects contradictory root and attempt outcomes", () => {
    expect(() => validateRouteDecisionProjection(
      { ...createValidInput(), terminalOutcome: "succeeded", reasonCode: "dispatch.failed" },
      { privacySalt: PRIVACY_SALT },
    )).toThrow(/outcome and reasonCode disagree/i);

    const input = createValidInput();
    input.attempts[0].outcome = "succeeded";
    input.attempts[0].reasonCode = "dispatch.failed";
    expect(() => validateRouteDecisionProjection(input, { privacySalt: PRIVACY_SALT })).toThrow(/outcome and reasonCode disagree/i);
  });

  it("rejects malformed schema, invalid state, absent salt, and extra sensitive fields", () => {
    expect(() => validateRouteDecisionProjection(null, { privacySalt: PRIVACY_SALT })).toThrow(/plain object/i);
    expect(() => validateRouteDecisionProjection({ ...createValidInput(), schemaVersion: 0 }, { privacySalt: PRIVACY_SALT })).toThrow(/schemaVersion/i);

    const invalidState = createValidInput();
    invalidState.attempts[0].quotaState = "fresh_unknown";
    expect(() => validateRouteDecisionProjection(invalidState, { privacySalt: PRIVACY_SALT })).toThrow(/quotaState/i);
    expect(() => validateRouteDecisionProjection(createValidInput())).toThrow(/privacySalt/i);
    expect(() => validateRouteDecisionProjection({ ...createValidInput(), token: "synthetic-sensitive-value" }, { privacySalt: PRIVACY_SALT })).toThrow(/not allowed/i);
  });

  it("rejects custom serialization and accessor inputs before reading values", () => {
    const customSerialization = createValidInput();
    customSerialization.toJSON = () => ({ token: "synthetic-sensitive-value" });
    expect(() => validateRouteDecisionProjection(customSerialization, { privacySalt: PRIVACY_SALT })).toThrow(/not allowed/i);

    const accessorInput = createValidInput();
    Object.defineProperty(accessorInput, "reasonCode", {
      enumerable: true,
      get() { return "dispatch.succeeded"; },
    });
    expect(() => validateRouteDecisionProjection(accessorInput, { privacySalt: PRIVACY_SALT })).toThrow(/accessor is not allowed/i);

    const attemptAccessor = createValidInput();
    Object.defineProperty(attemptAccessor.attempts[0], "rawConnectionId", {
      enumerable: true,
      get() { return RAW_CONNECTION_ID; },
    });
    expect(() => validateRouteDecisionProjection(attemptAccessor, { privacySalt: PRIVACY_SALT })).toThrow(/accessor is not allowed/i);
  });
});
