import path from "path";
import express from "express";
import compression from "compression";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import expressLayouts from "express-ejs-layouts";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import session from "express-session";

import { connectDB } from "./config/db.js";
import bookRoutes from "./routes/books.js";
import authRoutes from "./routes/auth.js";


import borrowRoutes from "./routes/borrow.js";
// ...


dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ---------- MIDDLEWARE ----------
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
  })
);

// ---------- VIEWS ----------
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", false);

// ---------- ROUTES ----------
app.use("/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/borrow", borrowRoutes);

app.get("/", (_req, res) => res.redirect("/auth/login"));

// Protectors
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/auth/login");
  next();
}
function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user || req.session.user.role !== role) return res.status(403).send("Forbidden");
    next();
  };
}

// ADMIN dashboard
app.get("/admin", requireRole("admin"), (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// STUDENT dashboard
app.get("/student", requireRole("student"), (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "student.html"));
});

// ---------- ERRORS ----------
app.use((_req, res) => res.status(404).send("Not Found"));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).send("Server Error");
});

// ---------- START ----------
const PORT = process.env.PORT || 3000;
connectDB(process.env.MONGODB_URI).then(() =>
  app.listen(PORT, () => console.log(`🚀 BookHive running at http://localhost:${PORT}`))
);
