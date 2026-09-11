import { createHash, randomUUID } from "node:crypto";

/** Version of the server-side chat-routing observability contract. */
export const ROUTING_CONTRACT_VERSION = 1;

/** Terminal states for one route decision or attempt. */
export const TERMINAL_OUTCOMES = Object.freeze([
  "succeeded",
  "failed",
  "aborted",
  "exhausted",
  "rejected",
  "partial",
]);

/** States accepted from the future shared server-side quota domain. */
export const QUOTA_OBSERVATION_STATES = Object.freeze([
  "finite_available",
  "finite_exhausted",
  "unlimited",
  "unsupported",
  "unavailable",
  "stale",
  "credential_error",
  "provider_error",
  "estimated",
]);

/** Stable reason-code namespaces. Codes carry no provider messages or payload data. */
export const ROUTING_REASON_FAMILIES = Object.freeze([
  "request",
  "policy",
  "capability",
  "account",
  "quota",
  "circuit",
  "capacity",
  "proxy",
  "dispatch",
  "stream",
  "fallback",
  "observability",
]);

/** Sanitized reason codes allowed in serializable route projections. */
export const ROUTING_REASON_CODES = Object.freeze([
  "request.accepted",
  "request.invalid",
  "policy.allowed",
  "policy.denied",
  "capability.supported",
  "capability.unsupported",
  "account.selected",
  "account.unavailable",
  "account.credential_error",
  "quota.finite_available",
  "quota.finite_exhausted",
  "quota.unlimited",
  "quota.unsupported",
  "quota.unavailable",
  "quota.stale",
  "quota.credential_error",
  "quota.provider_error",
  "quota.estimated",
  "circuit.allowed",
  "circuit.open",
  "circuit.half_open_probe",
  "capacity.admitted",
  "capacity.exhausted",
  "capacity.aborted",
  "proxy.resolved",
  "proxy.unresolved",
  "dispatch.started",
  "dispatch.succeeded",
  "dispatch.failed",
  "dispatch.aborted",
  "stream.completed",
  "stream.failed",
  "stream.aborted",
  "fallback.continued",
  "fallback.exhausted",
  "fallback.no_eligible_candidate",
  "observability.recorded",
  "observability.dropped",
  "observability.invalid_projection",
]);

/** Observable chat-routing scenarios mapped to their sanitized reason codes. */
export const ROUTING_SCENARIO_REASON_CODES = Object.freeze({
  requestAccepted: "request.accepted",
  policyDenied: "policy.denied",
  capabilityUnsupported: "capability.unsupported",
  accountUnavailable: "account.unavailable",
  quotaStale: "quota.stale",
  circuitOpen: "circuit.open",
  capacityExhausted: "capacity.exhausted",
  proxyUnresolved: "proxy.unresolved",
  dispatchFailed: "dispatch.failed",
  streamAborted: "stream.aborted",
  fallbackExhausted: "fallback.exhausted",
  observabilityDropped: "observability.dropped",
});

/** Returns the frozen sanitized reason for an observable routing scenario. */
export function getRoutingReasonCode(scenario) {
  const reasonCode = ROUTING_SCENARIO_REASON_CODES[scenario];
  if (!reasonCode) throw new TypeError(`Unsupported routing scenario: ${scenario}`);
  return reasonCode;
}

/**
 * Ownership boundaries prevent contract consumers from becoming routing truth.
 * Runtime resilience remains process-local; quota normalization belongs to one
 * shared server domain; persistence stores sanitized descriptive history only.
 */
export const ROUTING_OBSERVABILITY_OWNERSHIP = Object.freeze({
  liveRoutingGates: "existing_process_local_resilience_modules",
  quotaTruth: "shared_server_quota_domain",
  routeHistory: "sanitized_descriptive_projection",
  dashboardRole: "read_only_consumer",
});

