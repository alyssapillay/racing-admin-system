const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const DB_FILE = process.env.DB_FILE || path.join(__dirname, "demo.sqlite");
const db = new sqlite3.Database(DB_FILE);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function addColumnIfMissing(table, column, typeSql) {
  const cols = await all(`PRAGMA table_info(${table})`);
  const has = cols.some((c) => c.name === column);
  if (!has) await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeSql}`);
}

async function initDb() {
  await run("PRAGMA foreign_keys = ON");

  await run(`
    CREATE TABLE IF NOT EXISTS sports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS countries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sport_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      country_code TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      UNIQUE(sport_id, name),
      FOREIGN KEY(sport_id) REFERENCES sports(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(country_id, name),
      FOREIGN KEY(country_id) REFERENCES countries(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS race_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      race_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(course_id, race_date),
      FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS races (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      race_day_id INTEGER NOT NULL,
      race_number INTEGER NOT NULL,
      race_datetime TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      closed_at TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(race_day_id, race_number),
      FOREIGN KEY(race_day_id) REFERENCES race_days(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS horses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      race_id INTEGER NOT NULL,
      horse_number INTEGER NOT NULL,
      name TEXT NOT NULL,

      win_num REAL DEFAULT 0,
      win_den REAL DEFAULT 0,
      place_num REAL DEFAULT 0,
      place_den REAL DEFAULT 0,

      jockey TEXT DEFAULT '',
      trainer TEXT DEFAULT '',
      age INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',

      created_at TEXT NOT NULL,
      UNIQUE(race_id, horse_number),
      FOREIGN KEY(race_id) REFERENCES races(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  // ✅ MISSING TABLE (needed for wallet betting)
  await run(`
    CREATE TABLE IF NOT EXISTS bets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      horse_id INTEGER NOT NULL,
      stake REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(horse_id) REFERENCES horses(id) ON DELETE CASCADE
    )
  `);

  // safe migrations
  await addColumnIfMissing("countries", "country_code", "TEXT DEFAULT ''");
  await addColumnIfMissing("horses", "win_num", "REAL DEFAULT 0");
  await addColumnIfMissing("horses", "win_den", "REAL DEFAULT 0");
  await addColumnIfMissing("horses", "place_num", "REAL DEFAULT 0");
  await addColumnIfMissing("horses", "place_den", "REAL DEFAULT 0");
  await addColumnIfMissing("horses", "jockey", "TEXT DEFAULT ''");
  await addColumnIfMissing("horses", "trainer", "TEXT DEFAULT ''");
  await addColumnIfMissing("horses", "age", "INTEGER DEFAULT 0");
  await addColumnIfMissing("horses", "notes", "TEXT DEFAULT ''");
}

module.exports = { db, run, get, all, initDb };