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
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS verified_members (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      verified_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (guild_id, user_id)
    );
  `);

  // Migrations for existing databases
  const columns = db.pragma('table_info(guild_settings)').map((c) => c.name);
  if (!columns.includes('log_channel_id')) {
    db.exec('ALTER TABLE guild_settings ADD COLUMN log_channel_id TEXT');
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
};

module.exports = { getDb, queries };
