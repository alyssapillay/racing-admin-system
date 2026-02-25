const bcrypt = require("bcrypt");
const { run, get } = require("./db");

function isoPlusHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}
function isoMinusHours(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

async function seedIfEmpty() {
  // If already seeded, skip
  const existing = await get("SELECT id FROM users WHERE email = ?", ["superadmin@example.com"]);
  if (existing) return;

  const now = new Date().toISOString();

  // --- SUPER ADMIN ---
  const adminHash = await bcrypt.hash("DemoPass123", 10);
  await run(
    `INSERT INTO users (name,email,password_hash,role,balance,status,created_at)
     VALUES (?,?,?,?,?,?,?)`,
    ["Super Admin", "superadmin@example.com", adminHash, "SUPER_ADMIN", 0, "ACTIVE", now]
  );

  // --- PLAYERS (correct names) ---
  const playerHash = await bcrypt.hash("DemoPass123", 10);
  const players = [
    ["Alyssa", "alyssa@example.com", 10000],
    ["Kiruben", "kiruben@example.com", 10000],
    ["Dion", "dion@example.com", 10000],
    ["Leo", "leo@example.com", 20000],
  ];

  for (const [name, email, balance] of players) {
    await run(
      `INSERT INTO users (name,email,password_hash,role,balance,status,created_at)
       VALUES (?,?,?,?,?,?,?)`,
      [name, email.toLowerCase().trim(), playerHash, "PLAYER", balance, "ACTIVE", now]
    );
  }

  // --- SPORT: HORSE RACING ---
  const sport = await run(
    `INSERT INTO sports (code,name,created_at) VALUES (?,?,?)`,
    ["HORSE_RACING", "Horse Racing", now]
  );
  const sportId = sport.lastID;

  // --- COUNTRIES ---
  const sa = await run(
    `INSERT INTO countries (sport_id,name,created_at) VALUES (?,?,?)`,
    [sportId, "South Africa", now]
  );
  const uk = await run(
    `INSERT INTO countries (sport_id,name,created_at) VALUES (?,?,?)`,
    [sportId, "United Kingdom", now]
  );

  // --- COURSES ---
  const greyville = await run(
    `INSERT INTO courses (country_id,name,created_at) VALUES (?,?,?)`,
    [sa.lastID, "Greyville", now]
  );
  const ascot = await run(
    `INSERT INTO courses (country_id,name,created_at) VALUES (?,?,?)`,
    [uk.lastID, "Ascot", now]
  );

  // --- RACE DAY (Greyville) ---
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const raceDate = `${yyyy}-${mm}-${dd}`;

  const rd = await run(
    `INSERT INTO race_days (course_id,race_date,total_races,created_at)
     VALUES (?,?,?,?)`,
    [greyville.lastID, raceDate, 4, now]
  );
  const raceDayId = rd.lastID;

  // ✅ 2 OPEN within next 72 hours + 2 CLOSED in past
  const races = [
    { num: 1, dt: isoPlusHours(6),  status: "OPEN" },   // within 72h
    { num: 2, dt: isoPlusHours(48), status: "OPEN" },   // within 72h
    { num: 3, dt: isoMinusHours(3), status: "CLOSED" }, // past
    { num: 4, dt: isoMinusHours(1), status: "CLOSED" }, // past
  ];

  const raceIds = [];
  for (const r of races) {
    const ins = await run(
      `INSERT INTO races (race_day_id,race_number,race_datetime,status,created_at)
       VALUES (?,?,?,?,?)`,
      [raceDayId, r.num, r.dt, r.status, now]
    );
    raceIds.push(ins.lastID);
  }

  // --- HORSES per race ---
  const horsesByRace = [
    [
      { n: 1, name: "Harley's Pride", odds: [12, 10] },
      { n: 2, name: "Kian's Joy", odds: [2, 1] },
      { n: 3, name: "Alyssa's Pride", odds: [5, 2] },
      { n: 4, name: "Kilo's Jet", odds: [1, 1] },
    ],
    [
      { n: 1, name: "Midnight Valor", odds: [3, 1] },
      { n: 2, name: "Golden Crest", odds: [7, 2] },
      { n: 3, name: "Storm Runner", odds: [11, 4] },
      { n: 4, name: "Ocean Whisper", odds: [9, 2] },
    ],
    [
      { n: 1, name: "Silver Lantern", odds: [6, 1] },
      { n: 2, name: "Crimson Tide", odds: [4, 1] },
      { n: 3, name: "Zulu Spirit", odds: [10, 1] },
      { n: 4, name: "Night Bloom", odds: [8, 1] },
    ],
    [
      { n: 1, name: "Emerald Rush", odds: [5, 1] },
      { n: 2, name: "Royal Echo", odds: [13, 2] },
      { n: 3, name: "Thunder Bay", odds: [7, 1] },
      { n: 4, name: "Blue Horizon", odds: [9, 1] },
    ],
  ];

  for (let i = 0; i < raceIds.length; i++) {
    for (const h of horsesByRace[i]) {
      await run(
        `INSERT INTO horses (race_id,horse_number,name,odds_num,odds_den,created_at)
         VALUES (?,?,?,?,?,?)`,
        [raceIds[i], h.n, h.name, h.odds[0], h.odds[1], now]
      );
    }
  }

  // Optional: Ascot (Open within 72h)
  const rd2 = await run(
    `INSERT INTO race_days (course_id,race_date,total_races,created_at)
     VALUES (?,?,?,?)`,
    [ascot.lastID, raceDate, 1, now]
  );

  const ascotR1 = await run(
    `INSERT INTO races (race_day_id,race_number,race_datetime,status,created_at)
     VALUES (?,?,?,?,?)`,
    [rd2.lastID, 1, isoPlusHours(24), "OPEN", now]
  );

  await run(
    `INSERT INTO horses (race_id,horse_number,name,odds_num,odds_den,created_at)
     VALUES (?,?,?,?,?,?)`,
    [ascotR1.lastID, 1, "London Crown", 2, 1, now]
  );
  await run(
    `INSERT INTO horses (race_id,horse_number,name,odds_num,odds_den,created_at)
     VALUES (?,?,?,?,?,?)`,
    [ascotR1.lastID, 2, "Ascot Flame", 7, 2, now]
  );

  console.log("✅ Seed complete: 2 OPEN (next 72h) + 2 CLOSED, players fixed (Alyssa, Kiruben).");
}

module.exports = { seedIfEmpty };