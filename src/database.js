const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'nickname-bot.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initialize();
  }
  return db;
}

function initialize() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_members (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reminder_count INTEGER NOT NULL DEFAULT 0,
      last_reminder_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      name_mode TEXT NOT NULL DEFAULT 'first_initial',
      log_channel_id TEXT,
      verifier_role_ids TEXT,
      quarantine_category_id TEXT,
      quarantine_max_age_hours INTEGER NOT NULL DEFAULT 168,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS verified_members (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      verified_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS quarantine_channels (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL UNIQUE,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (guild_id, user_id)
    );
  `);

  // Migrations for existing databases
  const settingsColumns = db.pragma('table_info(guild_settings)').map((c) => c.name);
  if (!settingsColumns.includes('log_channel_id')) {
    db.exec('ALTER TABLE guild_settings ADD COLUMN log_channel_id TEXT');
  }
  if (!settingsColumns.includes('verifier_role_ids')) {
    db.exec('ALTER TABLE guild_settings ADD COLUMN verifier_role_ids TEXT');
  }
  if (!settingsColumns.includes('quarantine_category_id')) {
    db.exec('ALTER TABLE guild_settings ADD COLUMN quarantine_category_id TEXT');
  }
  if (!settingsColumns.includes('quarantine_max_age_hours')) {
    db.exec('ALTER TABLE guild_settings ADD COLUMN quarantine_max_age_hours INTEGER NOT NULL DEFAULT 168');
  }
}

const queries = {
  upsertPending: () => getDb().prepare(`
    INSERT INTO pending_members (guild_id, user_id, status)
    VALUES (?, ?, 'pending')
    ON CONFLICT (guild_id, user_id) DO UPDATE SET
      status = 'pending',
      updated_at = datetime('now')
  `),

  getPending: () => getDb().prepare(`
    SELECT * FROM pending_members
    WHERE guild_id = ? AND user_id = ? AND status = 'pending'
  `),

  getAllPending: () => getDb().prepare(`
    SELECT * FROM pending_members WHERE status = 'pending'
  `),

  getPendingForGuild: () => getDb().prepare(`
    SELECT * FROM pending_members
    WHERE guild_id = ? AND status = 'pending'
  `),

  updateReminderCount: () => getDb().prepare(`
    UPDATE pending_members
    SET reminder_count = reminder_count + 1,
        last_reminder_at = datetime('now'),
        updated_at = datetime('now')
    WHERE guild_id = ? AND user_id = ?
  `),

  markMaxedOut: () => getDb().prepare(`
    UPDATE pending_members
    SET status = 'maxed_out', updated_at = datetime('now')
    WHERE guild_id = ? AND user_id = ?
  `),

  removePending: () => getDb().prepare(`
    DELETE FROM pending_members WHERE guild_id = ? AND user_id = ?
  `),

  upsertVerified: () => getDb().prepare(`
    INSERT INTO verified_members (guild_id, user_id, display_name)
    VALUES (?, ?, ?)
    ON CONFLICT (guild_id, user_id) DO UPDATE SET
      display_name = excluded.display_name,
      verified_at = datetime('now')
  `),

  getVerified: () => getDb().prepare(`
    SELECT * FROM verified_members WHERE guild_id = ? AND user_id = ?
  `),

  isVerified: () => getDb().prepare(`
    SELECT 1 FROM verified_members WHERE guild_id = ? AND user_id = ?
  `),

  getGuildIds: () => getDb().prepare(`
    SELECT DISTINCT guild_id FROM pending_members WHERE status = 'pending'
  `),

  getGuildSettings: () => getDb().prepare(`
    SELECT * FROM guild_settings WHERE guild_id = ?
  `),

  upsertGuildSettings: () => getDb().prepare(`
    INSERT INTO guild_settings (guild_id, name_mode)
    VALUES (?, ?)
    ON CONFLICT (guild_id) DO UPDATE SET
      name_mode = excluded.name_mode,
      updated_at = datetime('now')
  `),

  setLogChannel: () => getDb().prepare(`
    INSERT INTO guild_settings (guild_id, log_channel_id)
    VALUES (?, ?)
    ON CONFLICT (guild_id) DO UPDATE SET
      log_channel_id = excluded.log_channel_id,
      updated_at = datetime('now')
  `),

  setVerifierRoles: () => getDb().prepare(`
    INSERT INTO guild_settings (guild_id, verifier_role_ids)
    VALUES (?, ?)
    ON CONFLICT (guild_id) DO UPDATE SET
      verifier_role_ids = excluded.verifier_role_ids,
      updated_at = datetime('now')
  `),

  setQuarantineCategory: () => getDb().prepare(`
    INSERT INTO guild_settings (guild_id, quarantine_category_id)
    VALUES (?, ?)
    ON CONFLICT (guild_id) DO UPDATE SET
      quarantine_category_id = excluded.quarantine_category_id,
      updated_at = datetime('now')
  `),

  setQuarantineMaxAge: () => getDb().prepare(`
    INSERT INTO guild_settings (guild_id, quarantine_max_age_hours)
    VALUES (?, ?)
    ON CONFLICT (guild_id) DO UPDATE SET
      quarantine_max_age_hours = excluded.quarantine_max_age_hours,
      updated_at = datetime('now')
  `),

  insertQuarantine: () => getDb().prepare(`
    INSERT INTO quarantine_channels (guild_id, user_id, channel_id, created_by)
    VALUES (?, ?, ?, ?)
  `),

  getQuarantineByChannel: () => getDb().prepare(`
    SELECT * FROM quarantine_channels WHERE channel_id = ?
  `),

  getQuarantineByUser: () => getDb().prepare(`
    SELECT * FROM quarantine_channels WHERE guild_id = ? AND user_id = ?
  `),

  getAllQuarantines: () => getDb().prepare(`
    SELECT * FROM quarantine_channels
  `),

  getQuarantinesForGuild: () => getDb().prepare(`
    SELECT * FROM quarantine_channels WHERE guild_id = ?
  `),

  deleteQuarantine: () => getDb().prepare(`
    DELETE FROM quarantine_channels WHERE guild_id = ? AND user_id = ?
  `),

  deleteQuarantineByChannel: () => getDb().prepare(`
    DELETE FROM quarantine_channels WHERE channel_id = ?
  `),
};

module.exports = { getDb, queries };
