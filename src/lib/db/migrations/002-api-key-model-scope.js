// Migration v2: Add model-scoped access control columns to apiKeys.
// Columns added (additive only, safe for existing DBs):
//   allowedModels  - JSON array of model glob patterns ([] = all allowed)
//   blockedModels  - JSON array of model glob patterns (deny overrides allow)
//   allowedCombos  - JSON array of combo name restrictions
//   scopes         - JSON array of permission scopes (default: ["manage"])
//   expiresAt      - ISO 8601 expiration timestamp
//   lastUsedAt     - ISO 8601 last usage timestamp

export default {
  version: 2,
  name: "api-key-model-scope",
  up(db) {
    const cols = [
      { name: "allowedModels", def: "TEXT NOT NULL DEFAULT '[]'" },
      { name: "blockedModels", def: "TEXT NOT NULL DEFAULT '[]'" },
      { name: "allowedCombos", def: "TEXT NOT NULL DEFAULT '[]'" },
      { name: "scopes", def: "TEXT NOT NULL DEFAULT '[\"manage\"]'" },
      { name: "expiresAt", def: "TEXT" },
      { name: "lastUsedAt", def: "TEXT" },
    ];

    // Get existing columns
    const existing = db.all(`PRAGMA table_info(apiKeys)`);
    const existingNames = new Set(existing.map((r) => r.name));

    for (const col of cols) {
      if (!existingNames.has(col.name)) {
        db.exec(`ALTER TABLE apiKeys ADD COLUMN ${col.name} ${col.def}`);
      }
    }
  },
};
