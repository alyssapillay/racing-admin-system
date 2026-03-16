const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "demo_super_secret_change_me";

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return res.status(401).json({ error: "missing token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "invalid token" });
  }
}

<<<<<<< HEAD
function requireRole(...roles) {
  return (req, res, next) => {
    const r = req.user?.role;
    if (!r) return res.status(401).json({ error: "unauthorized" });
    if (!roles.includes(r)) return res.status(403).json({ error: "forbidden" });
=======
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user?.role) return res.status(401).json({ error: "unauthorized" });
    if (req.user.role !== role) return res.status(403).json({ error: "forbidden" });
>>>>>>> 89dd2c76ad1d3d904330befbf4d1100e97157183
    next();
  };
}

<<<<<<< HEAD
function hasPerm(user, perm) {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  const perms = user.permissions || [];
  if (perms.includes("*")) return true;
  return perms.includes(perm);
}

function requirePerm(perm) {
  return (req, res, next) => {
    if (hasPerm(req.user, perm)) return next();
    return res.status(403).json({ error: "permission denied" });
  };
}

module.exports = { signToken, authMiddleware, requireRole, requirePerm, hasPerm };
=======
module.exports = { signToken, authMiddleware, requireRole };
>>>>>>> 89dd2c76ad1d3d904330befbf4d1100e97157183
