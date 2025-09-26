// routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import { JWT_SECRET } from "../config/secrets.js";   // ✅ shared secret

const router = express.Router();

/* ---------- Middleware ---------- */
export function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.redirect("/auth/login");
  try {
    const payload = jwt.verify(token, JWT_SECRET);   // ✅ use shared secret
    req.user = payload;
    next();
  } catch {
    res.clearCookie("token");
    return res.redirect("/auth/login");
  }
}

/* ---------- Auth Routes ---------- */
// GET login page
router.get("/login", (req, res) => {
  res.render("auth/login", {
    title: "Login · BookHive",
    error: null,
    form: null,
    user: req.user,
  });
});

// GET signup page
router.get("/signup", (req, res) => {
  res.render("auth/signup", {
    title: "Sign up · BookHive",
    error: null,
    form: null,
    user: req.user,
  });
});

// POST signup
router.post("/signup", async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  try {
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).render("auth/signup", {
        title: "Sign up · BookHive",
        error: "All fields are required.",
        form: { name, email },
        user: null,
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).render("auth/signup", {
        title: "Sign up · BookHive",
        error: "Passwords do not match.",
        form: { name, email },
        user: null,
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).render("auth/signup", {
        title: "Sign up · BookHive",
        error: "Email already registered.",
        form: { name, email },
        user: null,
      });
    }

    const newUser = await User.create({ name, email, password, role: "student" });

    console.log("🎟️ Issuing signup token for:", {
      id: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role,
    });

    const token = jwt.sign(
      { _id: newUser._id, email: newUser.email, name: newUser.name, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.redirect("/search");
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).render("auth/signup", {
      title: "Sign up · BookHive",
      error: "Server error, please try again later",
      form: { name, email },
      user: null,
    });
  }
});

// POST login
router.post("/login", async (req, res) => {
  const { email, password, asAdmin } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).render("auth/login", {
        title: "Login · BookHive",
        error: "Invalid email or password",
        form: { email, asAdmin }
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).render("auth/login", {
        title: "Login · BookHive",
        error: "Invalid email or password",
        form: { email, asAdmin }
      });
    }

    const role = asAdmin ? "admin" : user.role || "student";

    console.log("🎟️ Issuing login token for:", {
      id: user._id.toString(),
      email: user.email,
      role,
    });

    const token = jwt.sign(
      { _id: user._id, email: user.email, name: user.name, role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.redirect(role === "admin" ? "/admin" : "/search");
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).render("auth/login", {
      title: "Login · BookHive",
      error: "Server error, please try again later",
      form: { email, asAdmin }
    });
  }
});

// POST logout
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  return res.redirect("/auth/login");
});

export default router;
