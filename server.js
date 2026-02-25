const express = require("express");
const cors = require("cors");
const path = require("path");
const cron = require("node-cron");
const bcrypt = require("bcrypt");

const { db, initDb, get, run } = require("./db");
const { seedIfEmpty } = require("./seed");
const { signToken, authMiddleware, requireRole } = require("./auth");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Login (Super Admin only for this phase)
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const user = await get(
    "SELECT id,name,email,password_hash,role,status FROM users WHERE email=? AND status='ACTIVE'",
    [email.toLowerCase().trim()]
  );
  if (!user) return res.status(401).json({ error: "invalid credentials" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "invalid credentials" });

  // For now, only SUPER_ADMIN can use the app UI
  const token = signToken({ userId: user.id, role: user.role, email: user.email, name: user.name });
  res.json({ token, role: user.role, name: user.name });
});

// Super Admin API
app.use("/api/admin", authMiddleware, requireRole("SUPER_ADMIN"), adminRoutes);

// Auto-close races every 5 seconds (STRICT)
cron.schedule("*/5 * * * * *", async () => {
  const now = new Date().toISOString();
  await run(
    "UPDATE races SET status='CLOSED', closed_at=? WHERE status='OPEN' AND race_datetime <= ?",
    [now, now]
  );
});
const PORT = process.env.PORT || 3000;
async function start() {
  await initDb();
  await seedIfEmpty();

  app.listen(PORT, () => {
    console.log(`✅ Racing Admin System running on http://localhost:${PORT}`);
  });
}

start();