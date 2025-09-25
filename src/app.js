// app.js
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import bookRoutes from "./routes/bookRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/books", bookRoutes);
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// ✅ Only start server if not in test mode
if (process.env.NODE_ENV !== "test") {
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
}

export default app; // ✅ Export for Supertest
