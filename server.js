const express = require("express");
const cors = require("cors");
const path = require("path");
const cron = require("node-cron");
<<<<<<< HEAD
const bcrypt = require("bcrypt");
=======
>>>>>>> 89dd2c76ad1d3d904330befbf4d1100e97157183

const { initDb, run, get } = require("./db");
const { seedIfEmpty } = require("./seed");
const { signToken, authMiddleware, requireRole } = require("./auth");

const adminRoutes = require("./routes/admin");
<<<<<<< HEAD
const bookerRoutes = require("./routes/booker");
=======
const bookerRoutes = require("./routes/booker"); // ✅ ADD THIS

const bcrypt = require("bcrypt");
>>>>>>> 89dd2c76ad1d3d904330befbf4d1100e97157183

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

<<<<<<< HEAD
// Login (Super Admin + Sub Admin)
=======
// Login
>>>>>>> 89dd2c76ad1d3d904330befbf4d1100e97157183
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });

    const user = await get(
<<<<<<< HEAD
      "SELECT id,name,email,password_hash,role,status,permissions FROM users WHERE email=? AND status='ACTIVE'",
=======
      "SELECT id,name,email,password_hash,role,status FROM users WHERE email=? AND status='ACTIVE'",
>>>>>>> 89dd2c76ad1d3d904330befbf4d1100e97157183
      [email.toLowerCase().trim()]
    );
    if (!user) return res.status(401).json({ error: "invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });

<<<<<<< HEAD
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
=======
    const token = signToken({ userId: user.id, role: user.role, email: user.email, name: user.name });
    res.json({ token, role: user.role, name: user.name });
>>>>>>> 89dd2c76ad1d3d904330befbf4d1100e97157183
  } catch (e) {
    res.status(500).json({ error: "login failed" });
  }
});

<<<<<<< HEAD
// Admin API (Super + Sub)
app.use("/api/admin", authMiddleware, requireRole("SUPER_ADMIN", "SUB_ADMIN"), adminRoutes);

// Booker API (Super + Sub; permission enforced inside routes)
app.use("/api/booker", authMiddleware, requireRole("SUPER_ADMIN", "SUB_ADMIN"), bookerRoutes);

// Auto-close races every 5 seconds (strict)
=======
// Admin API
app.use("/api/admin", authMiddleware, requireRole("SUPER_ADMIN"), adminRoutes);

// ✅ Booker API (wallet betting endpoints)
app.use("/api/booker", authMiddleware, requireRole("SUPER_ADMIN"), bookerRoutes);

// Auto-close races every 5 seconds (demo-safe)
>>>>>>> 89dd2c76ad1d3d904330befbf4d1100e97157183
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