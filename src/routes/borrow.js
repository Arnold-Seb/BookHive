import { Router } from "express";
import Borrow from "../models/Borrow.js";
import Book from "../models/Book.js";

const router = Router();

// Borrow a book
router.post("/", async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== "student")
      return res.status(403).json({ message: "Only students can borrow books" });

    const { bookId } = req.body;
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.quantity <= 0) return res.status(400).json({ message: "Book unavailable" });

    // Check if student already borrowed this book
    let borrowRecord = await Borrow.findOne({ student: user.id, book: book._id });

    if (borrowRecord) {
      // Increment quantity if already borrowed
      borrowRecord.quantity = (borrowRecord.quantity || 1) + 1;
      await borrowRecord.save();
    } else {
      // Create new borrow record with quantity 1
      borrowRecord = await Borrow.create({
        student: user.id,
        studentName: user.name,
        book: book._id,
        bookTitle: book.title,
        quantity: 1
      });
    }

    // Decrease the book stock
    book.quantity -= 1;
    await book.save();

    res.json({ message: "Book borrowed successfully", borrow: borrowRecord });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});






// Get total borrowed quantity (for admin dashboard)
router.get("/total", async (req, res) => {
  try {
    const result = await Borrow.aggregate([
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$quantity" } // sum all borrowed quantities
        }
      }
    ]);

    const totalBorrowed = result[0] ? result[0].totalQuantity : 0;
    res.json({ totalBorrowed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});




export default router;
