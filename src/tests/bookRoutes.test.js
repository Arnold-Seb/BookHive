import request from "supertest";
import mongoose from "mongoose";
import path from "path";
import app from "../app.js";
import Book from "../models/Book.js";
import User from "../models/User.js";
import Loan from "../models/Loan.js";

/** -------- helpers -------- */
async function loginAsUser(email = "testuser@example.com", pass = "password123") {
  // ensure user exists
  await User.deleteMany({ email });
  await User.create({ name: "TestUser", email, password: pass, role: "user" });

  const res = await request(app).post("/auth/login").send({ email, password: pass });
  const setCookie = res.headers["set-cookie"];
  if (!setCookie) throw new Error("No auth cookie returned from /auth/login");
  // Build a single Cookie header
  const cookieHeader = Array.isArray(setCookie)
    ? setCookie.map((c) => c.split(";")[0]).join("; ")
    : setCookie.split(";")[0];
  return cookieHeader;
}

async function loginAsAdmin(
  email = "admin@example.com",
  adminPass = "supersecret"
) {
  // configure admin creds for this process (auth route reads process.env at runtime)
  process.env.ADMIN_EMAILS = email;
  process.env.ADMIN_PASSWORD = adminPass;

  const res = await request(app)
    .post("/auth/login")
    .send({ email, password: adminPass, asAdmin: true });

  const setCookie = res.headers["set-cookie"];
  const cookieHeader = Array.isArray(setCookie)
    ? setCookie.map((c) => c.split(";")[0]).join("; ")
    : setCookie.split(";")[0];
  return cookieHeader;
}

/** -------- lifecycle -------- */
beforeAll(async () => {
  const uri = process.env.MONGODB_URI_TEST;
  if (!uri) throw new Error("MONGODB_URI_TEST not set");
  await mongoose.connect(uri);
});

afterEach(async () => {
  await Loan.deleteMany({});
  await Book.deleteMany({});
  // users can persist across tests; each helper ensures its own user exists
});

afterAll(async () => {
  await mongoose.connection.close(true);
});

