import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.redirect("/auth/login");
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, name, email, role }
    next();
  } catch {
    res.clearCookie("token");
    return res.redirect("/auth/login");
  }
}

export function attachUserIfPresent(req, _res, next) {
  const token = req.cookies?.token;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
  } catch { /* ignore */ }
  next();
}

export function requireAdmin(req, res, next) {
  if (req.user?.role === "admin") return next();
  return res.status(403).send("Forbidden");
}
