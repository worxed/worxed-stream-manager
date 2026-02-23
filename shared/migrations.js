/**
 * WORXED STREAM MANAGER - Migration Runner
 *
 * Version-based migrations. Tracks applied versions in _migrations table.
 * Safe to run repeatedly — skips already-applied migrations.
 */

const { getDatabase } = require('./database');
const { migrations } = require('./schema');

/**
 * Run all pending migrations.
 * Creates _migrations tracking table if it doesn't exist.
 * Returns { applied: [...], currentVersion }.
 */
function runMigrations() {
  const db = getDatabase();

  // Ensure migrations tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      description TEXT,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const applied = db.prepare('SELECT version FROM _migrations ORDER BY version').all();
  const appliedVersions = new Set(applied.map(r => r.version));

  const newlyApplied = [];

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) continue;

    // Run migration in a transaction
    const run = db.transaction(() => {
      migration.up(db);
      db.prepare('INSERT INTO _migrations (version, description) VALUES (?, ?)').run(
        migration.version,
        migration.description
      );
    });

    run();
    newlyApplied.push({ version: migration.version, description: migration.description });
  }

  const currentVersion = db.prepare('SELECT MAX(version) as v FROM _migrations').get()?.v || 0;

  return { applied: newlyApplied, currentVersion };
}

/**
 * Get current migration status.
 */
function getMigrationStatus() {
  const db = getDatabase();

  try {
    const applied = db.prepare('SELECT * FROM _migrations ORDER BY version').all();
    const pending = migrations.filter(m => !applied.find(a => a.version === m.version));

    return {
      currentVersion: applied.length > 0 ? applied[applied.length - 1].version : 0,
      applied: applied.map(a => ({ version: a.version, description: a.description, appliedAt: a.applied_at })),
      pending: pending.map(p => ({ version: p.version, description: p.description }))
    };
  } catch {
    // _migrations table doesn't exist yet
    return {
      currentVersion: 0,
      applied: [],
      pending: migrations.map(p => ({ version: p.version, description: p.description }))
    };
  }
}

module.exports = { runMigrations, getMigrationStatus };
