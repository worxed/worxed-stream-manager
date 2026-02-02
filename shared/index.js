/**
 * WORXED STREAM MANAGER - Shared Database Layer
 *
 * Single import for all DB operations:
 *   const db = require('../shared');
 *   db.init();
 *   db.settings.get('theme');
 *   db.events.insert('follow', 'username', { ... });
 */

const { getDatabase, closeDatabase, getDatabaseStats } = require('./database');
const { runMigrations, getMigrationStatus } = require('./migrations');

// ===== INITIALIZATION =====

/**
 * Initialize database: run migrations, return status.
 * Call once at startup from supervisor or backend.
 */
function init() {
  const result = runMigrations();

  if (result.applied.length > 0) {
    console.log(`[DB] Applied ${result.applied.length} migration(s), now at v${result.currentVersion}`);
    result.applied.forEach(m => console.log(`[DB]   v${m.version}: ${m.description}`));
  } else {
    console.log(`[DB] Schema up to date (v${result.currentVersion})`);
  }

  return result;
}

// ===== SETTINGS =====

const settings = {
  get(key, defaultValue = null) {
    const row = getDatabase().prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (!row) return defaultValue;
    try { return JSON.parse(row.value); } catch { return row.value; }
  },

  set(key, value, category = 'general') {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    getDatabase().prepare(`
      INSERT INTO settings (key, value, category, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, category = excluded.category, updated_at = datetime('now')
    `).run(key, serialized, category);
  },

  delete(key) {
    getDatabase().prepare('DELETE FROM settings WHERE key = ?').run(key);
  },

  getAll(category = null) {
    const rows = category
      ? getDatabase().prepare('SELECT key, value, category, updated_at FROM settings WHERE category = ? ORDER BY key').all(category)
      : getDatabase().prepare('SELECT key, value, category, updated_at FROM settings ORDER BY key').all();

    return rows.map(r => {
      try { r.value = JSON.parse(r.value); } catch {}
      return r;
    });
  },

  getCategories() {
    return getDatabase().prepare('SELECT DISTINCT category FROM settings ORDER BY category').all().map(r => r.category);
  }
};

// ===== ALERT CONFIGS =====

const alerts = {
  get(type) {
    return getDatabase().prepare('SELECT * FROM alert_configs WHERE type = ?').get(type);
  },

  getAll() {
    return getDatabase().prepare('SELECT * FROM alert_configs ORDER BY type').all();
  },

  update(type, config) {
    const fields = [];
    const values = [];

    for (const [key, val] of Object.entries(config)) {
      if (['enabled', 'sound', 'duration', 'volume', 'sound_url', 'template', 'custom_css'].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(val);
      }
    }

    if (fields.length === 0) return null;

    fields.push("updated_at = datetime('now')");
    values.push(type);

    getDatabase().prepare(`UPDATE alert_configs SET ${fields.join(', ')} WHERE type = ?`).run(...values);
    return this.get(type);
  },

  /** Convert DB rows to the legacy in-memory format used by server.js */
  toLegacyFormat() {
    const rows = this.getAll();
    const result = {};
    for (const row of rows) {
      result[row.type] = {
        enabled: !!row.enabled,
        sound: !!row.sound,
        duration: row.duration
      };
    }
    return result;
  }
};

// ===== EVENTS =====

const events = {
  insert(type, username, data = {}) {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    return getDatabase().prepare(
      'INSERT INTO events (type, username, data) VALUES (?, ?, ?)'
    ).run(type, username, serialized);
  },

  query({ type, limit = 50, offset = 0, since, until } = {}) {
    let sql = 'SELECT * FROM events WHERE 1=1';
    const params = [];

    if (type) { sql += ' AND type = ?'; params.push(type); }
    if (since) { sql += ' AND created_at >= ?'; params.push(since); }
    if (until) { sql += ' AND created_at <= ?'; params.push(until); }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return getDatabase().prepare(sql).all(...params).map(r => {
      try { r.data = JSON.parse(r.data); } catch {}
      return r;
    });
  },

  count(type = null) {
    if (type) {
      return getDatabase().prepare('SELECT COUNT(*) as count FROM events WHERE type = ?').get(type).count;
    }
    return getDatabase().prepare('SELECT COUNT(*) as count FROM events').get().count;
  },

  countByType() {
    return getDatabase().prepare(
      'SELECT type, COUNT(*) as count FROM events GROUP BY type ORDER BY count DESC'
    ).all();
  }
};

// ===== ANALYTICS =====

const analytics = {
  record(metric, value, period = 'point', periodStart = null) {
    const start = periodStart || new Date().toISOString();
    getDatabase().prepare(
      'INSERT INTO analytics (metric, value, period, period_start) VALUES (?, ?, ?, ?)'
    ).run(metric, value, period, start);
  },

  query({ metric, period, since, until, limit = 100 } = {}) {
    let sql = 'SELECT * FROM analytics WHERE 1=1';
    const params = [];

    if (metric) { sql += ' AND metric = ?'; params.push(metric); }
    if (period) { sql += ' AND period = ?'; params.push(period); }
    if (since) { sql += ' AND period_start >= ?'; params.push(since); }
    if (until) { sql += ' AND period_start <= ?'; params.push(until); }

    sql += ' ORDER BY period_start DESC LIMIT ?';
    params.push(limit);

    return getDatabase().prepare(sql).all(...params);
  },

  /** Get latest value for a metric */
  latest(metric) {
    return getDatabase().prepare(
      'SELECT * FROM analytics WHERE metric = ? ORDER BY period_start DESC LIMIT 1'
    ).get(metric);
  }
};

// ===== ENDPOINTS =====

const endpoints = {
  getAll() {
    return getDatabase().prepare('SELECT * FROM endpoints ORDER BY name').all();
  },

  get(id) {
    return getDatabase().prepare('SELECT * FROM endpoints WHERE id = ?').get(id);
  },

  getByPath(pathStr) {
    return getDatabase().prepare('SELECT * FROM endpoints WHERE path = ?').get(pathStr);
  },

  create({ name, path: p, method = 'GET', handler, description = '' }) {
    const result = getDatabase().prepare(
      'INSERT INTO endpoints (name, path, method, handler, description) VALUES (?, ?, ?, ?, ?)'
    ).run(name, p, method, handler, description);
    return this.get(result.lastInsertRowid);
  },

  update(id, fields) {
    const allowed = ['name', 'path', 'method', 'handler', 'enabled', 'description'];
    const updates = [];
    const values = [];

    for (const [key, val] of Object.entries(fields)) {
      if (allowed.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(val);
      }
    }

    if (updates.length === 0) return null;

    updates.push("updated_at = datetime('now')");
    values.push(id);

    getDatabase().prepare(`UPDATE endpoints SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.get(id);
  },

  delete(id) {
    return getDatabase().prepare('DELETE FROM endpoints WHERE id = ?').run(id);
  }
};

module.exports = {
  init,
  close: closeDatabase,
  getStats: getDatabaseStats,
  getMigrationStatus,
  settings,
  alerts,
  events,
  analytics,
  endpoints,
  // Expose raw connection for advanced use
  getDatabase
};
