import Book from "../models/Book.js";
import Loan from "../models/Loan.js";

// helper: escape special regex chars so user input is safe in $regex
const escapeRegex = (s = "") => s.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");

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

    const t = (title || "").trim();
    const a = (author || "").trim();
    const g = (genre || "").trim();
    if (!t || !a || !g) {
      return res.status(400).json({ message: "Title, author and genre are required" });
    }

    const qVal = Number.isFinite(Number(quantity)) ? Number(quantity) : 0;

    // case-insensitive exact match, but safely escaped
    let existingBook = await Book.findOne({
      title:  { $regex: new RegExp(`^${escapeRegex(t)}$`, "i") },
      author: { $regex: new RegExp(`^${escapeRegex(a)}$`, "i") },
      genre:  { $regex: new RegExp(`^${escapeRegex(g)}$`, "i") },
    });

    if (existingBook) {
      existingBook.quantity += qVal;
      if (status) existingBook.status = status;
      if (req.file) {
        existingBook.pdfData = req.file.buffer.toString("base64");
        existingBook.pdfName = req.file.originalname;
        // keep your chosen status if you set one; otherwise leave as-is
      }
      await existingBook.save();
      return res
        .status(200)
        .json({ message: "Book quantity updated", book: existingBook });
    }

    const newBook = new Book({
      title: t,
      author: a,
      genre: g,
      quantity: qVal,
      status: status || (req.file ? "online" : "offline"),
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

    const t = (title || "").trim();
    const a = (author || "").trim();
    const g = (genre || "").trim();

    if (!t || !a || !g) {
      return res.status(400).json({ message: "Title, author and genre are required" });
    }

    const qVal = Number.isFinite(Number(quantity)) ? Number(quantity) : 0;

    const update = {
      title: t,
      author: a,
      genre: g,
      quantity: qVal,
      status: status || "offline",
    };

    if (req.file) {
      update.pdfData = req.file.buffer.toString("base64");
      update.pdfName = req.file.originalname;
      update.status = "online"; // auto-online when a new PDF is uploaded
    }

    const book = await Book.findById(id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    // find duplicate (excluding current) using safe, case-insensitive exact match
    const duplicate = await Book.findOne({
      _id: { $ne: id },
      title:  { $regex: new RegExp(`^${escapeRegex(t)}$`, "i") },
      author: { $regex: new RegExp(`^${escapeRegex(a)}$`, "i") },
      genre:  { $regex: new RegExp(`^${escapeRegex(g)}$`, "i") },
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
      return res.json({
        message: "Books merged due to duplicate update",
        book: duplicate,
      });
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
    const { borrowerId } = req.body;

    const book = await Book.findById(id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.quantity <= 0)
      return res.status(400).json({ message: "Book not available" });

    const userId = borrowerId || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const existingLoan = await Loan.findOne({
      userId,
      bookId: book._id,
      returnDate: null,
    });
    if (existingLoan) {
      return res.status(400).json({ message: "This user already borrowed this book" });
    }

    book.quantity -= 1;
    await book.save();

    await Loan.create({
      userId,
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
    const { borrowerId } = req.body;

    const book = await Book.findById(id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    const userId = borrowerId || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const loan = await Loan.findOne({
      userId,
      bookId: book._id,
      returnDate: null,
    });
    if (!loan) return res.status(400).json({ message: "No active loan for this user" });

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
    const history = await Loan.find({ userId: req.user.id })
      .populate("bookId", "title")
      .sort({ borrowDate: -1 });

    res.json(history);
  } catch (err) {
    console.error("[HISTORY] Error fetching:", err);
    res.status(500).json({ message: "Failed to fetch loan history" });
  }
};

/* ===== Get Active Loans for a Book (admin use) ===== */
export const getActiveLoans = async (req, res) => {
  try {
    const { id } = req.params;
    const loans = await Loan.find({ bookId: id, returnDate: null })
      .populate("userId", "name role")
      .lean();
    res.json(loans);
  } catch (err) {
    console.error("[ACTIVE LOANS] Error:", err);
    res.status(500).json({ message: "Failed to fetch active loans" });
  }
};

/* ===== Get Borrow Stats ===== */
export const getBorrowStats = async (req, res) => {
  try {
    if (req.user?.role === "admin") {
      const borrowed = await Loan.countDocuments({ returnDate: null });
      return res.json({ borrowed });
    } else {
      const borrowed = await Loan.countDocuments({
        userId: req.user.id,
        returnDate: null,
      });
      return res.json({ borrowed });
    }
  } catch (err) {
    console.error("[BORROW STATS] Error:", err);
    res.status(500).json({ message: "Failed to fetch borrow stats" });
  }
};
