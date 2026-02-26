const express = require("express");
const router = express.Router();

const { get, all, run } = require("../db");

/* -------------------------
   SPORTS
-------------------------- */

router.get("/sports", async (req, res) => {
  const rows = await all("SELECT id, code, name FROM sports ORDER BY id ASC");
  res.json(rows);
});

/* -------------------------
   COUNTRIES (list + add)
-------------------------- */

router.get("/sports/:sportId/countries", async (req, res) => {
  const sportId = Number(req.params.sportId);
  const rows = await all(
    "SELECT id, sport_id, name FROM countries WHERE sport_id=? ORDER BY name ASC",
    [sportId]
  );
  res.json(rows);
});

router.post("/sports/:sportId/countries", async (req, res) => {
  try {
    const sportId = Number(req.params.sportId);
    const name = (req.body?.name || "").trim();
    if (!sportId || !name) return res.status(400).json({ error: "sportId and name required" });

    const exists = await get(
      "SELECT id FROM countries WHERE sport_id=? AND LOWER(name)=LOWER(?)",
      [sportId, name]
    );
    if (exists) return res.status(409).json({ error: "Country already exists" });

    const now = new Date().toISOString();
    const ins = await run(
      "INSERT INTO countries (sport_id, name, created_at) VALUES (?,?,?)",
      [sportId, name, now]
    );
    const created = await get("SELECT id, sport_id, name FROM countries WHERE id=?", [ins.lastID]);
    res.json(created);
  } catch (e) {
    res.status(500).json({ error: "Failed to add country" });
  }
});

/* -------------------------
   COURSES (list + add)
-------------------------- */

router.get("/countries/:countryId/courses", async (req, res) => {
  const countryId = Number(req.params.countryId);
  const rows = await all(
    "SELECT id, country_id, name FROM courses WHERE country_id=? ORDER BY name ASC",
    [countryId]
  );
  res.json(rows);
});

router.post("/countries/:countryId/courses", async (req, res) => {
  try {
    const countryId = Number(req.params.countryId);
    const name = (req.body?.name || "").trim();
    if (!countryId || !name) return res.status(400).json({ error: "countryId and name required" });

    const exists = await get(
      "SELECT id FROM courses WHERE country_id=? AND LOWER(name)=LOWER(?)",
      [countryId, name]
    );
    if (exists) return res.status(409).json({ error: "Course already exists" });

    const now = new Date().toISOString();
    const ins = await run(
      "INSERT INTO courses (country_id, name, created_at) VALUES (?,?,?)",
      [countryId, name, now]
    );
    const created = await get("SELECT id, country_id, name FROM courses WHERE id=?", [ins.lastID]);
    res.json(created);
  } catch (e) {
    res.status(500).json({ error: "Failed to add course" });
  }
});

/* -------------------------
   RACE DAYS (list + add)
-------------------------- */

router.get("/courses/:courseId/race-days", async (req, res) => {
  const courseId = Number(req.params.courseId);
  const rows = await all(
    "SELECT id, course_id, race_date FROM race_days WHERE course_id=? ORDER BY race_date DESC",
    [courseId]
  );
  res.json(rows);
});

router.post("/courses/:courseId/race-days", async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const race_date = (req.body?.race_date || "").trim(); // YYYY-MM-DD
    if (!courseId || !race_date) return res.status(400).json({ error: "courseId and race_date required" });

    const exists = await get(
      "SELECT id FROM race_days WHERE course_id=? AND race_date=?",
      [courseId, race_date]
    );
    if (exists) return res.status(409).json({ error: "Race day already exists" });

    const now = new Date().toISOString();
    const ins = await run(
      "INSERT INTO race_days (course_id, race_date, created_at) VALUES (?,?,?)",
      [courseId, race_date, now]
    );
    const created = await get("SELECT * FROM race_days WHERE id=?", [ins.lastID]);
    res.json(created);
  } catch (e) {
    res.status(500).json({ error: "Failed to add race day" });
  }
});

