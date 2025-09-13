import express from "express";
import mongoose from "mongoose";

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to local MongoDB
mongoose.connect("mongodb://localhost:27017/myprojectDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("MongoDB Connected");
  // Start server only after successful DB connection
  app.listen(PORT, () => {
    console.log(`BookHive running at http://localhost:${PORT}`);
  });
})
.catch((err) => {
  console.error("MongoDB connection error:", err);
  process.exit(1);
});

// Simple route
app.get("/", (_req, res) => {
  res.send("BookHive up! MongoDB connected if you saw the 'MongoDB Connected' log.");
});
