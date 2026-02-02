/**
 * WORXED STREAM MANAGER - Database Schema
 *
 * All table definitions and initial seed data.
 * Called by migrations.js to create/update tables.
 */

/**
 * Schema version 1 — initial tables.
 * Each migration is { version, description, up(db) }.
 */
const migrations = [
  {
    version: 1,
    description: 'Initial schema: settings, alerts, events, analytics, endpoints',
    up(db) {
      // Key-value settings store
      db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          category TEXT DEFAULT 'general',
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);

      // Alert configurations per type
      db.exec(`
        CREATE TABLE IF NOT EXISTS alert_configs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL UNIQUE,
          enabled INTEGER DEFAULT 1,
          sound INTEGER DEFAULT 1,
          duration INTEGER DEFAULT 5000,
          volume REAL DEFAULT 0.8,
          sound_url TEXT,
          template TEXT,
          custom_css TEXT,
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);

      // Event history (follows, subs, raids, donations, etc.)
      db.exec(`
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          username TEXT,
          data TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `);

      // Index for fast event queries
      db.exec(`CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_events_type_created ON events(type, created_at)`);

      // Aggregated analytics (hourly/daily rollups)
      db.exec(`
        CREATE TABLE IF NOT EXISTS analytics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          metric TEXT NOT NULL,
          value REAL NOT NULL,
          period TEXT NOT NULL,
          period_start TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `);

      db.exec(`CREATE INDEX IF NOT EXISTS idx_analytics_metric ON analytics(metric, period_start)`);

      // Custom endpoint definitions (for future endpoint builder)
      db.exec(`
        CREATE TABLE IF NOT EXISTS endpoints (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          path TEXT NOT NULL UNIQUE,
          method TEXT DEFAULT 'GET',
          handler TEXT NOT NULL,
          enabled INTEGER DEFAULT 1,
          description TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);

      // Seed default alert configs
      const insert = db.prepare(`
        INSERT OR IGNORE INTO alert_configs (type, enabled, sound, duration)
        VALUES (?, 1, 1, ?)
      `);

      insert.run('follow', 5000);
      insert.run('subscribe', 7000);
      insert.run('donation', 10000);
      insert.run('raid', 8000);
      insert.run('bits', 6000);
      insert.run('gift_sub', 7000);
    }
  }
];

module.exports = { migrations };