const ID_PREFIXES = Object.freeze({ request: "req", routeDecision: "rtd", attempt: "att" });
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ID_PATTERNS = Object.freeze({
  requestId: /^req_[0-9A-HJKMNP-TV-Z]{26}$/,
  routeDecisionId: /^rtd_[0-9A-HJKMNP-TV-Z]{26}$/,
  attemptId: /^att_[0-9A-HJKMNP-TV-Z]{26}$/,
});
const CONNECTION_REF_PATTERN = /^conn_[a-f0-9]{24}$/;
const PROXY_BUCKET_REF_PATTERN = /^pxy_[a-f0-9]{24}$/;
const ROOT_INPUT_FIELDS = new Set([
  "schemaVersion",
  "requestId",
  "routeDecisionId",
  "terminalOutcome",
  "reasonCode",
  "attempts",
]);
const ATTEMPT_INPUT_FIELDS = new Set([
  "attemptId",
  "rawConnectionId",
  "rawProxyBucketIdentity",
  "outcome",
  "reasonCode",
  "quotaState",
]);
const TERMINAL_REASONS = Object.freeze({
  succeeded: ["dispatch.succeeded", "stream.completed"],
  failed: ["dispatch.failed", "stream.failed"],
  aborted: ["dispatch.aborted", "stream.aborted", "capacity.aborted"],
  exhausted: ["fallback.exhausted", "capacity.exhausted", "quota.finite_exhausted"],
  rejected: ["request.invalid", "policy.denied", "fallback.no_eligible_candidate"],
  partial: ["observability.dropped", "stream.failed", "stream.aborted"],
});
const ATTEMPT_REASONS = Object.freeze({
  succeeded: ROUTING_REASON_CODES.filter((code) => /\.(?:accepted|allowed|supported|selected|finite_available|unlimited|admitted|resolved|started|succeeded|completed|recorded)$/.test(code)),
  failed: ROUTING_REASON_CODES.filter((code) => /\.(?:credential_error|provider_error|failed|invalid_projection)$/.test(code)),
  aborted: ["capacity.aborted", "dispatch.aborted", "stream.aborted"],
  exhausted: ["quota.finite_exhausted", "capacity.exhausted", "fallback.exhausted"],
  rejected: ROUTING_REASON_CODES.filter((code) => /\.(?:invalid|denied|unsupported|unavailable|stale|estimated|open|unresolved|no_eligible_candidate)$/.test(code)),
  partial: ["circuit.half_open_probe", "fallback.continued", "observability.dropped"],
});

function digest(value) {
  return createHash("sha256").update(value).digest();
}

function digestRef(namespace, rawValue, privacySalt) {
  if (typeof rawValue !== "string" || rawValue.length === 0) {
    throw new TypeError(`${namespace} source must be a non-empty string`);
  }
  if (typeof privacySalt !== "string" || privacySalt.length === 0) {
    throw new TypeError("privacySalt must be a non-empty string");
  }
  return createHash("sha256")
    .update(`${ROUTING_CONTRACT_VERSION}\0${namespace}\0${privacySalt}\0${rawValue}`)
    .digest("hex")
    .slice(0, 24);
}

function toCrockford(bytes, length) {
  let value = BigInt(`0x${bytes.toString("hex")}`);
  let encoded = "";
  while (encoded.length < length) {
    encoded = CROCKFORD[Number(value & 31n)] + encoded;
    value >>= 5n;
  }
  return encoded.slice(-length);
}

/**
 * Creates an opaque stable-format routing identifier. Supplying the same seed
 * reproduces an ID for tests/imports; omitted seeds use cryptographic entropy.
 */
export function createRoutingId(kind, seed = randomUUID()) {
  const prefix = ID_PREFIXES[kind];
  if (!prefix) throw new TypeError(`Unsupported routing ID kind: ${kind}`);
  return `${prefix}_${toCrockford(digest(`${ROUTING_CONTRACT_VERSION}:${kind}:${seed}`), 26)}`;
}

/** Creates a non-reversible, deployment-scoped reference for a raw connection ID. */
export function createConnectionRef(connectionId, privacySalt) {
  return `conn_${digestRef("connection", connectionId, privacySalt)}`;
}

/** Creates a non-reversible reference from the existing raw proxy bucket identity. */
export function createProxyBucketRef(rawProxyBucketIdentity, privacySalt) {
  return `pxy_${digestRef("proxy-bucket", rawProxyBucketIdentity, privacySalt)}`;
}

/**
 * Classifies an already-shaped contract observation. Provider adapter
 * normalization remains owned by Todo 8 and is intentionally absent here.
 */
export function classifyQuotaObservation(observation = {}) {
  if (!observation || typeof observation !== "object" || Array.isArray(observation)) return "unavailable";
  if (observation.error === "credential") return "credential_error";
  if (observation.error === "provider") return "provider_error";
  if (observation.supported === false) return "unsupported";
  if (observation.stale === true) return "stale";
  if (observation.estimated === true) return "estimated";
  if (observation.unlimited === true) return "unlimited";
  if (observation.observed === false) return "unavailable";
  const { remaining, limit } = observation;
  if (!Number.isFinite(remaining) || !Number.isFinite(limit) || limit <= 0) return "unavailable";
  return remaining <= 0 ? "finite_exhausted" : "finite_available";
}

