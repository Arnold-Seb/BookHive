import mongoose from "mongoose";

const borrowSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    studentName: { type: String, required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    bookTitle: { type: String, required: true },
    quantity: { type: Number, default: 1 }, // <-- added
    borrowedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("Borrow", borrowSchema);
