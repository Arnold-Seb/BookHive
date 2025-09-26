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
  getLoanHistory
} from "../controllers/bookController.js";
import Book from "../models/Book.js";

const router = express.Router();

// Multer memory storage (for PDFs)
const upload = multer({ storage: multer.memoryStorage() });

/* ---------- CRUD ---------- */
router.get("/", getBooks);
router.post("/", upload.single("pdfFile"), addBook);
router.put("/:id", upload.single("pdfFile"), updateBook);
router.delete("/:id", deleteBook);

/* ---------- Loan history ---------- */
router.get("/history", getLoanHistory);

/* ---------- Borrow / Return ---------- */
router.patch("/:id/borrow", borrowBook);
router.patch("/:id/return", returnBook);

/* ---------- PDF fetch (keep last) ---------- */
router.get("/:id/pdf", async (req, res) => {
  try {
    console.log("📑 PDF fetch for book:", req.params.id);
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
