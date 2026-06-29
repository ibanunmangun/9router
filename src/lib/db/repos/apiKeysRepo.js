import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";

/**
 * Parse JSON string column, returning default on null/invalid.
 * SQLite stores JSON arrays as TEXT; we need to parse on read.
 */
function parseJsonArray(val, def) {
  if (!val) return def;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : def;
  } catch {
    return def;
  }
}

function rowToKey(row) {
  if (!row) return null;
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    machineId: row.machineId,
    isActive: row.isActive === 1 || row.isActive === true,
    allowedModels: parseJsonArray(row.allowedModels, []),
    blockedModels: parseJsonArray(row.blockedModels, []),
    allowedCombos: parseJsonArray(row.allowedCombos, []),
    scopes: parseJsonArray(row.scopes, ["manage"]),
    expiresAt: row.expiresAt || null,
    lastUsedAt: row.lastUsedAt || null,
    createdAt: row.createdAt,
  };
}

/**
 * Serialize metadata to DB-ready object.
 * Returns only the columns we want to write.
 */
function keyToRow(key) {
  return {
    id: key.id,
    key: key.key,
    name: key.name,
    machineId: key.machineId,
    isActive: key.isActive ? 1 : 0,
    allowedModels: JSON.stringify(key.allowedModels || []),
    blockedModels: JSON.stringify(key.blockedModels || []),
    allowedCombos: JSON.stringify(key.allowedCombos || []),
    scopes: JSON.stringify(key.scopes || ["manage"]),
    expiresAt: key.expiresAt || null,
    lastUsedAt: key.lastUsedAt || null,
    createdAt: key.createdAt,
  };
}

export async function getApiKeys() {
  const db = await getAdapter();
  const rows = db.all(`SELECT * FROM apiKeys ORDER BY createdAt ASC`);
  return rows.map(rowToKey);
}

export async function getApiKeyById(id) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
  return rowToKey(row);
}

export async function createApiKey(name, machineId, extra = {}) {
  if (!machineId) throw new Error("machineId is required");
  const db = await getAdapter();
  const { generateApiKeyWithMachine } = await import("@/shared/utils/apiKey");
  const result = generateApiKeyWithMachine(machineId);

  const now = new Date().toISOString();
  const key = {
    id: uuidv4(),
    name,
    key: result.key,
    machineId,
    isActive: true,
    allowedModels: extra.allowedModels || [],
    blockedModels: extra.blockedModels || [],
    allowedCombos: extra.allowedCombos || [],
    scopes: extra.scopes || ["manage"],
    expiresAt: extra.expiresAt || null,
    lastUsedAt: null,
    createdAt: now,
  };

  const r = keyToRow(key);
  db.run(
    `INSERT INTO apiKeys(id, key, name, machineId, isActive, allowedModels, blockedModels, allowedCombos, scopes, expiresAt, lastUsedAt, createdAt) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [r.id, r.key, r.name, r.machineId, r.isActive, r.allowedModels, r.blockedModels, r.allowedCombos, r.scopes, r.expiresAt, r.lastUsedAt, r.createdAt]
  );
  return key;
}

export async function updateApiKey(id, data) {
  const db = await getAdapter();
  let result = null;
  db.transaction(() => {
    const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
    if (!row) return;

    const existing = rowToKey(row);
    const merged = {
      ...existing,
      // Only override fields that are explicitly provided
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.allowedModels !== undefined ? { allowedModels: data.allowedModels } : {}),
      ...(data.blockedModels !== undefined ? { blockedModels: data.blockedModels } : {}),
      ...(data.allowedCombos !== undefined ? { allowedCombos: data.allowedCombos } : {}),
      ...(data.scopes !== undefined ? { scopes: data.scopes } : {}),
      ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt } : {}),
    };

    const r = keyToRow(merged);
    db.run(
      `UPDATE apiKeys SET key=?, name=?, machineId=?, isActive=?, allowedModels=?, blockedModels=?, allowedCombos=?, scopes=?, expiresAt=? WHERE id=?`,
      [r.key, r.name, r.machineId, r.isActive, r.allowedModels, r.blockedModels, r.allowedCombos, r.scopes, r.expiresAt, id]
    );
    result = merged;
  });
  return result;
}

export async function deleteApiKey(id) {
  const db = await getAdapter();
  const res = db.run(`DELETE FROM apiKeys WHERE id = ?`, [id]);
  return (res?.changes ?? 0) > 0;
}

export async function validateApiKey(key) {
  const db = await getAdapter();
  const row = db.get(`SELECT isActive FROM apiKeys WHERE key = ?`, [key]);
  if (!row) return false;
  return row.isActive === 1 || row.isActive === true;
}

/**
 * Fetch full API key metadata including model permissions.
 * Used by auth pipeline for model-scoped access control.
 */
export async function getApiKeyMetadata(key) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM apiKeys WHERE key = ?`, [key]);
  return rowToKey(row);
}

/**
 * Touch lastUsedAt without changing other fields.
 */
export async function touchApiKey(id) {
  const db = await getAdapter();
  db.run(`UPDATE apiKeys SET lastUsedAt = ? WHERE id = ?`, [new Date().toISOString(), id]);
}
