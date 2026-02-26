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

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user?.role) return res.status(401).json({ error: "unauthorized" });
    if (req.user.role !== role) return res.status(403).json({ error: "forbidden" });
    next();
  };
}

module.exports = { signToken, authMiddleware, requireRole };