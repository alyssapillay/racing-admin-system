const express = require("express");
const router = express.Router();
const { get, all, run } = require("../db");
const { requirePerm } = require("../auth");

// List player wallets for bet dropdowns / wallet screens
router.get("/users", requirePerm("PLACE_BET"), async (req, res) => {
try {
const rows = await all(
`
SELECT id, name, email, balance
FROM users
WHERE role='PLAYER' AND status='ACTIVE'
ORDER BY id ASC
`
);
res.json(rows);
} catch {
res.status(500).json({ error: "Failed to load users" });
}
});

// Recent bets
router.get("/bets/recent", requirePerm("VIEW_BETS"), async (req, res) => {
try {
const rows = await all(
`
SELECT
b.id,
b.stake,
b.created_at,
u.id AS user_id,
u.name AS user_name,
u.balance AS current_balance,
h.id AS horse_id,
h.horse_number,
h.name AS horse_name,
r.id AS race_id,
r.race_number,
r.status AS race_status,
r.race_datetime
FROM bets b
JOIN users u ON u.id = b.user_id
JOIN horses h ON h.id = b.horse_id
JOIN races r ON r.id = h.race_id
ORDER BY b.id DESC
LIMIT 50
`
);
res.json(rows);
} catch {
res.status(500).json({ error: "Failed to load recent bets" });
}
});

// Wallet bet placement
router.post("/bets", requirePerm("PLACE_BET"), async (req, res) => {
let inTx = false;

try {
const user_id = Number(req.body?.user_id);
const horse_id = Number(req.body?.horse_id);
const stake = Number(req.body?.stake);

if (!user_id || !horse_id || !stake || stake <= 0) {
return res.status(400).json({ error: "user_id, horse_id and stake (>0) required" });
}

// Get horse + race info
const horse = await get(
`
SELECT
h.id AS horse_id,
h.name AS horse_name,
h.horse_number,
h.race_id,
r.race_number,
r.race_datetime,
r.status AS race_status
FROM horses h
JOIN races r ON r.id = h.race_id
WHERE h.id = ?
`,
[horse_id]
);

if (!horse) {
return res.status(404).json({ error: "Horse not found" });
}

const raceStatus = String(horse.race_status || "").toUpperCase();
if (raceStatus !== "OPEN") {
return res.status(400).json({ error: "Race is closed. No more bets." });
}

// Extra safety: if time has passed but cron hasn't closed yet, block it
const raceTime = new Date(horse.race_datetime).getTime();
if (Number.isFinite(raceTime) && Date.now() >= raceTime) {
return res.status(400).json({ error: "Race time has passed. No more bets." });
}

// Get user wallet
const user = await get(
`
SELECT id, name, balance
FROM users
WHERE id = ? AND role = 'PLAYER' AND status = 'ACTIVE'
`,
[user_id]
);

if (!user) {
return res.status(404).json({ error: "User not found" });
}

const currentBalance = Number(user.balance || 0);
if (currentBalance < stake) {
return res.status(400).json({ error: "Insufficient wallet balance" });
}

const now = new Date().toISOString();

// Transaction: insert bet + deduct wallet together
await run("BEGIN IMMEDIATE");
inTx = true;

const betInsert = await run(
`
INSERT INTO bets (user_id, horse_id, stake, created_at)
VALUES (?,?,?,?)
`,
[user_id, horse_id, stake, now]
);

const walletUpdate = await run(
`
UPDATE users
SET balance = balance - ?
WHERE id = ? AND balance >= ?
`,
[stake, user_id, stake]
);

if (!walletUpdate.changes) {
throw new Error("Wallet deduction failed");
}

await run("COMMIT");
inTx = false;

const updatedUser = await get(
`
SELECT id, name, email, balance
FROM users
WHERE id = ?
`,
[user_id]
);

const createdBet = await get(
`
SELECT
b.id,
b.stake,
b.created_at,
u.id AS user_id,
u.name AS user_name,
h.id AS horse_id,
h.horse_number,
h.name AS horse_name,
r.id AS race_id,
r.race_number,
r.race_datetime
FROM bets b
JOIN users u ON u.id = b.user_id
JOIN horses h ON h.id = b.horse_id
JOIN races r ON r.id = h.race_id
WHERE b.id = ?
`,
[betInsert.lastID]
);

return res.json({
ok: true,
message: "Bet placed successfully",
bet: createdBet,
wallet: {
user_id: updatedUser.id,
name: updatedUser.name,
balance: Number(updatedUser.balance || 0),
},
});
} catch (e) {
if (inTx) {
try {
await run("ROLLBACK");
} catch {}
}
return res.status(500).json({
error: e.message || "Failed to place bet",
});
}
});

module.exports = router;