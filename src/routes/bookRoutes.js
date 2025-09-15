import express from "express";
import multer from "multer";
import {
  getBooks,
  addBook,
  updateBook,
  deleteBook,
  borrowBook,
  returnBook
} from "../controllers/bookController.js";
import Book from "../models/book.js";

const router = express.Router();

// Multer memory storage (no folders on disk)
const upload = multer({ storage: multer.memoryStorage() });

// CRUD routes
router.get("/", getBooks);
router.post("/", upload.single("pdfFile"), addBook);
router.put("/:id", upload.single("pdfFile"), updateBook);
router.delete("/:id", deleteBook);

// Borrow / Return
router.patch("/:id/borrow", borrowBook);
router.patch("/:id/return", returnBook);

// Fetch PDF for a book
router.get("/:id/pdf", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book || !book.pdfData) {
      return res.status(404).send("No PDF found");
    }
    res.contentType("application/pdf");
    res.send(Buffer.from(book.pdfData, "base64"));
  } catch (err) {
    res.status(500).send("Error fetching PDF");
  }
});

export default router;
