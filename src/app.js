// src/app.js
import "dotenv/config"; // Load .env early for ESM

import path from "path";
import express from "express";
import compression from "compression";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import expressLayouts from "express-ejs-layouts";
import jwt from "jsonwebtoken";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import bookRoutes from "./routes/bookRoutes.js"; // <-- if your file is different, update the path

// ESM-safe __dirname / __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------- MIDDLEWARE ---------- */
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

/* ---------- VIEWS ---------- */
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", false);

/* ---------- Attach logged-in user ---------- */
app.use((req, _res, next) => {
  const token = req.cookies?.token;
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.SESSION_SECRET || "dev-secret");
    } catch {
      // ignore invalid/expired token
    }
  }
  next();
});

/* ---------- ROUTES ---------- */
app.use("/auth", authRoutes);
app.use("/api/books", bookRoutes);

// Default to auth login
app.get("/", (_req, res) => res.redirect("/auth/login"));

// Admin dashboard (static page with Add Book form)
app.get("/admin", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Protected Search page
app.get("/search", (req, res) => {
  if (!req.user) return res.redirect("/auth/login");
  res.render("search", { title: "Search Books", user: req.user });
});

/* ---------- ERRORS ---------- */
app.use((req, res) => res.status(404).send("Not Found"));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).send("Server Error");
});

/* ---------- START ---------- */
connectDB(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, () =>
      console.log(`🚀 BookHive running at http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ DB init failed:", err);
    process.exit(1);
  });
