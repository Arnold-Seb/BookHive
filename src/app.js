// src/app.js
import path from "path";
import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import compression from "compression";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import expressLayouts from "express-ejs-layouts";
import jwt from "jsonwebtoken";

import { connectDB } from "./config/db.js";
import { JWT_SECRET } from "./config/secrets.js";
import bookRoutes from "./routes/bookRoutes.js";
import authRoutes from "./routes/auth.js";
import borrowRoutes from "./routes/borrow.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------- MIDDLEWARE ---------- */
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

/* ---------- JWT Middleware ---------- */
app.use((req, res, next) => {
  const token = req.cookies?.token;
  console.log("🍪 Incoming token:", token ? token.substring(0, 30) + "..." : "none");

  if (token) {
    try {
      console.log("🔑 [app.js] Verifying with secret:", JWT_SECRET);
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log("✅ Verified token payload:", decoded);
      req.user = decoded;
      res.locals.user = decoded;
    } catch (err) {
      console.warn("❌ Invalid token:", err.message);
      req.user = null;
      res.locals.user = null;
    }
  } else {
    req.user = null;
    res.locals.user = null;
  }
  next();
});

/* ---------- VIEWS ---------- */
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", false);

/* ---------- ROUTES ---------- */
app.use("/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/borrow", borrowRoutes);

app.get("/", (req, res) => {
  res.clearCookie("token");
  return res.redirect("/auth/login");
});

/* ---------- Search Page ---------- */
app.get("/search", (req, res) => {
  console.log("🔎 /search accessed. req.user =", req.user);
  if (!req.user) {
    console.log("↩️ No user, redirecting to /auth/login");
    return res.redirect("/auth/login");
  }
  res.render("search", {
    title: "Search · BookHive",
    user: req.user,
  });
});

/* ---------- Dashboards ---------- */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      console.warn(`🚫 Forbidden: expected role=${role}, got=`, req.user?.role);
      return res.status(403).send("Forbidden");
    }
    next();
  };
}

app.get("/admin", requireRole("admin"), (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/student", requireRole("student"), (_req, res) => {
  console.log("👩‍🎓 Student forwarded to /search");
  res.redirect("/search");
});

/* ---------- ERRORS ---------- */
app.use((_req, res) => res.status(404).send("Not Found"));
app.use((err, _req, res, _next) => {
  console.error("🔥 Uncaught error:", err);
  res.status(500).send("Server Error");
});

/* ---------- START ---------- */
if (process.env.NODE_ENV !== "test") {
  connectDB(process.env.MONGODB_URI)
    .then(() =>
      app.listen(PORT, () =>
        console.log(`🚀 BookHive running at http://localhost:${PORT}`)
      )
    )
    .catch((err) => {
      console.error("❌ DB init failed:", err);
      process.exit(1);
    });
}

export default app;
