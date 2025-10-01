// src/models/User.js
import mongoose from "mongoose";                                //import mongoose for MongoDB interactions
import bcrypt from "bcryptjs";                   //import bcrypt for password hashing

const userSchema = new mongoose.Schema(                     //define user schema                    
  {                               
    name: {                                                                               
      type: String,
      required: true,
      trim: true,
    },                                                                          
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,                                                                               
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["user", "admin"],                                                                                    
      default: "user",                                          
    },
  },
  { timestamps: true }
);

/* ===== Password Hashing ===== */
userSchema.pre("save", async function (next) {               //hash password before saving        
  if (!this.isModified("password")) return next();  //only hash if password is new or modified                
  this.password = await bcrypt.hash(this.password, 10); //hash with salt rounds = 10  
  next();                                                             
});

/* ===== Compare Password ===== */
userSchema.methods.comparePassword = function (candidate) {        //compare given password with stored hash
  return bcrypt.compare(candidate, this.password);  //return promise                
};                                                                                              

/* ===== Safe Output (toJSON) ===== */
// ✅ ensures we don’t accidentally leak hashed passwords
userSchema.set("toJSON", {                                          
  transform: function (_doc, ret) { //remove password field when converting to JSON                   
    delete ret.password;                                                        
    return ret;                                               
  },
}); 

export default mongoose.model("User", userSchema);  //export User model           
