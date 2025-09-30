// src/models/Review.js
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

// one review per user per book
reviewSchema.index({ bookId: 1, userId: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model("Review", reviewSchema);