/* -------------------------
   RACES (list + add) + Upcoming for UI
-------------------------- */

router.get("/race-days/:raceDayId/races", async (req, res) => {
  const raceDayId = Number(req.params.raceDayId);
  const rows = await all(
    "SELECT id, race_day_id, race_number, race_datetime, status FROM races WHERE race_day_id=? ORDER BY race_number ASC",
    [raceDayId]
  );
  res.json(rows);
});

router.post("/race-days/:raceDayId/races", async (req, res) => {
  try {
    const raceDayId = Number(req.params.raceDayId);
    const race_number = Number(req.body?.race_number);
    const race_datetime = (req.body?.race_datetime || "").trim(); // ISO
    if (!raceDayId || !race_number || !race_datetime) {
      return res.status(400).json({ error: "raceDayId, race_number, race_datetime required" });
    }

    const now = new Date().toISOString();
    const ins = await run(
      "INSERT INTO races (race_day_id, race_number, race_datetime, status, created_at) VALUES (?,?,?,?,?)",
      [raceDayId, race_number, race_datetime, "OPEN", now]
    );
    const created = await get("SELECT * FROM races WHERE id=?", [ins.lastID]);
    res.json(created);
  } catch (e) {
    res.status(500).json({ error: "Failed to add race" });
  }
});

router.get("/courses/:courseId/races-upcoming", async (req, res) => {
  const courseId = Number(req.params.courseId);

  const rows = await all(
    `
    SELECT r.id, r.race_number, r.race_datetime, r.status
    FROM races r
    JOIN race_days rd ON rd.id = r.race_day_id
    WHERE rd.course_id=?
    ORDER BY r.race_datetime ASC
    LIMIT 30
  `,
    [courseId]
  );

  res.json(rows);
});

/* -------------------------
   HORSES (list + add + get + edit odds)
-------------------------- */

router.get("/races/:raceId/horses", async (req, res) => {
  const raceId = Number(req.params.raceId);
  const rows = await all(
    `SELECT id, race_id, horse_number, name, win_num, win_den, place_num, place_den
     FROM horses
     WHERE race_id=?
     ORDER BY horse_number ASC`,
    [raceId]
  );
  res.json(rows);
});

