const express = require("express");
const router = express.Router();
const { get, all, run } = require("../db");

function normalizeCode(code) {
  const c = String(code || "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(c)) return c;
  return "";
}
function inferCountryCodeFromName(name) {
  const n = String(name || "").trim().toLowerCase();
  const map = {
    "south africa": "ZA", "sa": "ZA",
    "united kingdom": "GB", "uk": "GB",
    "united states": "US", "usa": "US",
    "australia": "AU", "ireland": "IE", "france": "FR",
    "qatar": "QA", "new zealand": "NZ", "canada": "CA", "india": "IN",
    "united arab emirates": "AE", "uae": "AE",
  };
  return map[n] || "";
}

/* SPORTS */
router.get("/sports", async (req, res) => {
  const rows = await all("SELECT id, code, name FROM sports ORDER BY id ASC");
  res.json(rows);
});

/* COUNTRIES */
router.get("/sports/:sportId/countries", async (req, res) => {
  const sportId = Number(req.params.sportId);
  const rows = await all(
    "SELECT id, sport_id, name, country_code FROM countries WHERE sport_id=? ORDER BY name ASC",
    [sportId]
  );
  res.json(rows);
});

router.post("/sports/:sportId/countries", async (req, res) => {
  try {
    const sportId = Number(req.params.sportId);
    const name = (req.body?.name || "").trim();
    let country_code = normalizeCode(req.body?.country_code);

    if (!sportId || !name) return res.status(400).json({ error: "sportId and name required" });
    if (!country_code) country_code = inferCountryCodeFromName(name);

    const exists = await get(
      "SELECT id FROM countries WHERE sport_id=? AND LOWER(name)=LOWER(?)",
      [sportId, name]
    );
    if (exists) return res.status(409).json({ error: "Country already exists" });

    const now = new Date().toISOString();
    const ins = await run(
      "INSERT INTO countries (sport_id, name, country_code, created_at) VALUES (?,?,?,?)",
      [sportId, name, country_code, now]
    );
    const created = await get(
      "SELECT id, sport_id, name, country_code FROM countries WHERE id=?",
      [ins.lastID]
    );
    res.json(created);
  } catch {
    res.status(500).json({ error: "Failed to add country" });
  }
});

router.patch("/countries/:countryId", async (req, res) => {
  try {
    const countryId = Number(req.params.countryId);
    const name = (req.body?.name || "").trim();
    let country_code = normalizeCode(req.body?.country_code);
    if (!countryId || !name) return res.status(400).json({ error: "name required" });

    if (!country_code) country_code = inferCountryCodeFromName(name);

    await run("UPDATE countries SET name=?, country_code=? WHERE id=?", [name, country_code, countryId]);
    const updated = await get("SELECT id, sport_id, name, country_code FROM countries WHERE id=?", [countryId]);
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update country" });
  }
});

/* COURSES */
router.get("/countries/:countryId/courses", async (req, res) => {
  const countryId = Number(req.params.countryId);
  const rows = await all("SELECT id, country_id, name FROM courses WHERE country_id=? ORDER BY name ASC", [countryId]);
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
    const ins = await run("INSERT INTO courses (country_id, name, created_at) VALUES (?,?,?)", [countryId, name, now]);
    const created = await get("SELECT id, country_id, name FROM courses WHERE id=?", [ins.lastID]);
    res.json(created);
  } catch {
    res.status(500).json({ error: "Failed to add course" });
  }
});

router.patch("/courses/:courseId", async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const name = (req.body?.name || "").trim();
    if (!courseId || !name) return res.status(400).json({ error: "name required" });

    await run("UPDATE courses SET name=? WHERE id=?", [name, courseId]);
    const updated = await get("SELECT id, country_id, name FROM courses WHERE id=?", [courseId]);
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update course" });
  }
});

