import mongoose from "mongoose";

// This model has been updated...
const BorrowSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  studentName: { type: String, required: true },


  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  bookTitle: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  borrowedAt: { type: Date, default: Date.now },

  dueDate: { type: Date, required: true },
  returned: { type: Boolean, default: false },
  overdueNotified: { type: Boolean, default: false }, // for overdue email
  dueSoonNotified: { type: Boolean, default: false }  // for 24h reminder email
});

export default mongoose.model("Borrow", BorrowSchema);