router.post("/races/:raceId/horses", async (req, res) => {
  try {
    const raceId = Number(req.params.raceId);
    const horse_number = Number(req.body?.horse_number);
    const name = (req.body?.name || "").trim();

    const win_num = Number(req.body?.win_num || 0);
    const win_den = Number(req.body?.win_den || 0);
    const place_num = Number(req.body?.place_num || 0);
    const place_den = Number(req.body?.place_den || 0);

    if (!raceId || !horse_number || !name) {
      return res.status(400).json({ error: "raceId, horse_number, name required" });
    }

    const now = new Date().toISOString();
    const ins = await run(
      `INSERT INTO horses (race_id, horse_number, name, win_num, win_den, place_num, place_den, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [raceId, horse_number, name, win_num, win_den, place_num, place_den, now]
    );

    const created = await get("SELECT * FROM horses WHERE id=?", [ins.lastID]);
    res.json(created);
  } catch (e) {
    res.status(500).json({ error: "Failed to add horse" });
  }
});

router.get("/horses/:horseId", async (req, res) => {
  const horseId = Number(req.params.horseId);
  const row = await get("SELECT * FROM horses WHERE id=?", [horseId]);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.patch("/horses/:horseId/odds", async (req, res) => {
  try {
    const horseId = Number(req.params.horseId);
    if (!horseId) return res.status(400).json({ error: "horseId required" });

    const win_num = Number(req.body?.win_num || 0);
    const win_den = Number(req.body?.win_den || 0);
    const place_num = Number(req.body?.place_num || 0);
    const place_den = Number(req.body?.place_den || 0);

    await run(
      `UPDATE horses
       SET win_num=?, win_den=?, place_num=?, place_den=?
       WHERE id=?`,
      [win_num, win_den, place_num, place_den, horseId]
    );

    const updated = await get(
      `SELECT id, race_id, horse_number, name, win_num, win_den, place_num, place_den
       FROM horses WHERE id=?`,
      [horseId]
    );

    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "Failed to update odds" });
  }
});

/* -------------------------
   USERS (list + add + set balance)
-------------------------- */

router.get("/users", async (req, res) => {
  const rows = await all(
    "SELECT id, name, email, role, status, balance FROM users ORDER BY id ASC"
  );
  res.json(rows);
});

router.post("/users", async (req, res) => {
  try {
    const name = (req.body?.name || "").trim();
    const email = (req.body?.email || "").trim().toLowerCase();
    const balance = Number(req.body?.balance || 0);

    if (!name || !email) return res.status(400).json({ error: "name and email required" });

    // NOTE: For demo, players don't need passwords (they don't log in)
    // We'll set a placeholder hash and keep role=PLAYER
    const placeholderHash = "$2b$10$FqQXo2B9f1fFZ1Zx5vVjkeF2y6Fz8bKxkQ8jQ8jQ8jQ8jQ8jQ8jQ8"; // fake bcrypt hash

    const now = new Date().toISOString();
    const ins = await run(
      `INSERT INTO users (name, email, password_hash, role, status, balance, created_at)
       VALUES (?,?,?,?,?,?,?)`,
      [name, email, placeholderHash, "PLAYER", "ACTIVE", balance, now]
    );

    const created = await get("SELECT id, name, email, role, status, balance FROM users WHERE id=?", [ins.lastID]);
    res.json(created);
  } catch (e) {
    if ((e.message || "").includes("UNIQUE")) {
      return res.status(409).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Failed to add user" });
  }
});

router.patch("/users/:userId/balance", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const balance = Number(req.body?.balance);
    if (!userId || Number.isNaN(balance)) return res.status(400).json({ error: "userId and balance required" });

    await run("UPDATE users SET balance=? WHERE id=?", [balance, userId]);
    const updated = await get("SELECT id, name, email, role, status, balance FROM users WHERE id=?", [userId]);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "Failed to update balance" });
  }
});

/* -------------------------
   PLACE BET (deduct wallet)
-------------------------- */

router.post("/bets/place", async (req, res) => {
  try {
    const user_id = Number(req.body?.user_id);
    const horse_id = Number(req.body?.horse_id);
    const stake = Number(req.body?.stake);

    if (!user_id || !horse_id || !stake || stake <= 0) {
      return res.status(400).json({ error: "user_id, horse_id, stake required" });
    }

    const user = await get("SELECT id, balance FROM users WHERE id=? AND status='ACTIVE'", [user_id]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const horse = await get(
      `SELECT h.id, h.race_id, r.status AS race_status
       FROM horses h
       JOIN races r ON r.id = h.race_id
       WHERE h.id=?`,
      [horse_id]
    );
    if (!horse) return res.status(404).json({ error: "Horse not found" });

    if (horse.race_status !== "OPEN") return res.status(400).json({ error: "Race is closed" });
    if (Number(user.balance) < stake) return res.status(400).json({ error: "Insufficient balance" });

    const now = new Date().toISOString();

    await run("BEGIN");
    await run("INSERT INTO bets (user_id, horse_id, stake, created_at) VALUES (?,?,?,?)", [
      user_id,
      horse_id,
      stake,
      now,
    ]);
    await run("UPDATE users SET balance = balance - ? WHERE id=?", [stake, user_id]);
    const updated = await get("SELECT balance FROM users WHERE id=?", [user_id]);
    await run("COMMIT");

    res.json({ ok: true, new_balance: Number(updated.balance) });
  } catch (e) {
    try { await run("ROLLBACK"); } catch {}
    res.status(500).json({ error: "Failed to place bet" });
  }
});

module.exports = router;