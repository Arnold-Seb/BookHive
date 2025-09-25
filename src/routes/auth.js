import { Router } from "express";
import User from "../models/User.js";

const router = Router();

// ---------- SIGNUP ----------
router.post("/signup", async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  if (password !== confirmPassword) return res.status(400).send("Passwords do not match");

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).send("Email already registered");

    // First registered user becomes admin, others default to student
    const adminExists = await User.exists({ role: "admin" });
    const role = adminExists ? "student" : "admin";

    const user = new User({ name, email, password, role });
    await user.save();

    res.redirect("/auth/login");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ---------- LOGIN ----------
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send("Invalid email or password");

    const isMatch = user.matchPassword
      ? await user.matchPassword(password)
      : await user.comparePassword(password);

    if (!isMatch) return res.status(400).send("Invalid email or password");

    // Save session
    req.session.user = { id: user._id, role: user.role, name: user.name };

    // Redirect by role
    if (user.role === "admin") return res.redirect("/admin");
    return res.redirect("/student");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ---------- LOGOUT ----------
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
});

// ---------- RENDER PAGES ----------
router.get("/login", (_req, res) => res.render("auth/login"));
router.get("/signup", (_req, res) => res.render("auth/signup"));

export default router;
