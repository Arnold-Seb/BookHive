import mongoose from "mongoose";

const loanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    borrowDate: { type: Date, default: Date.now },
    returnDate: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Loan", loanSchema);
