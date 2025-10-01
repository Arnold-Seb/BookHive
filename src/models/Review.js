// src/models/Review.js
import mongoose from "mongoose";                                                              //import mongoose for MongoDB interactions

const reviewSchema = new mongoose.Schema(                    //define review schema 
  {
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true, index: true },         //reference to Book model         
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },        //reference to User model    
    rating: { type: Number, min: 1, max: 5, required: true }, //rating between 1 and 5                                    
    comment: { type: String, trim: true, default: "" }  , //optional comment              
  },
  { timestamps: true }                                          //automatically manage createdAt and updatedAt fields
);

// one review per user per book
reviewSchema.index({ bookId: 1, userId: 1 }, { unique: true }); //compound index to ensure one review per user per book               

export default mongoose.models.Review || mongoose.model("Review", reviewSchema);                      //export Review model, avoid recompilation issues                                                                               
