import request from "supertest";
import mongoose from "mongoose";
import path from "path"; // ✅ needed for PDF path
import app from "../app.js";
import Book from "../models/book.js";

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI_TEST);
});

afterEach(async () => {
  await Book.deleteMany(); // clear after each test
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Book API", () => {
  it("should add a new book", async () => {
    const res = await request(app)
      .post("/api/books")
      .send({
        title: "Test Book",
        author: "Tester",
        genre: "Fiction",
        quantity: 3,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe("Test Book");
    expect(res.body.quantity).toBe(3);
  });

  it("should borrow a book", async () => {
    const book = await Book.create({
      title: "Borrowable",
      author: "Author",
      genre: "Drama",
      quantity: 1,
    });

    const res = await request(app).patch(`/api/books/${book._id}/borrow`);
    expect(res.statusCode).toBe(200);
    expect(res.body.quantity).toBe(0);
  });

  it("should not borrow if quantity is 0", async () => {
    const book = await Book.create({
      title: "Unavailable",
      author: "No Copies",
      genre: "Horror",
      quantity: 0,
    });

    const res = await request(app).patch(`/api/books/${book._id}/borrow`);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Book unavailable");
  });

  it("should return a borrowed book", async () => {
    const book = await Book.create({
      title: "ReturnMe",
      author: "Someone",
      genre: "Sci-Fi",
      quantity: 0,
    });

    const res = await request(app).patch(`/api/books/${book._id}/return`);
    expect(res.statusCode).toBe(200);
    expect(res.body.quantity).toBe(1);
  });

  it("should update a book", async () => {
    const book = await Book.create({
      title: "Old Title",
      author: "Old Author",
      genre: "Mystery",
      quantity: 5,
    });

    const res = await request(app)
      .put(`/api/books/${book._id}`)
      .send({
        title: "New Title",
        author: "New Author",
        genre: "Thriller",
        quantity: 10,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe("New Title");
    expect(res.body.author).toBe("New Author");
    expect(res.body.genre).toBe("Thriller");
    expect(res.body.quantity).toBe(10);
  });

  it("should delete a book", async () => {
    const book = await Book.create({
      title: "DeleteMe",
      author: "Author",
      genre: "Fantasy",
      quantity: 2,
    });

    const res = await request(app).delete(`/api/books/${book._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Book deleted");

    const find = await Book.findById(book._id);
    expect(find).toBeNull();
  });

  it("should upload a PDF and set status to online", async () => {
    const pdfPath = path.join(process.cwd(), "src", "tests", "sample.pdf");

    const res = await request(app)
      .post("/api/books")
      .field("title", "PDF Book")
      .field("author", "PDF Author")
      .field("genre", "Tech")
      .field("quantity", 1)
      .attach("pdfFile", pdfPath);

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe("PDF Book");
    expect(res.body.status).toBe("online"); // ✅ auto-set
    expect(res.body.pdfName).toBe("sample.pdf");

    // Fetch PDF back
    const pdfRes = await request(app).get(`/api/books/${res.body._id}/pdf`);
    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers["content-type"]).toBe("application/pdf");
    expect(pdfRes.body).toBeDefined();
  });
});
