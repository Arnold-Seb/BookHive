import { Router } from "express";
import User from "../models/User.js";

const router = Router();

// Signup route
router.post("/signup", async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).send("Passwords do not match");
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).send("Email already registered");

    const user = new User({ name, email, password });
    await user.save();

    res.redirect("/auth/login"); // after signup, go to login
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Login route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send("Invalid email or password");

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).send("Invalid email or password");

    // You can create a session or JWT here
    req.session.user = user; // example using express-session
    res.redirect("/admin"); // redirect to user dashboard
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ...existing code...

// Render login page
router.get("/login", (req, res) => {
  res.render("auth/login");
});

// Render signup page
router.get("/signup", (req, res) => {
  res.render("auth/signup");
});





export default router;
