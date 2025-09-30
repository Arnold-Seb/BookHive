import { Router } from "express";
import Borrow from "../models/Borrow.js";
import Book from "../models/Book.js";

const router = Router();

// Borrow a book with custom duration
router.post("/", async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== "student")
      return res.status(403).json({ message: "Only students can borrow books" });

    const { bookId, days = 0, minutes = 0 } = req.body;

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.quantity <= 0) return res.status(400).json({ message: "Book unavailable" });

    let borrowRecord = await Borrow.findOne({ student: user.id, book: book._id });

    const now = new Date();
    const dueDate = new Date(now.getTime() + (days * 24 * 60 + minutes) * 60 * 1000);

    if (borrowRecord) {
      borrowRecord.quantity = (borrowRecord.quantity || 1) + 1;
      borrowRecord.dueDate = dueDate;
      await borrowRecord.save();
    } else {
      borrowRecord = await Borrow.create({
        student: user.id,
        studentName: user.name,
        book: book._id,
        bookTitle: book.title,
        quantity: 1,
        dueDate
      });
    }

    book.quantity -= 1;
    await book.save();

    res.json({ message: "Book borrowed successfully", borrow: borrowRecord });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get borrowed books for logged-in student
router.get("/my", async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== "student")
      return res.status(403).json({ message: "Only students can view borrowed books" });

    const now = new Date();
    const soon = new Date(now.getTime() + 24*60*60*1000);

    const borrows = await Borrow.find({ student: user.id }).sort({ borrowedAt: -1 });

    const borrowsWithStatus = borrows.map(b => {
      const overdue = !b.returned && now > b.dueDate;
      const dueSoon = !b.returned && b.dueDate > now && b.dueDate <= soon;
      return { ...b.toObject(), overdue, dueSoon };
    });

    res.json(borrowsWithStatus);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin route: get total borrowed
router.get("/total", async (req, res) => {
  try {
    const result = await Borrow.aggregate([{ $group: { _id: null, totalQuantity: { $sum: "$quantity" } } }]);
    const totalBorrowed = result[0] ? result[0].totalQuantity : 0;
    res.json({ totalBorrowed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
