// src/middlewares/authMiddleware.js
import jwt from "jsonwebtoken";

export function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "No token, not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    // ✅ attach user
    req.user = decoded;
    next();
  } catch (err) {
    console.error("[authMiddleware] Invalid token:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
