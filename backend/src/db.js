const fs = require('fs');
const path = require('path');

const DB_FILE = path.resolve(__dirname, '..', 'data', 'db.json');

function ensureDb() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ leads: [], settings: {} }, null, 2));
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeDb(obj) {
  fs.writeFileSync(DB_FILE, JSON.stringify(obj, null, 2));
}

module.exports = {
  getLeads() {
    const db = readDb();
    return db.leads || [];
  },
  addLead(lead) {
    const db = readDb();
    lead.id = (Date.now()).toString();
    db.leads = db.leads || [];
    db.leads.unshift(lead);
    writeDb(db);
    return lead;
  },
  getSettings() {
    const db = readDb();
    return db.settings || {};
  },
  updateSettings(settings) {
    const db = readDb();
    db.settings = Object.assign({}, db.settings || {}, settings);
    writeDb(db);
    return db.settings;
  }
};
