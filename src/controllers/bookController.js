import Book from "../models/book.js";

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
    // ✅ Preserve 0, default only if missing/NaN
    const hasQty =
      req.body.quantity !== undefined &&
      req.body.quantity !== null &&
      req.body.quantity !== "";
    const qty = hasQty ? Number(req.body.quantity) : 1;

    const payload = {
      title: req.body.title,
      author: req.body.author,
      genre: req.body.genre,
      quantity: Number.isFinite(qty) ? qty : 1,
    };

    const book = new Book(payload);
    await book.save();
    res.status(201).json(book);
  } catch (err) {
    res.status(400).json({ error: "Failed to add book" });
  }
};

// Update book
export const updateBook = async (req, res) => {
  try {
    const payload = {
      title: req.body.title,
      author: req.body.author,
      genre: req.body.genre,
    };

    if (req.body.quantity !== undefined) {
      payload.quantity = Number(req.body.quantity); // ✅ preserves 0
    }

    const book = await Book.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    res.json(book);
  } catch (err) {
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
