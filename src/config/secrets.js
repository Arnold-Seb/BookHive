// src/config/secrets.js
import dotenv from "dotenv";
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// ✅ (runs once at startup)
console.log("🔑 Loaded JWT_SECRET =", JWT_SECRET);
