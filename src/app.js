import path from "path";
import express from "express";
import compression from "compression";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import expressLayouts from "express-ejs-layouts";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import bookRoutes from "./routes/books.js";
import authRoutes from "./routes/auth.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- BASIC MIDDLEWARE ---
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// --- VIEWS ---
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", false);

// --- ROUTES ---
app.use("/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));

// --- ERROR HANDLERS ---
function notFound(req, res) {
  res.status(404).send("Not Found");
}
function genericError(err, req, res, next) {
  console.error(err);
  res.status(500).send("Server Error");
}
app.use(notFound);
app.use(genericError);

// --- START ---
const PORT = process.env.PORT || 3000;
connectDB(process.env.MONGODB_URI)
  .then(() => app.listen(PORT, () => console.log(`🚀 BookHive running at http://localhost:${PORT}`)))
  .catch((err) => {
    console.error("❌ DB init failed:", err);
    process.exit(1);
  });
