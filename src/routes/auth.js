// src/routes/auth.js
import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { JWT_SECRET } from "../config/secrets.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

/* ------------------------ Helpers ------------------------ */
function issueCookie(res, userPayload) {
  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function isTruthy(v) {
  return v === true || v === "true" || v === "on" || v === "1";
}

function getAdminConfig() {
  const emails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const password = (process.env.ADMIN_PASSWORD || "").trim();
  return { emails, password };
}

function isAdminEmail(email, emails) {
  return emails.includes(String(email || "").toLowerCase());
}

/* ------------------------ Pages ------------------------ */
router.get("/login", (req, res) => {
  res.render("auth/login", {
    title: "Login · BookHive",
    error: null,
    form: {},
    user: req.user || null,
  });
});

router.get("/signup", (req, res) => {
  res.render("auth/signup", {
    title: "Sign up · BookHive",
    error: null,
    form: {},
    user: req.user || null,
  });
});

/* ------------------------ Actions ------------------------ */
// USER SIGNUP
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).render("auth/signup", {
        title: "Sign up · BookHive",
        error: "Please fill all fields.",
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

    const lower = email.toLowerCase();
    const exists = await User.findOne({ email: lower });
    if (exists) {
      return res.status(400).render("auth/signup", {
        title: "Sign up · BookHive",
        error: "Email already registered.",
        form: { name, email },
        user: null,
      });
    }

    const created = await User.create({ name, email: lower, password, role: "user" });

    issueCookie(res, {
      id: created._id,
      name: created.name,
      email: created.email,
      role: "user",
    });
    return res.redirect("/search");
  } catch (err) {
    console.error("[SIGNUP]", err);
    return res.status(500).render("auth/signup", {
      title: "Sign up · BookHive",
      error: "Server error",
      form: {},
      user: null,
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const emailRaw = (req.body?.email || "").trim();
    const passwordRaw = (req.body?.password || "").trim();
    const asAdmin = isTruthy(req.body?.asAdmin);
    const form = { email: emailRaw, asAdmin };

    if (!emailRaw || !passwordRaw) {
      return res.status(400).render("auth/login", {
        title: "Login · BookHive",
        error: "Please enter email and password.",
        form,
        user: null,
      });
    }

    if (asAdmin) {
      const { emails: ADMIN_EMAILS, password: ADMIN_PASSWORD } = getAdminConfig();
      if (!ADMIN_PASSWORD) {
        return res.status(500).render("auth/login", {
          title: "Login · BookHive",
          error: "Server config error. Contact admin.",
          form,
          user: null,
        });
      }

      const lower = emailRaw.toLowerCase();
      const emailOk = isAdminEmail(lower, ADMIN_EMAILS);
      const passOk = passwordRaw === ADMIN_PASSWORD;

      if (!emailOk) {
        return res.status(400).render("auth/login", {
          title: "Login · BookHive",
          error: "That email is not on the admin list.",
          form,
          user: null,
        });
      }
      if (!passOk) {
        return res.status(400).render("auth/login", {
          title: "Login · BookHive",
          error: "Incorrect admin password.",
          form,
          user: null,
        });
      }

      issueCookie(res, { name: "Administrator", email: lower, role: "admin" });
      return res.redirect("/admin");
    }

    const { emails: ADMIN_EMAILS } = getAdminConfig();
    if (isAdminEmail(emailRaw, ADMIN_EMAILS)) {
      return res.status(400).render("auth/login", {
        title: "Login · BookHive",
        error: "This is an admin email. Tick 'Login as admin'.",
        form: { email: emailRaw, asAdmin: true },
        user: null,
      });
    }

    const user = await User.findOne({ email: emailRaw.toLowerCase() });
    if (!user) {
      return res.status(400).render("auth/login", {
        title: "Login · BookHive",
        error: "Invalid credentials",
        form,
        user: null,
      });
    }

    const ok = user.comparePassword
      ? await user.comparePassword(passwordRaw)
      : await bcrypt.compare(passwordRaw, user.password);

    if (!ok) {
      return res.status(400).render("auth/login", {
        title: "Login · BookHive",
        error: "Invalid credentials",
        form,
        user: null,
      });
    }

    issueCookie(res, {
      id: user._id,
      name: user.name,
      email: user.email,
      role: "user",
    });
    return res.redirect("/search");
  } catch (err) {
    console.error("[LOGIN]", err);
    return res.status(500).render("auth/login", {
      title: "Login · BookHive",
      error: "Server error",
      form: {},
      user: null,
    });
  }
});

// LOGOUT
router.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.redirect("/auth/login");
});

/* ------------------------ List all users (admin only) ------------------------ */
router.get("/users", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const users = await User.find({}, "_id name email role").sort({ name: 1 }).lean();
    res.json(users);
  } catch (err) {
    console.error("[GET USERS]", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

export default router;
