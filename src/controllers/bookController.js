// src/controllers/bookController.js
import Book from "../models/Book.js";
import Loan from "../models/Loan.js";   // ✅ added

/* ===== Get All Books ===== */
export const getBooks = async (req, res) => {
  try {
    const books = await Book.find().lean();
    res.json(books);
  } catch (err) {
    console.error("Error fetching books:", err);
    res.status(500).json({ message: "Failed to fetch books" });
  }
};

/* ===== Add New Book ===== */
export const addBook = async (req, res) => {
  try {
    const { title, author, genre, quantity, status } = req.body;
    const qVal = Number(quantity) || 0;

    // Case-insensitive check for duplicates
    let existingBook = await Book.findOne({
      title: { $regex: `^${title.trim()}$`, $options: "i" },
      author: { $regex: `^${author.trim()}$`, $options: "i" },
      genre: { $regex: `^${genre.trim()}$`, $options: "i" },
    });

    if (existingBook) {
      existingBook.quantity += qVal;

      if (status) existingBook.status = status;
      if (req.file) {
        existingBook.pdfData = req.file.buffer.toString("base64");
        existingBook.pdfName = req.file.originalname;
      }

      await existingBook.save();
      return res.status(200).json({
        message: "Book quantity updated",
        book: existingBook,
      });
    }

    // If no duplicate → create new book
    const newBook = new Book({
      title: title.trim(),
      author: author.trim(),
      genre: genre.trim(),
      quantity: qVal,
      status: status || "offline",
    });

    if (req.file) {
      newBook.pdfData = req.file.buffer.toString("base64");
      newBook.pdfName = req.file.originalname;
    }

    await newBook.save();
    res.status(201).json({
      message: "New book added",
      book: newBook,
    });
  } catch (err) {
    console.error("Error adding book:", err);
    res.status(500).json({ message: "Failed to add book" });
  }
};

/* ===== Update Book ===== */
export const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, genre, quantity, status } = req.body;
    const qVal = Number(quantity) || 0;

    const update = {
      title: title.trim(),
      author: author.trim(),
      genre: genre.trim(),
      quantity: qVal,
      status: status || "offline",
    };

    if (req.file) {
      update.pdfData = req.file.buffer.toString("base64");
      update.pdfName = req.file.originalname;
    }

    // Find the book being updated
    const book = await Book.findById(id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    // Case-insensitive check for duplicates excluding current book
    const duplicate = await Book.findOne({
      _id: { $ne: id },
      title: { $regex: `^${update.title}$`, $options: "i" },
      author: { $regex: `^${update.author}$`, $options: "i" },
      genre: { $regex: `^${update.genre}$`, $options: "i" },
    });

    if (duplicate) {
      // ✅ Merge quantities
      duplicate.quantity += qVal;

      if (update.status) duplicate.status = update.status;
      if (update.pdfData) {
        duplicate.pdfData = update.pdfData;
        duplicate.pdfName = update.pdfName;
      }

      await duplicate.save();
      // Delete the original book (merge done)
      await book.deleteOne();

      return res.json({
        message: "Books merged due to duplicate update",
        book: duplicate,
      });
    }

    // Otherwise update this book normally
    const updatedBook = await Book.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    res.json(updatedBook);
  } catch (err) {
    console.error("Error updating book:", err);
    res.status(500).json({ message: "Failed to update book" });
  }
};

/* ===== Delete Book ===== */
export const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Book.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Book not found" });
    res.json({ message: "Book deleted" });
  } catch (err) {
    console.error("Error deleting book:", err);
    res.status(500).json({ message: "Failed to delete book" });
  }
};

/* ===== Borrow Book ===== */
export const borrowBook = async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.user?.email;
    if (!userEmail) return res.status(401).json({ message: "Not authenticated" });

    const book = await Book.findById(id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    // check availability & not already borrowed by user
    if (book.quantity > 0 && !book.borrowedBy.includes(userEmail)) {
      book.quantity -= 1;
      book.borrowedBy.push(userEmail);
      await book.save();

      // ✅ log loan
      await Loan.create({
        userId: req.user._id,
        bookId: book._id,
        borrowDate: new Date(),
      });

      return res.json({ message: "Book borrowed successfully", book });
    } else {
      return res.status(400).json({ message: "Book unavailable or already borrowed" });
    }
  } catch (err) {
    console.error("Error borrowing book:", err);
    res.status(500).json({ message: "Failed to borrow book" });
  }
};

/* ===== Return Book ===== */
export const returnBook = async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.user?.email;
    if (!userEmail) return res.status(401).json({ message: "Not authenticated" });

    const book = await Book.findById(id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    // check if this user borrowed the book
    if (book.borrowedBy.includes(userEmail)) {
      book.quantity += 1;
      book.borrowedBy = book.borrowedBy.filter(u => u !== userEmail);
      await book.save();

      // ✅ update loan with return date
      await Loan.findOneAndUpdate(
        { userId: req.user._id, bookId: book._id, returnDate: null },
        { returnDate: new Date() }
      );

      return res.json({ message: "Book returned successfully", book });
    } else {
      return res.status(400).json({ message: "You did not borrow this book" });
    }
  } catch (err) {
    console.error("Error returning book:", err);
    res.status(500).json({ message: "Failed to return book" });
  }
};

/* ===== Get Loan History ===== */
export const getLoanHistory = async (req, res) => {
  try {
    const history = await Loan.find({ userId: req.user._id })
      .populate("bookId", "title")
      .sort({ borrowDate: -1 });

    res.json(history);
  } catch (err) {
    console.error("Error fetching loan history:", err);
    res.status(500).json({ message: "Failed to fetch loan history" });
  }
};
