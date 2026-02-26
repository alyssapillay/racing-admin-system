const bcrypt = require("bcrypt");
const { get, run } = require("./db");

async function seedIfEmpty() {
  const sportCount = await get("SELECT COUNT(*) AS c FROM sports");
  if (sportCount?.c > 0) return;

  const now = new Date().toISOString();

  // Sport
  const s1 = await run("INSERT INTO sports (code, name, created_at) VALUES (?,?,?)", [
    "HORSE_RACING",
    "Horse Racing",
    now,
  ]);

  // Country
  const cSA = await run("INSERT INTO countries (sport_id, name, created_at) VALUES (?,?,?)", [
    s1.lastID,
    "South Africa",
    now,
  ]);

  // Course (only Turffontein as requested)
  const courseTurf = await run("INSERT INTO courses (country_id, name, created_at) VALUES (?,?,?)", [
    cSA.lastID,
    "Turffontein",
    now,
  ]);

  // Race day (today)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const raceDate = `${yyyy}-${mm}-${dd}`;

  const rd = await run("INSERT INTO race_days (course_id, race_date, created_at) VALUES (?,?,?)", [
    courseTurf.lastID,
    raceDate,
    now,
  ]);

  // 2 OPEN within 72h + 2 CLOSED in past
  const nowMs = Date.now();
  const open1 = new Date(nowMs + 6 * 60 * 60 * 1000).toISOString();
  const open2 = new Date(nowMs + 30 * 60 * 60 * 1000).toISOString();
  const closed1 = new Date(nowMs - 2 * 60 * 60 * 1000).toISOString();
  const closed2 = new Date(nowMs - 10 * 60 * 60 * 1000).toISOString();

  const r1 = await run(
    "INSERT INTO races (race_day_id, race_number, race_datetime, status, created_at) VALUES (?,?,?,?,?)",
    [rd.lastID, 1, open1, "OPEN", now]
  );
  const r2 = await run(
    "INSERT INTO races (race_day_id, race_number, race_datetime, status, created_at) VALUES (?,?,?,?,?)",
    [rd.lastID, 2, open2, "OPEN", now]
  );
  const r3 = await run(
    "INSERT INTO races (race_day_id, race_number, race_datetime, status, created_at, closed_at) VALUES (?,?,?,?,?,?)",
    [rd.lastID, 3, closed1, "CLOSED", now, now]
  );
  const r4 = await run(
    "INSERT INTO races (race_day_id, race_number, race_datetime, status, created_at, closed_at) VALUES (?,?,?,?,?,?)",
    [rd.lastID, 4, closed2, "CLOSED", now, now]
  );

  // Horses with info + Win/Place
  const horses = [
    { n: 1, name: "Royale Jacket", win: 1.74, place: 0.22, jockey:"P. Mongqawa", trainer:"M. Wolsley", age:3, notes:"Strong finisher" },
    { n: 2, name: "Stokesy", win: 3.57, place: 0.46, jockey:"C. Mabaya", trainer:"D. de Kock", age:3, notes:"Consistent recent form" },
    { n: 3, name: "Terrence", win: 3.57, place: 0.46, jockey:"V. Sithole", trainer:"A. G Laird", age:3, notes:"Fast early pace" },
    { n: 4, name: "Samuel Sharpe", win: 3.03, place: 0.46, jockey:"T. Matsoele", trainer:"F. Habib", age:3, notes:"Likes this distance" },
    { n: 5, name: "Underdog", win: 10, place: 1.62, jockey:"S. MtHembu", trainer:"T. Peter", age:4, notes:"Value pick" },
  ];

  for (const h of horses) {
    await run(
      `INSERT INTO horses (race_id, horse_number, name, win_num, win_den, place_num, place_den, jockey, trainer, age, notes, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [r1.lastID, h.n, h.name, h.win, 0, h.place, 0, h.jockey, h.trainer, h.age, h.notes, now]
    );
    await run(
      `INSERT INTO horses (race_id, horse_number, name, win_num, win_den, place_num, place_den, jockey, trainer, age, notes, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [r2.lastID, h.n, h.name, h.win, 0, h.place, 0, h.jockey, h.trainer, h.age, h.notes, now]
    );
  }

  // Super Admin
  const adminPass = "DemoPass123";
  const hash = await bcrypt.hash(adminPass, 10);
  await run(
    `INSERT INTO users (name, email, password_hash, role, status, balance, created_at)
     VALUES (?,?,?,?,?,?,?)`,
    ["Super Admin", "superadmin@example.com", hash, "SUPER_ADMIN", "ACTIVE", 0, now]
  );

  // Demo players
  const fakeHash = "$2b$10$FqQXo2B9f1fFZ1Zx5vVjkeF2y6Fz8bKxkQ8jQ8jQ8jQ8jQ8jQ8jQ8";
  await run(
    `INSERT INTO users (name, email, password_hash, role, status, balance, created_at)
     VALUES (?,?,?,?,?,?,?)`,
    ["Alyssa", "alyssa@demo.com", fakeHash, "PLAYER", "ACTIVE", 10000, now]
  );
  await run(
    `INSERT INTO users (name, email, password_hash, role, status, balance, created_at)
     VALUES (?,?,?,?,?,?,?)`,
    ["Kiruben", "kiruben@demo.com", fakeHash, "PLAYER", "ACTIVE", 10000, now]
  );
}

module.exports = { seedIfEmpty };