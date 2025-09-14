import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title:   { type: String, required: true, trim: true },
    author:  { type: String, required: true, trim: true },
    genre:   { type: String, required: true, trim: true },
    quantity:{ type: Number, required: true, min: 0, default: 1 }
  },
  { timestamps: true }
);

// Virtual: availability based on quantity
bookSchema.virtual("available").get(function () {
  return this.quantity > 0;
});

export default mongoose.model("Book", bookSchema);
