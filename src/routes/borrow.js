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

    // reduce quantity
    book.quantity -= 1;
    await book.save();

    // save borrow record
    const record = await Borrow.create({
      student: user.id,
      studentName: user.name,
      book: book._id,
      bookTitle: book.title
    });

    res.json({ message: "Book borrowed successfully", borrow: record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
