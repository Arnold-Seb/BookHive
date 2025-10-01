// src/routes/bookRoutes.js
import express from "express";
import multer from "multer";
import {
  getBooks,
  addBook,
  updateBook,
  deleteBook,
  borrowBook,
  returnBook,
  getLoanHistory,
  getBorrowStats,
  getActiveLoans   
} from "../controllers/bookController.js";
import { listReviews, upsertMyReview, deleteMyReview } from "../controllers/reviewController.js";
import Book from "../models/Book.js";
import { authMiddleware, requireAuth } from "../middleware/authMiddleware.js"; 

const router = express.Router();

// Multer memory storage (for PDFs)
const upload = multer({ storage: multer.memoryStorage() });

/* ---------- CRUD ---------- */
router.get("/", authMiddleware, getBooks); // public list, attach user if token exists
router.post("/", requireAuth, upload.single("pdfFile"), addBook);
router.put("/:id", requireAuth, upload.single("pdfFile"), updateBook);
router.delete("/:id", requireAuth, deleteBook);

/* ---------- Loan history ---------- */
router.get("/history", requireAuth, getLoanHistory);

/* ---------- Borrow stats ---------- */
router.get("/stats/borrowed", requireAuth, getBorrowStats);

/* ---------- Borrow / Return ---------- */
router.patch("/:id/borrow", requireAuth, borrowBook);
router.patch("/:id/return", requireAuth, returnBook);

/* ---------- Active Loans for a Book ---------- */
router.get("/:id/activeLoans", requireAuth, getActiveLoans);

/* ---------- Reviews ---------- */
router.get("/:id/reviews", listReviews);                       // public
router.post("/:id/reviews", requireAuth, upsertMyReview);      // user must login
router.delete("/:id/reviews/my", requireAuth, deleteMyReview); // user must login

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
