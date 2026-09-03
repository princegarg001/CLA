const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');
const { newId, nowIso } = require('./utils/helpers');

const TABLES = [
  'leads', 'deals', 'sequences', 'messages', 'templates',
  'settings', 'icp_profiles', 'scheduled_posts', 'agent_runs',
  'oauth_connections', 'social_posts', 'content_calendar', 'upwork_jobs',
  'clients', 'projects', 'milestones', 'invoices', 'communication_log',
];

const DB_FILE = path.resolve(__dirname, '..', 'data', 'db.json');

function ensureDb() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const empty = TABLES.reduce((acc, t) => {
      acc[t] = t === 'settings' ? {} : [];
      return acc;
    }, {});
    fs.writeFileSync(DB_FILE, JSON.stringify(empty, null, 2));
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDb(obj) {
  fs.writeFileSync(DB_FILE, JSON.stringify(obj, null, 2));
}

// ---------------------------------------------------------------------------
// JSON fallback implementation — used whenever Supabase keys are empty.
// ---------------------------------------------------------------------------
const jsonDriver = {
  async list(table, { filters = {}, orderBy, limit } = {}) {
    const db = readDb();
    let rows = db[table] || [];
    for (const [key, value] of Object.entries(filters)) {
      rows = rows.filter((r) => r[key] === value);
    }
    if (orderBy) {
      const { column, ascending = false } = orderBy;
      rows = [...rows].sort((a, b) => {
        if (a[column] === b[column]) return 0;
        const cmp = a[column] > b[column] ? 1 : -1;
        return ascending ? cmp : -cmp;
      });
    }
    if (limit) rows = rows.slice(0, limit);
    return rows;
  },
  async get(table, id) {
    const db = readDb();
    return (db[table] || []).find((r) => r.id === id) || null;
  },
  async insert(table, record) {
    const db = readDb();
    db[table] = db[table] || [];
    const row = { id: newId(), created_at: nowIso(), updated_at: nowIso(), ...record };
    db[table].unshift(row);
    writeDb(db);
    return row;
  },
  async update(table, id, patch) {
    const db = readDb();
    db[table] = db[table] || [];
    const idx = db[table].findIndex((r) => r.id === id);
    if (idx === -1) return null;
    db[table][idx] = { ...db[table][idx], ...patch, updated_at: nowIso() };
    writeDb(db);
    return db[table][idx];
  },
  async remove(table, id) {
    const db = readDb();
    db[table] = (db[table] || []).filter((r) => r.id !== id);
    writeDb(db);
    return true;
  },
  async getSettings() {
    const db = readDb();
    return db.settings || {};
  },
  async updateSettings(patch) {
    const db = readDb();
    db.settings = { ...(db.settings || {}), ...patch };
    writeDb(db);
    return db.settings;
  },
};

// ---------------------------------------------------------------------------
// Supabase implementation — used when SUPABASE_URL + SUPABASE_KEY are set.
// `settings` is stored as key/value rows: { key, value } so it can be a real table too.
// ---------------------------------------------------------------------------
function buildSupabaseDriver() {
  const { createClient } = require('@supabase/supabase-js');
  const client = createClient(config.supabaseUrl, config.supabaseKey);

  return {
    async list(table, { filters = {}, orderBy, limit } = {}) {
      let query = client.from(table).select('*');
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
      if (orderBy) query = query.order(orderBy.column, { ascending: !!orderBy.ascending });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    async get(table, id) {
      const { data, error } = await client.from(table).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
    async insert(table, record) {
      const row = { id: record.id || newId(), created_at: nowIso(), updated_at: nowIso(), ...record };
      const { data, error } = await client.from(table).insert(row).select().single();
      if (error) throw error;
      return data;
    },
    async update(table, id, patch) {
      const { data, error } = await client
        .from(table)
        .update({ ...patch, updated_at: nowIso() })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async remove(table, id) {
      const { error } = await client.from(table).delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    async getSettings() {
      const { data, error } = await client.from('settings').select('key,value');
      if (error) throw error;
      return (data || []).reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});
    },
    async updateSettings(patch) {
      const rows = Object.entries(patch).map(([key, value]) => ({ key, value }));
      const { error } = await client.from('settings').upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      return this.getSettings();
    },
  };
}

let driver = jsonDriver;
if (config.isConfigured('supabase')) {
  try {
    driver = buildSupabaseDriver();
    logger.info('db: using Supabase driver');
  } catch (e) {
    logger.error('db: failed to init Supabase client, falling back to JSON store', { error: e.message });
    driver = jsonDriver;
  }
} else {
  logger.info('db: using local JSON store (data/db.json) — set SUPABASE_URL/SUPABASE_KEY to switch to Supabase');
}

module.exports = {
  TABLES,
  list: (...args) => driver.list(...args),
  get: (...args) => driver.get(...args),
  insert: (...args) => driver.insert(...args),
  update: (...args) => driver.update(...args),
  remove: (...args) => driver.remove(...args),
  getSettings: (...args) => driver.getSettings(...args),
  updateSettings: (...args) => driver.updateSettings(...args),
  // Legacy helpers kept for backwards compatibility with the original stub API.
  getLeads: (...args) => driver.list('leads', ...args),
  addLead: (record) => driver.insert('leads', record),
};