/* RACE DAYS */
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
    const race_date = (req.body?.race_date || "").trim();
    if (!courseId || !race_date) return res.status(400).json({ error: "race_date required" });

    const exists = await get("SELECT id FROM race_days WHERE course_id=? AND race_date=?", [courseId, race_date]);
    if (exists) return res.status(409).json({ error: "Race day already exists" });

    const now = new Date().toISOString();
    const ins = await run("INSERT INTO race_days (course_id, race_date, created_at) VALUES (?,?,?)", [courseId, race_date, now]);
    const created = await get("SELECT id, course_id, race_date FROM race_days WHERE id=?", [ins.lastID]);
    res.json(created);
  } catch {
    res.status(500).json({ error: "Failed to add race day" });
  }
});

router.patch("/race-days/:raceDayId", async (req, res) => {
  try {
    const raceDayId = Number(req.params.raceDayId);
    const race_date = (req.body?.race_date || "").trim();
    if (!raceDayId || !race_date) return res.status(400).json({ error: "race_date required" });

    await run("UPDATE race_days SET race_date=? WHERE id=?", [race_date, raceDayId]);
    const updated = await get("SELECT id, course_id, race_date FROM race_days WHERE id=?", [raceDayId]);
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update race day" });
  }
});

/* RACES */
router.get("/race-days/:raceDayId/races", async (req, res) => {
  const raceDayId = Number(req.params.raceDayId);
  const rows = await all(
    "SELECT id, race_day_id, race_number, race_datetime, status FROM races WHERE race_day_id=? ORDER BY race_number ASC",
    [raceDayId]
  );
  res.json(rows);
});

router.post("/race-days/:raceDayId/races/bulk", async (req, res) => {
  try {
    const raceDayId = Number(req.params.raceDayId);
    const count = Number(req.body?.count);
    const start_datetime = (req.body?.start_datetime || "").trim();
    const interval_minutes = Number(req.body?.interval_minutes || 35);

    if (!raceDayId || !count || count < 1 || !start_datetime) {
      return res.status(400).json({ error: "raceDayId, count, start_datetime required" });
    }

    const startMs = new Date(start_datetime).getTime();
    if (!Number.isFinite(startMs)) return res.status(400).json({ error: "Invalid start_datetime" });

    const now = new Date().toISOString();

    await run("BEGIN");
    for (let i = 1; i <= count; i++) {
      const dt = new Date(startMs + (i - 1) * interval_minutes * 60 * 1000).toISOString();
      await run(
        "INSERT OR IGNORE INTO races (race_day_id, race_number, race_datetime, status, created_at) VALUES (?,?,?,?,?)",
        [raceDayId, i, dt, "OPEN", now]
      );
    }
    await run("COMMIT");

    const created = await all(
      "SELECT id, race_number, race_datetime, status FROM races WHERE race_day_id=? ORDER BY race_number ASC",
      [raceDayId]
    );
    res.json(created);
  } catch {
    try { await run("ROLLBACK"); } catch {}
    res.status(500).json({ error: "Failed to bulk add races" });
  }
});

router.patch("/races/:raceId/status", async (req, res) => {
  try {
    const raceId = Number(req.params.raceId);
    const status = (req.body?.status || "").trim().toUpperCase();
    if (!raceId || !["OPEN", "CLOSED"].includes(status)) return res.status(400).json({ error: "status must be OPEN or CLOSED" });

    const now = new Date().toISOString();
    if (status === "CLOSED") {
      await run("UPDATE races SET status='CLOSED', closed_at=? WHERE id=?", [now, raceId]);
    } else {
      await run("UPDATE races SET status='OPEN', closed_at=NULL WHERE id=?", [raceId]);
    }

    const updated = await get("SELECT id, race_number, race_datetime, status FROM races WHERE id=?", [raceId]);
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update race status" });
  }
});

