// src/middlewares/authMiddleware.js
import jwt from "jsonwebtoken";

/**
 * Attach user if token exists, else continue.
 * Use when you want user info but don’t force login.
 */
export const authMiddleware = (req, res, next) => { //middleware to check for JWT token in cookies        
  const token = req.cookies?.token; //get token from cookies  
  if (!token) {                                                                     
    return next(); // no token → continue without user
  }

  try {                                                                                   
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");  //verify token              
    req.user = decoded; //attach decoded user info to request object
  } catch (err) {                                                       
    console.error("[authMiddleware] Invalid token:", err.message);  //invalid token → clear cookie      
    res.clearCookie("token");                       //clear the JWT cookie              
  }
  next(); //continue to next middleware/route handler
};

/**
 * Require authentication — blocks if no valid token.
 * Use when protecting routes/pages.
 */
export const requireAuth = (req, res, next) => {  //middleware to enforce authentication
  const token = req.cookies?.token;   //get token from cookies
  if (!token) {                                 
    return res.redirect("/auth/login"); // no token → redirect to login
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");  //verify token
    req.user = decoded; //attach decoded user info to request object  
    next(); //proceed to next middleware/route handler
  } catch (err) {                                                             
    console.error("[requireAuth] Invalid token:", err.message); //invalid token → clear cookie and redirect to login              
    res.clearCookie("token"); //clear the JWT cookie
    return res.redirect("/auth/login"); //redirect to login 
  }
};
