const express = require("express");
const cors = require("cors");
const path = require("path");
const cron = require("node-cron");
const bcrypt = require("bcrypt");

const { initDb, run, get } = require("./db");
const { seedIfEmpty } = require("./seed");
const { signToken, authMiddleware, requireRole } = require("./auth");

const adminRoutes = require("./routes/admin");
const bookerRoutes = require("./routes/booker");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Login (Super Admin + Sub Admin)
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });

    const user = await get(
      "SELECT id,name,email,password_hash,role,status,permissions FROM users WHERE email=? AND status='ACTIVE'",
      [email.toLowerCase().trim()]
    );
    if (!user) return res.status(401).json({ error: "invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });

    let perms = [];
    try { perms = JSON.parse(user.permissions || "[]"); } catch { perms = []; }

    const token = signToken({
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      permissions: perms,
    });

    res.json({ token, role: user.role, name: user.name, permissions: perms });
  } catch (e) {
    res.status(500).json({ error: "login failed" });
  }
});

// Admin API (Super + Sub)
app.use("/api/admin", authMiddleware, requireRole("SUPER_ADMIN", "SUB_ADMIN"), adminRoutes);

// Booker API (Super + Sub; permission enforced inside routes)
app.use("/api/booker", authMiddleware, requireRole("SUPER_ADMIN", "SUB_ADMIN"), bookerRoutes);

// Auto-close races every 5 seconds (strict)
cron.schedule("*/5 * * * * *", async () => {
  const now = new Date().toISOString();
  await run(
    "UPDATE races SET status='CLOSED', closed_at=? WHERE status='OPEN' AND race_datetime <= ?",
    [now, now]
  );
});

async function start() {
  await initDb();
  await seedIfEmpty();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log("Server running on port", PORT));
}

start().catch((e) => {
  console.error("Startup failed:", e);
  process.exit(1);
});