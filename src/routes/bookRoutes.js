// src/routes/bookRoutes.js
import express from "express";
import { getBooks, addBook, updateBook, deleteBook } from "../controllers/bookController.js";
import Book from "../models/book.js";

const router = express.Router();

// CRUD routes
router.get("/", getBooks);
router.post("/", addBook);
router.put("/:id", updateBook);
router.delete("/:id", deleteBook);

// Borrow book
router.patch("/:id/borrow", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });
    if (book.quantity <= 0) return res.status(400).json({ error: "No copies left" });

    book.quantity -= 1;
    await book.save();
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: "Failed to borrow book" });
  }
});

// Return book
router.patch("/:id/return", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });

    book.quantity += 1;
    await book.save();
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: "Failed to return book" });
  }
});

export default router;
