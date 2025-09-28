// src/middlewares/authMiddleware.js
import jwt from "jsonwebtoken";

/**
 * Attach user if token exists, else continue.
 * Use when you want user info but don’t force login.
 */
export const authMiddleware = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return next(); // no token → continue without user
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    req.user = decoded;
  } catch (err) {
    console.error("[authMiddleware] Invalid token:", err.message);
    res.clearCookie("token");
  }
  next();
};

/**
 * Require authentication — blocks if no valid token.
 * Use when protecting routes/pages.
 */
export const requireAuth = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.redirect("/auth/login");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    req.user = decoded;
    next();
  } catch (err) {
    console.error("[requireAuth] Invalid token:", err.message);
    res.clearCookie("token");
    return res.redirect("/auth/login");
  }
};
