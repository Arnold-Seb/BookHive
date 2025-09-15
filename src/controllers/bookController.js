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

// Add new book (✅ merge if duplicate, case-insensitive)
export const addBook = async (req, res) => {
  try {
    const { title, author, genre } = req.body;
    const quantity = Number(req.body.quantity) ?? 1;

    // check for existing book (ONLY by title, author, genre)
    let existingBook = await Book.findOne({
      titleLower: title.trim().toLowerCase(),
      authorLower: author.trim().toLowerCase(),
      genreLower: genre.trim().toLowerCase(),
    });

    if (existingBook) {
      // increase quantity
      existingBook.quantity += quantity;
      await existingBook.save();
      return res.status(200).json(existingBook);
    }

    // else, create new book
    const newBook = new Book({
      title: title.trim(),
      author: author.trim(),
      genre: genre.trim(),
      quantity,
    });

    await newBook.save();
    res.status(201).json(newBook);

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to add book" });
  }
};

// Update book (✅ still works with lowercase fields)
export const updateBook = async (req, res) => {
  try {
    const payload = {
      title: req.body.title,
      author: req.body.author,
      genre: req.body.genre,
    };

    if (req.body.quantity !== undefined) {
      payload.quantity = Number(req.body.quantity);
    }

    if (req.body.title)  payload.titleLower  = req.body.title.trim().toLowerCase();
    if (req.body.author) payload.authorLower = req.body.author.trim().toLowerCase();
    if (req.body.genre)  payload.genreLower  = req.body.genre.trim().toLowerCase();

    const book = await Book.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
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


// Borrow book (decrease quantity)
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

// Return book (increase quantity)
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
