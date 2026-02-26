const bcrypt = require("bcrypt");
const { get, all, run } = require("./db");

async function seedIfEmpty() {
  const sportCount = await get("SELECT COUNT(*) AS c FROM sports");
  if (sportCount?.c > 0) return; // already seeded

  const now = new Date().toISOString();

  // Sport: Horse Racing
  const s1 = await run("INSERT INTO sports (code, name, created_at) VALUES (?,?,?)", [
    "HORSE_RACING",
    "Horse Racing",
    now,
  ]);

  // Countries
  const cSA = await run("INSERT INTO countries (sport_id, name, created_at) VALUES (?,?,?)", [
    s1.lastID,
    "South Africa",
    now,
  ]);
  const cUK = await run("INSERT INTO countries (sport_id, name, created_at) VALUES (?,?,?)", [
    s1.lastID,
    "United Kingdom",
    now,
  ]);

  // Courses
  const courseGrey = await run("INSERT INTO courses (country_id, name, created_at) VALUES (?,?,?)", [
    cSA.lastID,
    "Greyville",
    now,
  ]);
  await run("INSERT INTO courses (country_id, name, created_at) VALUES (?,?,?)", [
    cSA.lastID,
    "Turffontein Inside",
    now,
  ]);
  await run("INSERT INTO courses (country_id, name, created_at) VALUES (?,?,?)", [
    cUK.lastID,
    "Ascot",
    now,
  ]);

  // Race day for Greyville (today)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const raceDate = `${yyyy}-${mm}-${dd}`;

  const rd = await run("INSERT INTO race_days (course_id, race_date, created_at) VALUES (?,?,?)", [
    courseGrey.lastID,
    raceDate,
    now,
  ]);

  // 2 OPEN races (future within 72h) + 2 CLOSED races (past)
  const nowMs = Date.now();
  const open1 = new Date(nowMs + 6 * 60 * 60 * 1000).toISOString();   // +6h
  const open2 = new Date(nowMs + 30 * 60 * 60 * 1000).toISOString();  // +30h
  const closed1 = new Date(nowMs - 2 * 60 * 60 * 1000).toISOString(); // -2h
  const closed2 = new Date(nowMs - 10 * 60 * 60 * 1000).toISOString();// -10h

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

  // Horses (with Win + Place odds)
  const horses = [
    { n: 1, name: "Harley's Pride", win: [1.74, 0.0], place: [0.22, 0.0] },
    { n: 2, name: "Kian's Joy",     win: [3.57, 0.0], place: [0.46, 0.0] },
    { n: 3, name: "Alicia's Pride", win: [3.57, 0.0], place: [0.46, 0.0] },
    { n: 4, name: "Kilo's Jet",     win: [12.5, 0.0], place: [1.62, 0.0] },
    { n: 5, name: "Underdog",       win: [10, 0.0],   place: [1.62, 0.0] },
  ];

  for (const h of horses) {
    await run(
      `INSERT INTO horses (race_id, horse_number, name, win_num, win_den, place_num, place_den, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [r1.lastID, h.n, h.name, h.win[0], h.win[1], h.place[0], h.place[1], now]
    );
    await run(
      `INSERT INTO horses (race_id, horse_number, name, win_num, win_den, place_num, place_den, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [r2.lastID, h.n, h.name, h.win[0], h.win[1], h.place[0], h.place[1], now]
    );
  }

  // Users: SUPER ADMIN + demo players
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