function assertPlainDataObject(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${path} must be a plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must be a plain object`);
  }
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (descriptor.get || descriptor.set) throw new TypeError(`${path}.${key} accessor is not allowed`);
  }
}

function assertPlainDataArray(value, path) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`${path} must be a plain array`);
  }
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (descriptor.get || descriptor.set) throw new TypeError(`${path}.${key} accessor is not allowed`);
  }
  if (Object.hasOwn(value, "toJSON")) throw new TypeError(`${path}.toJSON is not allowed`);
}

function assertAllowedFields(value, allowed, path) {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !allowed.has(key)) throw new TypeError(`${path}.${String(key)} is not allowed`);
  }
}

function assertEnum(value, allowed, path) {
  if (typeof value !== "string" || !allowed.includes(value)) throw new TypeError(`${path} is invalid`);
}

function assertPattern(value, pattern, path) {
  if (typeof value !== "string" || !pattern.test(value)) throw new TypeError(`${path} is invalid`);
}

function assertOutcomeReason(outcome, reasonCode, path, compatibility = TERMINAL_REASONS) {
  if (!compatibility[outcome].includes(reasonCode)) {
    throw new TypeError(`${path} outcome and reasonCode disagree`);
  }
}

function buildAttemptProjection(attempt, index, privacySalt) {
  const path = `projection.attempts[${index}]`;
  assertPlainDataObject(attempt, path);
  assertAllowedFields(attempt, ATTEMPT_INPUT_FIELDS, path);
  assertPattern(attempt.attemptId, ID_PATTERNS.attemptId, `${path}.attemptId`);
  assertEnum(attempt.outcome, TERMINAL_OUTCOMES, `${path}.outcome`);
  assertEnum(attempt.reasonCode, ROUTING_REASON_CODES, `${path}.reasonCode`);
  assertOutcomeReason(attempt.outcome, attempt.reasonCode, path, ATTEMPT_REASONS);
  assertEnum(attempt.quotaState, QUOTA_OBSERVATION_STATES, `${path}.quotaState`);

  const connectionRef = createConnectionRef(attempt.rawConnectionId, privacySalt);
  const proxyBucketRef = createProxyBucketRef(attempt.rawProxyBucketIdentity, privacySalt);
  assertPattern(connectionRef, CONNECTION_REF_PATTERN, `${path}.connectionRef`);
  assertPattern(proxyBucketRef, PROXY_BUCKET_REF_PATTERN, `${path}.proxyBucketRef`);
  return Object.freeze({
    attemptId: attempt.attemptId,
    connectionRef,
    proxyBucketRef,
    outcome: attempt.outcome,
    reasonCode: attempt.reasonCode,
    quotaState: attempt.quotaState,
  });
}

/**
 * Validates raw trusted-boundary inputs and returns a newly constructed,
 * immutable, secret-free plain projection. Raw connection and proxy identities
 * are accepted only as derivation inputs and never copied into the result.
 */
export function validateRouteDecisionProjection(projection, { privacySalt } = {}) {
  assertPlainDataObject(projection, "projection");
  assertAllowedFields(projection, ROOT_INPUT_FIELDS, "projection");
  if (projection.schemaVersion !== ROUTING_CONTRACT_VERSION) {
    throw new TypeError("projection.schemaVersion is invalid");
  }
  assertPattern(projection.requestId, ID_PATTERNS.requestId, "projection.requestId");
  assertPattern(projection.routeDecisionId, ID_PATTERNS.routeDecisionId, "projection.routeDecisionId");
  assertEnum(projection.terminalOutcome, TERMINAL_OUTCOMES, "projection.terminalOutcome");
  assertEnum(projection.reasonCode, ROUTING_REASON_CODES, "projection.reasonCode");
  assertOutcomeReason(projection.terminalOutcome, projection.reasonCode, "projection terminal");
  assertPlainDataArray(projection.attempts, "projection.attempts");

  const attempts = Object.freeze(
    projection.attempts.map((attempt, index) => buildAttemptProjection(attempt, index, privacySalt)),
  );
  return Object.freeze({
    schemaVersion: ROUTING_CONTRACT_VERSION,
    requestId: projection.requestId,
    routeDecisionId: projection.routeDecisionId,
    terminalOutcome: projection.terminalOutcome,
    reasonCode: projection.reasonCode,
    attempts,
  });
}
