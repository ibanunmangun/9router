// Migration v3: Add daily rate/spend limit columns to apiKeys.
// Columns added (additive only, safe for existing DBs):
//   maxRequestsPerDay - INTEGER, null = unlimited
//   maxSpendUsdPerDay - REAL, null = unlimited

export default {
  version: 3,
  name: "api-key-daily-limit",
  up(db) {
    const cols = [
      { name: "maxRequestsPerDay", def: "INTEGER" },
      { name: "maxSpendUsdPerDay", def: "REAL" },
    ];

    const existing = db.all(`PRAGMA table_info(apiKeys)`);
    const existingNames = new Set(existing.map((r) => r.name));

    for (const col of cols) {
      if (!existingNames.has(col.name)) {
        db.exec(`ALTER TABLE apiKeys ADD COLUMN ${col.name} ${col.def}`);
      }
    }
  },
};
