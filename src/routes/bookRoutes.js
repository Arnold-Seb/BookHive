// src/routes/bookRoutes.js
import express from "express";
import multer from "multer";
import {
  getBooks,
  addBook,
  updateBook,
  deleteBook,
  // borrowBook,  // ⛔️ replaced by inline handler below to inject due message
  returnBook,
  getLoanHistory,
  getBorrowStats,
  getActiveLoans
} from "../controllers/bookController.js";
import Book from "../models/Book.js";
import Loan from "../models/Loan.js"; // ✅ needed for inline borrow logic
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Multer memory storage (for PDFs)
const upload = multer({ storage: multer.memoryStorage() });

/* ---------- CRUD ---------- */
router.get("/", getBooks);
router.post("/", upload.single("pdfFile"), addBook);
router.put("/:id", upload.single("pdfFile"), updateBook);
router.delete("/:id", deleteBook);

/* ---------- Loan history ---------- */
router.get("/history", authMiddleware, getLoanHistory);

/* ---------- Borrow stats ---------- */
router.get("/stats/borrowed", authMiddleware, getBorrowStats);

/* ---------- Borrow (inline to add due message) ---------- */
router.patch("/:id/borrow", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body?.borrowerId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    const qty = Number(book.quantity ?? 0);
    const isOnline = book.status === "online";

    // If it's not an online (PDF) book, enforce stock
    if (!isOnline && qty <= 0) {
      return res.status(400).json({ message: "Book not available" });
    }

    // Prevent duplicate active loan for same user/book
    const existingLoan = await Loan.findOne({
      userId,
      bookId: book._id,
      returnDate: null,
    });
    if (existingLoan) {
      return res
        .status(400)
        .json({ message: "This user already borrowed this book" });
    }

    // Decrement physical stock only (keep online unchanged)
    if (!isOnline) {
      book.quantity = Math.max(0, qty - 1);
      await book.save();
    }

    // Create loan
    await Loan.create({
      userId,
      bookId: book._id,
      borrowDate: new Date(),
      returnDate: null,
    });

    // 14-day due message
    const DUE_DAYS = 14;
    const dueDate = new Date(Date.now() + DUE_DAYS * 24 * 60 * 60 * 1000);

    return res.json({
      message: `✅ Book borrowed successfully. Due in ${DUE_DAYS} days (on ${dueDate.toLocaleDateString()})`,
      dueDate,
      book,
    });
  } catch (err) {
    console.error("[BORROW ROUTE ERROR]", err);
    res.status(500).json({ message: "Failed to borrow book" });
  }
});

/* ---------- Return (still uses controller) ---------- */
router.patch("/:id/return", authMiddleware, returnBook);

/* ---------- Active Loans for a Book ---------- */
router.get("/:id/activeLoans", authMiddleware, getActiveLoans);

/* ---------- PDF fetch ---------- */
router.get("/:id/pdf", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book || !book.pdfData) {
      return res.status(404).send("No PDF found");
    }
    res.contentType("application/pdf");
    res.send(Buffer.from(book.pdfData, "base64"));
  } catch (err) {
    console.error("[PDF FETCH ERROR]", err);
    res.status(500).send("Error fetching PDF");
  }
});

export default router;
