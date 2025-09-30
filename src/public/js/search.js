const API_URL = "/api/books";
let currentReviewBookId = null;

function renderStars(avg = 0, count = 0) {
  const filled = Math.round(avg);
  const stars = Array.from({ length: 5 }, (_, i) => (i < filled ? "★" : "☆")).join("");
  return `${stars} <span class="muted" style="font-size:12px;">(${count})</span>`;
}

const resultsBody = document.getElementById("resultsBody");
const notification = document.getElementById("notification");
const isAdmin = resultsBody.dataset.isAdmin === "true";

// Stats
const statTotal = document.getElementById("statTotal");
const statAvailable = document.getElementById("statAvailable");
const statBorrowed = document.getElementById("statBorrowed");

// Modals
const borrowModal = document.getElementById("borrowModal");
const returnModal = document.getElementById("returnModal");

// ---- Review Modal elements ----
const reviewModal   = document.getElementById("reviewModal");
const reviewRating  = document.getElementById("reviewRating");
const reviewComment = document.getElementById("reviewComment");
const cancelReview  = document.getElementById("cancelReview");
const saveReview    = document.getElementById("saveReview");

// Loan history body (user only)
const loanHistoryBody = document.getElementById("loanHistoryBody");

let selectedBookId = null;
let borrowedBooks = new Set();
let searchQuery = ""; // 🔍 search text

/* ---------------- Helpers ---------------- */
async function syncBorrowedBooks() {
  if (isAdmin) return;
  try {
    const res = await fetch("/api/books/history", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch loan history");
    const history = await res.json();
    borrowedBooks = new Set(
      history.filter(h => !h.returnDate).map(h => h.bookId?._id)
    );
  } catch (err) {
    console.error("Error syncing borrowed books:", err);
  }
}

async function fetchBorrowStats() {
  try {
    const res = await fetch("/api/books/stats/borrowed", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch borrow stats");
    const data = await res.json();
    statBorrowed.textContent = data.borrowed ?? 0;
  } catch (err) {
    console.error("Error fetching borrow stats:", err);
    statBorrowed.textContent = "—";
  }
}

async function fetchBooks() {
  try {
    await syncBorrowedBooks();
    const res = await fetch(API_URL, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch books");
    const books = await res.json();
    renderBooks(books);
    await fetchBorrowStats();
  } catch (err) {
    console.error("Error loading books:", err);
    showNotification("❌ Failed to load books", "error");
  }
}

function renderBooks(books) {
  resultsBody.innerHTML = "";

  const filtered = books.filter(book => {
    const textMatch =
      book.title.toLowerCase().includes(searchQuery) ||
      book.author.toLowerCase().includes(searchQuery) ||
      (book.genre || "").toLowerCase().includes(searchQuery);
    return textMatch;
  });

  filtered.forEach(book => {
    const available = (book.quantity ?? 0) > 0;
    const isBorrowed = borrowedBooks.has(book._id);

    let statusText;
    if (isBorrowed) statusText = "⏳ Borrowed";
    else if (available) statusText = "🟢 Available";
    else statusText = "🔴 Unavailable";

    let rowHtml = `
      <td>${book.title}</td>
      <td>${book.author}</td>
      <td>${book.genre || "—"}</td>
      <td>${book.quantity ?? 0}</td>
      <td>${statusText}</td>
      <td>${renderStars(book.ratingAvg, book.ratingCount)}</td>
    `;

    if (!isAdmin) {
      rowHtml += `
        <td>
          <div class="actions-cell">
            <button class="btn-request" data-id="${book._id}" ${(!available || isBorrowed) ? "disabled" : ""}>Request</button>
            <button class="btn-return" data-id="${book._id}" ${isBorrowed ? "" : "disabled"}>Return</button>
            <button class="btn" data-action="review" data-id="${book._id}">Review</button>
          </div>
        </td>
      `;
    }

    const row = document.createElement("tr");
    row.innerHTML = rowHtml;
    resultsBody.appendChild(row);
  });

  statTotal.textContent = filtered.length;
  statAvailable.textContent = filtered.filter(b => (b.quantity ?? 0) > 0).length;
}

/* -------- Event delegation for row buttons -------- */
resultsBody.addEventListener("click", (e) => {
  if (isAdmin) return;

  const requestBtn = e.target.closest(".btn-request");
  if (requestBtn && !requestBtn.disabled) {
    selectedBookId = requestBtn.dataset.id;
    borrowModal.style.display = "flex";
    return;
  }

  const returnBtn = e.target.closest(".btn-return");
  if (returnBtn && !returnBtn.disabled) {
    selectedBookId = returnBtn.dataset.id;
    returnModal.style.display = "flex";
    return;
  }

  // ---- Open Review modal ----
  const reviewBtn = e.target.closest('[data-action="review"]');
  if (reviewBtn) {
    currentReviewBookId = reviewBtn.dataset.id;
    if (reviewRating)  reviewRating.value = "";
    if (reviewComment) reviewComment.value = "";
    if (reviewModal)   reviewModal.style.display = "flex";
    return;
  }
});

/* -------- Event delegation for modal buttons -------- */
document.addEventListener("click", async (e) => {
  if (isAdmin) return;