describe("Book API", () => {
  it("adds a new book (JSON body)", async () => {
    const cookieHeader = await loginAsUser();

    const res = await request(app)
      .post("/api/books")
      .set("Cookie", cookieHeader)
      .send({ title: "Test Book", author: "Tester", genre: "Fiction", quantity: 3 });

    expect(res.statusCode).toBe(201);
    expect(res.body.book.title).toBe("Test Book");
    expect(res.body.book.quantity).toBe(3);
  });

  it("merges duplicates case-insensitively and increases quantity", async () => {
    const cookieHeader = await loginAsUser();

    // First add
    await request(app)
      .post("/api/books")
      .set("Cookie", cookieHeader)
      .send({ title: "Dune", author: "Frank Herbert", genre: "Sci-Fi", quantity: 2 });

    // Add again with different casing
    const res2 = await request(app)
      .post("/api/books")
      .set("Cookie", cookieHeader)
      .send({ title: "dune", author: "FRANK HERBERT", genre: "sci-fi", quantity: 3 });

    expect(res2.statusCode === 200 || res2.statusCode === 201).toBe(true);

    // Fetch all and check quantity == 5
    const all = await request(app).get("/api/books");
    const dune = all.body.find((b) => (b.title || "").toLowerCase() === "dune");
    expect(dune).toBeTruthy();
    expect(Number(dune.quantity)).toBe(5);
  });

  it("uploads a PDF and returns it; new book auto-online when pdf provided", async () => {
    const cookieHeader = await loginAsUser();
    const pdfPath = path.join(process.cwd(), "src", "tests", "sample.pdf");

    const create = await request(app)
      .post("/api/books")
      .set("Cookie", cookieHeader)
      .field("title", "PDF Book")
      .field("author", "PDF Author")
      .field("genre", "Tech")
      .field("quantity", 1)
      .attach("pdfFile", pdfPath);

    expect(create.statusCode).toBe(201);
    expect(create.body.book.pdfName).toBe("sample.pdf");
    expect(create.body.book.status).toBe("online");

    const pdfRes = await request(app)
      .get(`/api/books/${create.body.book._id}/pdf`)
      .set("Cookie", cookieHeader);

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers["content-type"]).toBe("application/pdf");
    expect(pdfRes.body).toBeDefined();
  });

  it("returns 404 for /:id/pdf when no pdf is present", async () => {
    const cookieHeader = await loginAsUser();
    const created = await Book.create({
      title: "No PDF",
      author: "None",
      genre: "NA",
      quantity: 1,
    });

    const res = await request(app)
      .get(`/api/books/${created._id}/pdf`)
      .set("Cookie", cookieHeader);

    expect(res.statusCode).toBe(404);
  });

  it("borrows a book (authenticated user)", async () => {
    const cookieHeader = await loginAsUser();

    const book = await Book.create({
      title: "Borrowable",
      author: "Author",
      genre: "Drama",
      quantity: 1,
    });

    const res = await request(app)
      .patch(`/api/books/${book._id}/borrow`)
      .set("Cookie", cookieHeader); // no borrowerId payload

    expect(res.statusCode).toBe(200);
    expect(res.body.book.quantity).toBe(0);
  });

  it("prevents borrow when quantity is 0", async () => {
    const cookieHeader = await loginAsUser();

    const book = await Book.create({
      title: "Unavailable",
      author: "No Copies",
      genre: "Horror",
      quantity: 0,
    });

    const res = await request(app)
      .patch(`/api/books/${book._id}/borrow`)
      .set("Cookie", cookieHeader);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Book not available");
  });

  it("prevents borrowing the same book twice by the same user", async () => {
    const cookieHeader = await loginAsUser();

    const book = await Book.create({
      title: "Unique Loan",
      author: "Someone",
      genre: "Cats",
      quantity: 2,
    });

    const r1 = await request(app)
      .patch(`/api/books/${book._id}/borrow`)
      .set("Cookie", cookieHeader);
    expect(r1.statusCode).toBe(200);

    const r2 = await request(app)
      .patch(`/api/books/${book._id}/borrow`)
      .set("Cookie", cookieHeader);
    expect(r2.statusCode).toBe(400);
    expect(r2.body.message).toMatch(/already borrowed/i);
  });

  it("returns a borrowed book (and re-increments quantity)", async () => {
    const cookieHeader = await loginAsUser();

    const book = await Book.create({
      title: "ReturnMe",
      author: "Someone",
      genre: "Sci-Fi",
      quantity: 1,
    });

    // Borrow
    await request(app)
      .patch(`/api/books/${book._id}/borrow`)
      .set("Cookie", cookieHeader);

    // Return
    const res = await request(app)
      .patch(`/api/books/${book._id}/return`)
      .set("Cookie", cookieHeader);

    expect(res.statusCode).toBe(200);
    expect(res.body.book.quantity).toBe(1);
  });

  it("fails to return if no active loan exists", async () => {
    const cookieHeader = await loginAsUser();

    const book = await Book.create({
      title: "NoLoanYet",
      author: "N/A",
      genre: "N/A",
      quantity: 1,
    });

    const res = await request(app)
      .patch(`/api/books/${book._id}/return`)
      .set("Cookie", cookieHeader);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/No active loan/i);
  });

  it("updates a book", async () => {
    const cookieHeader = await loginAsUser();

    const book = await Book.create({
      title: "Old Title",
      author: "Old Author",
      genre: "Mystery",
      quantity: 5,
    });

    const res = await request(app)
      .put(`/api/books/${book._id}`)
      .set("Cookie", cookieHeader)
      .send({ title: "New Title", author: "New Author", genre: "Thriller", quantity: 10 });

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe("New Title");
    expect(res.body.author).toBe("New Author");
    expect(res.body.genre).toBe("Thriller");
    expect(res.body.quantity).toBe(10);
  });

  it("merges on update when editing into an existing book’s identity", async () => {
    const cookieHeader = await loginAsUser();

    const a = await Book.create({
      title: "Base",
      author: "Author",
      genre: "Genre",
      quantity: 2,
    });
    const b = await Book.create({
      title: "Other",
      author: "Author",
      genre: "Genre",
      quantity: 4,
    });

    const res = await request(app)
      .put(`/api/books/${b._id}`)
      .set("Cookie", cookieHeader)
      .send({ title: "Base", author: "Author", genre: "Genre", quantity: 3 });

    expect(res.statusCode).toBe(200);

    // ✅ handle both response shapes: merged path returns { book: ... }
    const merged = res.body.book ?? res.body;
    expect(merged.title).toBe("Base");
    // total quantity should be 2 (from a) + 3 (update of b) = 5
    expect(merged.quantity).toBe(5);

    // optional: original 'b' should be removed after merge
    const stillThere = await Book.findById(b._id);
    expect(stillThere).toBeNull();
  });

  it("deletes a book", async () => {
    const cookieHeader = await loginAsUser();

    const book = await Book.create({
      title: "DeleteMe",
      author: "Author",
      genre: "Fantasy",
      quantity: 2,
    });

    const res = await request(app)
      .delete(`/api/books/${book._id}`)
      .set("Cookie", cookieHeader);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Book deleted");

    const find = await Book.findById(book._id);
    expect(find).toBeNull();
  });

  it("returns user stats (borrowed count) and history; admin sees global count", async () => {
    const userCookie = await loginAsUser();
    const adminCookie = await loginAsAdmin();

    // Create a book and borrow once as user
    const book = await Book.create({
      title: "Stats Book",
      author: "Someone",
      genre: "Data",
      quantity: 3,
    });

    await request(app).patch(`/api/books/${book._id}/borrow`).set("Cookie", userCookie);

    // user stats
    const userStats = await request(app)
      .get("/api/books/stats/borrowed")
      .set("Cookie", userCookie);
    expect(userStats.statusCode).toBe(200);
    expect(userStats.body.borrowed).toBe(1);

    // history
    const hist = await request(app)
      .get("/api/books/history")
      .set("Cookie", userCookie);
    expect(hist.statusCode).toBe(200);
    expect(Array.isArray(hist.body)).toBe(true);
    expect(hist.body.length).toBeGreaterThan(0);

    // admin sees global
    const adminStats = await request(app)
      .get("/api/books/stats/borrowed")
      .set("Cookie", adminCookie);
    expect(adminStats.statusCode).toBe(200);
    expect(adminStats.body.borrowed).toBeGreaterThanOrEqual(1);
  });

  it("lists active loans for a book", async () => {
    const userCookie = await loginAsUser();

    const book = await Book.create({
      title: "Loaned",
      author: "Auth",
      genre: "G",
      quantity: 1,
    });

    await request(app).patch(`/api/books/${book._id}/borrow`).set("Cookie", userCookie);

    const res = await request(app)
      .get(`/api/books/${book._id}/activeLoans`)
      .set("Cookie", userCookie);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toHaveProperty("userId");
  });
});

describe("Access control", () => {
  it("redirects /search to /auth/login when not authenticated", async () => {
    const res = await request(app).get("/search");
    expect([302, 301]).toContain(res.statusCode);
    expect((res.headers.location || "").includes("/auth/login")).toBe(true);
  });

  it("forbids /admin for non-admin; allows for admin", async () => {
    const userCookie = await loginAsUser();
    const resUser = await request(app).get("/admin").set("Cookie", userCookie);
    expect(resUser.statusCode).toBe(403);

    const adminCookie = await loginAsAdmin();
    const resAdmin = await request(app).get("/admin").set("Cookie", adminCookie);
    expect(resAdmin.statusCode).toBe(200);
  });

  it("GET /auth/users is admin-only", async () => {
    const userCookie = await loginAsUser();
    const r1 = await request(app).get("/auth/users").set("Cookie", userCookie);
    expect(r1.statusCode).toBe(403);

    const adminCookie = await loginAsAdmin();
    const r2 = await request(app).get("/auth/users").set("Cookie", adminCookie);
    expect(r2.statusCode).toBe(200);
    expect(Array.isArray(r2.body)).toBe(true);
  });
});