/* HORSES */
router.get("/races/:raceId/horses", async (req, res) => {
  const raceId = Number(req.params.raceId);
  const rows = await all(
    `SELECT id, race_id, horse_number, name, win_num, win_den, place_num, place_den, jockey, trainer, age, notes
     FROM horses WHERE race_id=? ORDER BY horse_number ASC`,
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

    const jockey = (req.body?.jockey || "").trim();
    const trainer = (req.body?.trainer || "").trim();
    const age = Number(req.body?.age || 0);
    const notes = (req.body?.notes || "").trim();

    if (!raceId || !horse_number || !name) return res.status(400).json({ error: "raceId, horse_number, name required" });

    const now = new Date().toISOString();
    const ins = await run(
      `INSERT INTO horses (race_id,horse_number,name,win_num,win_den,place_num,place_den,jockey,trainer,age,notes,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [raceId, horse_number, name, win_num, win_den, place_num, place_den, jockey, trainer, age, notes, now]
    );
    const created = await get("SELECT * FROM horses WHERE id=?", [ins.lastID]);
    res.json(created);
  } catch {
    res.status(500).json({ error: "Failed to add horse" });
  }
});

router.patch("/horses/:horseId", async (req, res) => {
  try {
    const horseId = Number(req.params.horseId);
    if (!horseId) return res.status(400).json({ error: "horseId required" });

    const name = (req.body?.name || "").trim();
    const horse_number = Number(req.body?.horse_number || 0);
    const jockey = (req.body?.jockey || "").trim();
    const trainer = (req.body?.trainer || "").trim();
    const age = Number(req.body?.age || 0);
    const notes = (req.body?.notes || "").trim();

    await run(
      `UPDATE horses SET name=?, horse_number=?, jockey=?, trainer=?, age=?, notes=? WHERE id=?`,
      [name, horse_number, jockey, trainer, age, notes, horseId]
    );

    const updated = await get("SELECT * FROM horses WHERE id=?", [horseId]);
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update horse" });
  }
});

router.patch("/horses/:horseId/odds", async (req, res) => {
  try {
    const horseId = Number(req.params.horseId);
    if (!horseId) return res.status(400).json({ error: "horseId required" });

    const win_num = Number(req.body?.win_num || 0);
    const win_den = Number(req.body?.win_den || 0);
    const place_num = Number(req.body?.place_num || 0);
    const place_den = Number(req.body?.place_den || 0);

    await run("UPDATE horses SET win_num=?, win_den=?, place_num=?, place_den=? WHERE id=?", [win_num, win_den, place_num, place_den, horseId]);
    const updated = await get("SELECT * FROM horses WHERE id=?", [horseId]);
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update odds" });
  }
});

/* USERS */
router.get("/users", async (req, res) => {
  const rows = await all("SELECT id, name, email, role, status, balance FROM users ORDER BY id ASC");
  res.json(rows);
});

router.post("/users", async (req, res) => {
  try {
    const name = (req.body?.name || "").trim();
    const email = (req.body?.email || "").trim().toLowerCase();
    const balance = Number(req.body?.balance || 0);
    if (!name || !email) return res.status(400).json({ error: "name and email required" });

    const placeholderHash = await require("bcrypt").hash("player", 10);
    const now = new Date().toISOString();

    const ins = await run(
      `INSERT INTO users (name,email,password_hash,role,status,balance,created_at)
       VALUES (?,?,?,?,?,?,?)`,
      [name, email, placeholderHash, "PLAYER", "ACTIVE", balance, now]
    );
    const created = await get("SELECT id, name, email, role, status, balance FROM users WHERE id=?", [ins.lastID]);
    res.json(created);
  } catch (e) {
    if ((e.message || "").includes("UNIQUE")) return res.status(409).json({ error: "Email already exists" });
    res.status(500).json({ error: "Failed to add user" });
  }
});

router.patch("/users/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const name = (req.body?.name || "").trim();
    const balance = Number(req.body?.balance);
    if (!userId || !name || Number.isNaN(balance)) return res.status(400).json({ error: "name and balance required" });

    await run("UPDATE users SET name=?, balance=? WHERE id=?", [name, balance, userId]);
    const updated = await get("SELECT id, name, email, role, status, balance FROM users WHERE id=?", [userId]);
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update user" });
  }
});

module.exports = router;