const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { run, get, all } = require("../db");

// Utilities
function nowIso() {
  return new Date().toISOString();
}

function parseOdds(str) {
  const [a, b] = String(str)
    .split("/")
    .map((x) => parseInt(x.trim(), 10));
  return { num: a || 1, den: b || 1 };
}

// -------- HORSE RACING NAV FLOW --------
// Sport -> Countries -> Courses -> Race Days -> Races -> Horses

router.get("/sports", async (req, res) => {
  const rows = await all("SELECT * FROM sports ORDER BY name ASC");
  res.json(rows);
});

router.post("/sports", async (req, res) => {
  const { code, name } = req.body || {};
  if (!code || !name) return res.status(400).json({ error: "code and name required" });
  const r = await run("INSERT INTO sports (code,name,created_at) VALUES (?,?,?)", [
    code,
    name,
    nowIso(),
  ]);
  res.json({ id: r.lastID });
});

router.get("/sports/:sportId/countries", async (req, res) => {
  const rows = await all("SELECT * FROM countries WHERE sport_id=? ORDER BY name ASC", [
    req.params.sportId,
  ]);
  res.json(rows);
});

router.post("/sports/:sportId/countries", async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
  const r = await run("INSERT INTO countries (sport_id,name,created_at) VALUES (?,?,?)", [
    req.params.sportId,
    name,
    nowIso(),
  ]);
  res.json({ id: r.lastID });
});

router.get("/countries/:countryId/courses", async (req, res) => {
  const rows = await all("SELECT * FROM courses WHERE country_id=? ORDER BY name ASC", [
    req.params.countryId,
  ]);
  res.json(rows);
});

router.post("/countries/:countryId/courses", async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
  const r = await run("INSERT INTO courses (country_id,name,created_at) VALUES (?,?,?)", [
    req.params.countryId,
    name,
    nowIso(),
  ]);
  res.json({ id: r.lastID });
});

// Race Day: create date + number of races (dynamic) -> creates races 1..N
router.post("/courses/:courseId/race-days", async (req, res) => {
  const { race_date, total_races } = req.body || {};
  const total = Number(total_races);

  if (!race_date || !total || total < 1 || total > 20) {
    return res.status(400).json({ error: "race_date and total_races (1..20) required" });
  }

  const now = nowIso();

  const rd = await run(
    "INSERT INTO race_days (course_id,race_date,total_races,created_at) VALUES (?,?,?,?)",
    [req.params.courseId, race_date, total, now]
  );

  // Default race datetimes: race_date 12:00, 12:10... (Admin can edit per race)
  for (let i = 1; i <= total; i++) {
    const minutes = String((i - 1) * 10).padStart(2, "0");
    const dt = new Date(`${race_date}T12:${minutes}:00.000Z`).toISOString();

    await run(
      "INSERT INTO races (race_day_id,race_number,race_datetime,status,created_at) VALUES (?,?,?,?,?)",
      [rd.lastID, i, dt, "OPEN", now]
    );
  }

  res.json({ id: rd.lastID });
});

router.get("/courses/:courseId/race-days", async (req, res) => {
  const rows = await all(
    "SELECT rd.* FROM race_days rd WHERE rd.course_id=? ORDER BY rd.race_date DESC",
    [req.params.courseId]
  );
  res.json(rows);
});

// ✅ NEW: All races for a course (used by dropdown bet flow)
router.get("/courses/:courseId/races-upcoming", async (req, res) => {
  const rows = await all(
    `SELECT
       r.id,
       r.race_day_id,
       r.race_number,
       r.race_datetime,
       r.status,
       rd.race_date,
       c.name as course_name
     FROM races r
     JOIN race_days rd ON rd.id = r.race_day_id
     JOIN courses c ON c.id = rd.course_id
     WHERE rd.course_id = ?
     ORDER BY r.race_datetime ASC`,
    [req.params.courseId]
  );
  res.json(rows);
});

router.get("/race-days/:raceDayId/races", async (req, res) => {
  const rows = await all("SELECT * FROM races WHERE race_day_id=? ORDER BY race_number ASC", [
    req.params.raceDayId,
  ]);
  res.json(rows);
});

// Set race time (datetime) - no manual close endpoint on purpose
router.patch("/races/:raceId", async (req, res) => {
  const { race_datetime } = req.body || {};
  if (!race_datetime) return res.status(400).json({ error: "race_datetime required (ISO)" });

  await run("UPDATE races SET race_datetime=? WHERE id=?", [race_datetime, req.params.raceId]);
  res.json({ ok: true });
});

