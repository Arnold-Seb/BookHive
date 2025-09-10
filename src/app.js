import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => {
  res.send("BookHive up! MongoDB connected if you saw the “MongoDB connected” log.");
});

connectDB(process.env.MONGODB_URI).then(() => {
  app.listen(PORT, () =>
    console.log(`BookHive running at http://localhost:${PORT}`)
  );
}).catch(err => {
  console.error("DB init failed:", err);
  process.exit(1);
});
