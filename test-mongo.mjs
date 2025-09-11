import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) { console.error("Missing MONGODB_URI"); process.exit(1); }

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log("Connected to MongoDB");
  await mongoose.disconnect();
} catch (e) {
  console.error("Connection failed:", e.message);
  process.exit(1);
}
