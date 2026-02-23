/**
 * WORXED STREAM MANAGER - Database Connection Manager
 *
 * Singleton SQLite database via better-sqlite3.
 * WAL mode for concurrent read/write. Data stored in data/worxed.db.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'worxed.db');

let db = null;

/**
 * Get or create the database connection.
 * Safe to call multiple times — returns the same instance.
 */
function getDatabase() {
  if (db) return db;

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Performance pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('cache_size = -16000'); // 16MB cache

  return db;
}

/**
 * Close the database connection cleanly.
 * Call this during graceful shutdown.
 */
function closeDatabase() {
  if (db) {
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
    } catch (e) {
      // Already closed or error — ignore
    }
    db = null;
  }
}

/**
 * Get database stats for monitoring.
 */
function getDatabaseStats() {
  const conn = getDatabase();

  const tables = conn.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  ).all();

  const stats = { tables: {} };
  for (const { name } of tables) {
    const row = conn.prepare(`SELECT COUNT(*) as count FROM "${name}"`).get();
    stats.tables[name] = row.count;
  }

  // File size
  try {
    const stat = fs.statSync(DB_PATH);
    stats.sizeBytes = stat.size;
    stats.sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
  } catch {
    stats.sizeBytes = 0;
    stats.sizeMB = '0';
  }

  stats.path = DB_PATH;
  stats.walMode = conn.pragma('journal_mode', { simple: true });

  return stats;
}

module.exports = { getDatabase, closeDatabase, getDatabaseStats, DB_PATH, DATA_DIR };
