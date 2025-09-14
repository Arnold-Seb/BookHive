import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import bookRoutes from "./routes/books.js";










dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Required to use __dirname with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from "public" folder
app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use("/api/books", bookRoutes);

// Root route
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Connect DB and start server
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
