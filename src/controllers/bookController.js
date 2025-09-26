import Book from "../models/Book.js";
import Loan from "../models/Loan.js";

/* ===== Get All Books ===== */
export const getBooks = async (_req, res) => {
  try {
    const books = await Book.find().lean();
    res.json(books);
  } catch (err) {
    console.error("[BOOKS] Error fetching:", err);
    res.status(500).json({ message: "Failed to fetch books" });
  }
};

/* ===== Add New Book ===== */
export const addBook = async (req, res) => {
  try {
    const { title, author, genre, quantity, status } = req.body;
    const qVal = Number(quantity) || 0;

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
      return res.status(200).json({ message: "Book quantity updated", book: existingBook });
    }

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
    res.status(201).json({ message: "New book added", book: newBook });
  } catch (err) {
    console.error("[BOOKS] Error adding:", err);
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

    const book = await Book.findById(id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    const duplicate = await Book.findOne({
      _id: { $ne: id },
      title: { $regex: `^${update.title}$`, $options: "i" },
      author: { $regex: `^${update.author}$`, $options: "i" },
      genre: { $regex: `^${update.genre}$`, $options: "i" },
    });

    if (duplicate) {
      duplicate.quantity += qVal;
      if (update.status) duplicate.status = update.status;
      if (update.pdfData) {
        duplicate.pdfData = update.pdfData;
        duplicate.pdfName = update.pdfName;
      }
      await duplicate.save();
      await book.deleteOne();
      return res.json({ message: "Books merged due to duplicate update", book: duplicate });
    }

    const updatedBook = await Book.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    res.json(updatedBook);
  } catch (err) {
    console.error("[BOOKS] Error updating:", err);
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
    console.error("[BOOKS] Error deleting:", err);
    res.status(500).json({ message: "Failed to delete book" });
  }
};

/* ===== Borrow Book ===== */
export const borrowBook = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });

    const book = await Book.findById(id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.quantity <= 0) return res.status(400).json({ message: "Book not available" });

    // ✅ Admin: unlimited borrow, no loan record
    if (req.user.role === "admin") {
      book.quantity -= 1;
      await book.save();
      return res.json({ message: "✅ Admin borrowed book (no loan record)", book });
    }

    if (!req.user.id) {
      return res.status(401).json({ message: "User ID missing in token" });
    }

    const existingLoan = await Loan.findOne({
      userId: req.user.id,
      bookId: book._id,
      returnDate: null,
    });
    if (existingLoan) {
      return res.status(400).json({ message: "You already borrowed this book" });
    }

    book.quantity -= 1;
    await book.save();

    await Loan.create({
      userId: req.user.id,
      bookId: book._id,
      borrowDate: new Date(),
      returnDate: null,
    });

    return res.json({ message: "Book borrowed successfully", book });
  } catch (err) {
    console.error("[BORROW] Error:", err);
    res.status(500).json({ message: "Failed to borrow book" });
  }
};

/* ===== Return Book ===== */
export const returnBook = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });

    const book = await Book.findById(id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    // ✅ Admin: unlimited return
    if (req.user.role === "admin") {
      book.quantity += 1;
      await book.save();
      return res.json({ message: "✅ Admin returned book (no loan record)", book });
    }

    if (!req.user.id) {
      return res.status(401).json({ message: "User ID missing in token" });
    }

    const loan = await Loan.findOne({
      userId: req.user.id,
      bookId: book._id,
      returnDate: null,
    });
    if (!loan) return res.status(400).json({ message: "No active loan for this book" });

    loan.returnDate = new Date();
    await loan.save();

    book.quantity += 1;
    await book.save();

    return res.json({ message: "Book returned successfully", book });
  } catch (err) {
    console.error("[RETURN] Error:", err);
    res.status(500).json({ message: "Failed to return book" });
  }
};

/* ===== Get Loan History ===== */
export const getLoanHistory = async (req, res) => {
  try {
    if (req.user?.role === "admin") {
      return res.json([]); // Admin loan history not tracked
    }

    const history = await Loan.find({ userId: req.user.id })
      .populate("bookId", "title")
      .sort({ borrowDate: -1 });

    res.json(history);
  } catch (err) {
    console.error("[HISTORY] Error fetching:", err);
    res.status(500).json({ message: "Failed to fetch loan history" });
  }
};