router.get("/races/:raceId/horses", async (req, res) => {
  const rows = await all("SELECT * FROM horses WHERE race_id=? ORDER BY horse_number ASC", [
    req.params.raceId,
  ]);
  res.json(rows);
});

router.post("/races/:raceId/horses", async (req, res) => {
  const { horse_number, name, odds } = req.body || {};
  const hn = Number(horse_number);

  if (!hn || !name || !odds) {
    return res.status(400).json({ error: "horse_number, name, odds required" });
  }

  const { num, den } = parseOdds(odds);

  const r = await run(
    "INSERT INTO horses (race_id,horse_number,name,odds_num,odds_den,created_at) VALUES (?,?,?,?,?,?)",
    [req.params.raceId, hn, name, num, den, nowIso()]
  );

  res.json({ id: r.lastID });
});

router.delete("/horses/:horseId", async (req, res) => {
  await run("DELETE FROM horses WHERE id=?", [req.params.horseId]);
  res.json({ ok: true });
});

// -------- USERS (wallet) --------
router.get("/users", async (req, res) => {
  const rows = await all(
    "SELECT id,name,email,role,balance,status,created_at FROM users ORDER BY role ASC, name ASC"
  );
  res.json(rows);
});

router.post("/users", async (req, res) => {
  const { name, email, balance } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: "name and email required" });

  // Demo default password for players
  const pwdHash = await bcrypt.hash("DemoPass123", 10);

  const r = await run(
    "INSERT INTO users (name,email,password_hash,role,balance,status,created_at) VALUES (?,?,?,?,?,?,?)",
    [name, email.toLowerCase().trim(), pwdHash, "PLAYER", Number(balance || 0), "ACTIVE", nowIso()]
  );

  res.json({ id: r.lastID });
});

router.patch("/users/:userId/balance", async (req, res) => {
  const { balance } = req.body || {};
  if (balance === undefined) return res.status(400).json({ error: "balance required" });

  await run("UPDATE users SET balance=? WHERE id=? AND role='PLAYER'", [
    Number(balance),
    req.params.userId,
  ]);

  res.json({ ok: true });
});

// -------- PLACE BET (demo phase) --------
// Super Admin places a bet on behalf of a PLAYER (wallet deduction only)
router.post("/bets/place", async (req, res) => {
  const { user_id, horse_id, stake } = req.body || {};
  const stakeNum = Number(stake);

  if (!user_id || !horse_id || !stakeNum || stakeNum <= 0) {
    return res.status(400).json({ error: "user_id, horse_id, stake required" });
  }

  const horse = await get(
    `SELECT h.*, r.status as race_status, r.race_datetime, r.id as race_id
     FROM horses h
     JOIN races r ON r.id=h.race_id
     WHERE h.id=?`,
    [horse_id]
  );
  if (!horse) return res.status(404).json({ error: "horse not found" });

  const now = new Date().toISOString();

  if (horse.race_status !== "OPEN") return res.status(400).json({ error: "race closed" });
  if (horse.race_datetime <= now) return res.status(400).json({ error: "race closed by time" });

  const user = await get(
    "SELECT id,balance,role FROM users WHERE id=? AND role='PLAYER' AND status='ACTIVE'",
    [user_id]
  );
  if (!user) return res.status(404).json({ error: "player not found" });

  if (Number(user.balance) < stakeNum) return res.status(400).json({ error: "insufficient balance" });

  // Deduct wallet then create bet
  await run("UPDATE users SET balance = balance - ? WHERE id=?", [stakeNum, user_id]);

  const b = await run(
    "INSERT INTO bets (user_id,race_id,horse_id,stake,odds_num,odds_den,created_at) VALUES (?,?,?,?,?,?,?)",
    [user_id, horse.race_id, horse_id, stakeNum, horse.odds_num, horse.odds_den, now]
  );

  const updated = await get("SELECT id,balance FROM users WHERE id=?", [user_id]);
  res.json({ ok: true, bet_id: b.lastID, new_balance: updated.balance });
});

// View bets for a race (for demo)
router.get("/races/:raceId/bets", async (req, res) => {
  const rows = await all(
    `SELECT b.*, u.name as user_name, h.horse_number, h.name as horse_name
     FROM bets b
     JOIN users u ON u.id=b.user_id
     JOIN horses h ON h.id=b.horse_id
     WHERE b.race_id=?
     ORDER BY b.created_at DESC`,
    [req.params.raceId]
  );
  res.json(rows);
});

module.exports = router;