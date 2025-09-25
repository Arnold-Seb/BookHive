import Book from "../models/Book.js";

// Get all books
export const getBooks = async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch books" });
  }
};

// Add new book
export const addBook = async (req, res) => {
  try {
    const title = req.body.title ? req.body.title.trim() : "";
    const author = req.body.author ? req.body.author.trim() : "";
    const genre = req.body.genre ? req.body.genre.trim() : "";

    // allow 0 as valid quantity
    const quantity =
      req.body.quantity !== undefined && req.body.quantity !== ""
        ? Number(req.body.quantity)
        : 0;

    if (!title || !author || !genre) {
      return res
        .status(400)
        .json({ error: "Title, author, and genre are required" });
    }

    // Normalize fields for duplicate check
    const titleLower = title.toLowerCase();
    const authorLower = author.toLowerCase();
    const genreLower = genre.toLowerCase();

    // 🔑 check for duplicate by normalized fields
    let existingBook = await Book.findOne({
      titleLower,
      authorLower,
      genreLower,
    });

    if (existingBook) {
      existingBook.quantity += quantity;
      await existingBook.save();
      return res.status(200).json(existingBook);
    }

    // Handle PDF (base64)
    const pdfData = req.file ? req.file.buffer.toString("base64") : null;
    const pdfName = req.file ? req.file.originalname : null;

    // If a PDF is uploaded, mark book online automatically
    const status = pdfData ? "online" : req.body.status || "offline";

    // Explicitly set normalized fields when creating new book
    const newBook = new Book({
      title,
      author,
      genre,
      titleLower,
      authorLower,
      genreLower,
      quantity,
      pdfData,
      pdfName,
      status,
    });

    await newBook.save();
    res.status(201).json(newBook);
  } catch (err) {
    console.error("Error in addBook:", err);
    res.status(400).json({ error: "Failed to add book" });
  }
};

// Update book
export const updateBook = async (req, res) => {
  try {
    const payload = {};

    if (req.body.title) {
      payload.title = req.body.title.trim();
      payload.titleLower = payload.title.toLowerCase();
    }
    if (req.body.author) {
      payload.author = req.body.author.trim();
      payload.authorLower = payload.author.toLowerCase();
    }
    if (req.body.genre) {
      payload.genre = req.body.genre.trim();
      payload.genreLower = payload.genre.toLowerCase();
    }

    // ✅ allow 0 as valid update
    if (req.body.quantity !== undefined) {
      payload.quantity = Number(req.body.quantity);
    }

    if (req.body.status) {
      payload.status = req.body.status;
    }

    if (req.file) {
      payload.pdfData = req.file.buffer.toString("base64");
      payload.pdfName = req.file.originalname;
      payload.status = "online"; // auto-online if PDF uploaded
    }

    const book = await Book.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!book) return res.status(404).json({ error: "Book not found" });

    res.json(book);
  } catch (err) {
    console.error("Error in updateBook:", err);
    res.status(400).json({ error: "Failed to update book" });
  }
};

// Delete book
export const deleteBook = async (req, res) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.json({ message: "Book deleted" });
  } catch (err) {
    res.status(400).json({ error: "Failed to delete book" });
  }
};

// Borrow book
export const borrowBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });

    if (book.quantity > 0) {
      book.quantity -= 1;
      await book.save();
      return res.json(book);
    } else {
      return res.status(400).json({ error: "Book unavailable" });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to borrow book" });
  }
};

// Return book
export const returnBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });

    book.quantity += 1;
    await book.save();
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: "Failed to return book" });
  }
};
