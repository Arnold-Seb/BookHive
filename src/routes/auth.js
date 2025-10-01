// src/routes/auth.js
import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { JWT_SECRET } from "../config/secrets.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router(); //create an instance router

/* ------------------------ Helpers ------------------------ */
function issueCookie(res, userPayload) {
  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "7d" }); //creates a 7-day token
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function isTruthy(v) {
  return v === true || v === "true" || v === "on" || v === "1";  //normalize truthy values
}

function getAdminConfig() {
  const emails = (process.env.ADMIN_EMAILS || "")//read all admin emails from env var
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const password = (process.env.ADMIN_PASSWORD || "").trim(); //read admin password from env var
  return { emails, password };
}

function isAdminEmail(email, emails) {
  return emails.includes(String(email || "").toLowerCase()); //check if email is in admin list
}

/* ------------------------ Pages ------------------------ */
router.get("/login", (req, res) => {        //show login page
  res.render("auth/login", {
    title: "Login · BookHive",
    error: null,
    form: {},
    user: req.user || null,
  });
});

router.get("/signup", (req, res) => {  //show signup page
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
    const { name, email, password, confirmPassword } = req.body || {};   //read form inputs
    if (!name || !email || !password) {
      return res.status(400).render("auth/signup", {
        title: "Sign up · BookHive",
        error: "Please fill all fields.",
        form: { name, email },
        user: null,
      });
    }
    if (password !== confirmPassword) {                           //check if passwords match
      return res.status(400).render("auth/signup", {           //if not, show error
        title: "Sign up · BookHive",
        error: "Passwords do not match.",
        form: { name, email },
        user: null,
      });
    }

    const lower = email.toLowerCase();                        //check if email already exists
    const exists = await User.findOne({ email: lower });
    if (exists) {
      return res.status(400).render("auth/signup", {             //if email exists, show error
        title: "Sign up · BookHive",                                        
        error: "Email already registered.",
        form: { name, email },
        user: null,
      });
    }

    const created = await User.create({ name, email: lower, password, role: "user" });      //create new user

    issueCookie(res, {                      //issue JWT cookie
      id: created._id,                          
      name: created.name,
      email: created.email,
      role: "user",
    });
    return res.redirect("/search");              //redirect to search page after signup
  } catch (err) {                                               
    console.error("[SIGNUP]", err);                 //handle server errors                
    return res.status(500).render("auth/signup", {                                            
      title: "Sign up · BookHive",
      error: "Server error",
      form: {},
      user: null,                                                    
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {  //handle login form submission
  try {
    const emailRaw = (req.body?.email || "").trim();             //get email from form
    const passwordRaw = (req.body?.password || "").trim();             //get password from form
    const asAdmin = isTruthy(req.body?.asAdmin);        //check if admin login is requested
    const form = { email: emailRaw, asAdmin };        //preserve form state

    if (!emailRaw || !passwordRaw) {                         //validate inputs
      return res.status(400).render("auth/login", {           //if invalid, show error  
        title: "Login · BookHive",                                  
        error: "Please enter email and password.",                          
        form,   
        user: null,
      });
    }

    if (asAdmin) {                                                                     //handle admin login
      const { emails: ADMIN_EMAILS, password: ADMIN_PASSWORD } = getAdminConfig();                      
      if (!ADMIN_PASSWORD) {                                                                            
        return res.status(500).render("auth/login", {                                           
          title: "Login · BookHive",                                                    
          error: "Server config error. Contact admin.",                                         
          form,                                                     
          user: null,                                                         
        });
      }

      const lower = emailRaw.toLowerCase();                     //normalize email     
      const emailOk = isAdminEmail(lower, ADMIN_EMAILS);                   //check if email is in admin list
      const passOk = passwordRaw === ADMIN_PASSWORD;                   //check if password matches                  

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

      issueCookie(res, { name: "Administrator", email: lower, role: "admin" }); //issue admin cookie
      return res.redirect("/admin");  //redirect to admin dashboard
    }

    const { emails: ADMIN_EMAILS } = getAdminConfig();             //prevent normal users from logging in with admin emails
    if (isAdminEmail(emailRaw, ADMIN_EMAILS)) {                                                               
      return res.status(400).render("auth/login", {
        title: "Login · BookHive",
        error: "This is an admin email. Tick 'Login as admin'.",
        form: { email: emailRaw, asAdmin: true },
        user: null,
      });
    }

    const user = await User.findOne({ email: emailRaw.toLowerCase() });                                           //find user by email
    if (!user) {                                                                                                          //if user not found
      return res.status(400).render("auth/login", {                                 //show error            
        title: "Login · BookHive",
        error: "Invalid credentials",
        form,
        user: null,
      });
    }

    const ok = user.comparePassword                                                                                                                                                                                      
      ? await user.comparePassword(passwordRaw)                                                                                                             
      : await bcrypt.compare(passwordRaw, user.password); //compare passwords securely    

    if (!ok) {                                                                          //if password doesn't match
      return res.status(400).render("auth/login", {                                //show error
        title: "Login · BookHive",                                              
        error: "Invalid credentials",                                                   
        form,                         
        user: null,                         
      });
    }

    issueCookie(res, {                    //issue JWT cookie                  
      id: user._id,                     
      name: user.name,                                                      
      email: user.email,                                        
      role: "user",
    });
    return res.redirect("/search"); //redirect to search page after login                 
  } catch (err) {                                                       
    console.error("[LOGIN]", err);               //handle server errors                 
    return res.status(500).render("auth/login", {                                         
      title: "Login · BookHive",                                            
      error: "Server error",                                        
      form: {},                                               
      user: null,                                                 
    });
  }
});

// LOGOUT
router.post("/logout", (_req, res) => { //handle logout           
  res.clearCookie("token"); //clear the JWT cookie              
  res.redirect("/auth/login");  //redirect to login page after logout           
});

/* ------------------------ List all users (admin only) ------------------------ */
router.get("/users", requireAuth, async (req, res) => { 
  try {
    if (req.user.role !== "admin") {                                            
      return res.status(403).json({ message: "Forbidden" });  //only admins can access this route       
    }
    const users = await User.find({}, "_id name email role").sort({ name: 1 }).lean();  //fetch all users, sorted by name
    res.json(users);    //return users as JSON  
  } catch (err) {                     
    console.error("[GET USERS]", err);  //handle server errors        
    res.status(500).json({ message: "Failed to fetch users" }); //return error message              
  } 
});

export default router;                                
