const express = require("express");
const router = express.Router();
const { get, all, run } = require("../db");

router.get("/users", async (req, res) => {
  const rows = await all(
    "SELECT id, name, email, balance FROM users WHERE role='PLAYER' AND status='ACTIVE' ORDER BY id ASC"
  );
  res.json(rows);
});

router.get("/bets/recent", async (req, res) => {
  const rows = await all(
    `
    SELECT
      b.id, b.stake, b.created_at,
      u.id as user_id, u.name as user_name,
      h.id as horse_id, h.horse_number, h.name as horse_name,
      r.id as race_id, r.race_number, r.status as race_status, r.race_datetime
    FROM bets b
    JOIN users u ON u.id=b.user_id
    JOIN horses h ON h.id=b.horse_id
    JOIN races r ON r.id=h.race_id
    ORDER BY b.id DESC
    LIMIT 30
    `
  );
  res.json(rows);
});

router.post("/bets", async (req, res) => {
  try {
    const user_id = Number(req.body?.user_id);
    const horse_id = Number(req.body?.horse_id);
    const stake = Number(req.body?.stake);

    if (!user_id || !horse_id || !stake || stake <= 0) {
      return res.status(400).json({ error: "user_id, horse_id and stake (>0) required" });
    }

    const horse = await get(
      `
      SELECT h.id as horse_id, h.name as horse_name, h.race_id,
             r.status as race_status
      FROM horses h
      JOIN races r ON r.id=h.race_id
      WHERE h.id=?
      `,
      [horse_id]
    );
    if (!horse) return res.status(404).json({ error: "Horse not found" });
    if ((horse.race_status || "").toUpperCase() !== "OPEN") {
      return res.status(400).json({ error: "Race is closed. No more bets." });
    }

    const user = await get(
      "SELECT id, name, balance FROM users WHERE id=? AND role='PLAYER' AND status='ACTIVE'",
      [user_id]
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const balance = Number(user.balance || 0);
    if (balance < stake) return res.status(400).json({ error: "Insufficient wallet balance" });

    const now = new Date().toISOString();

    await run("BEGIN");
    await run("UPDATE users SET balance = balance - ? WHERE id=?", [stake, user_id]);
    const ins = await run(
      "INSERT INTO bets (user_id, horse_id, stake, created_at) VALUES (?,?,?,?)",
      [user_id, horse_id, stake, now]
    );
    await run("COMMIT");

    const updatedUser = await get("SELECT id, name, balance FROM users WHERE id=?", [user_id]);

    res.json({
      ok: true,
      bet_id: ins.lastID,
      user: updatedUser,
      horse: { id: horse.horse_id, name: horse.horse_name },
      stake,
      created_at: now,
    });
  } catch (e) {
    try { await run("ROLLBACK"); } catch {}
    res.status(500).json({ error: "Failed to place bet" });
  }
});

module.exports = router;