import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  genre: { type: String, required: true },
  available: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("Book", bookSchema);
