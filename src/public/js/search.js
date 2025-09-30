const API_URL = "/api/books";
let currentReviewBookId = null;

function renderStars(avg = 0, count = 0) {
  const filled = Math.round(avg || 0);
  const stars = Array.from({ length: 5 }, (_, i) => (i < filled ? "★" : "☆")).join("");
  return `${stars} <span class="muted" style="font-size:12px;">(${count || 0})</span>`;
}

const resultsBody = document.getElementById("resultsBody");
const notification = document.getElementById("notification");
const isAdmin = resultsBody.dataset.isAdmin === "true";

// Stats
const statTotal = document.getElementById("statTotal");
const statAvailable = document.getElementById("statAvailable");
const statBorrowed = document.getElementById("statBorrowed");

// Borrow/Return Modals
const borrowModal = document.getElementById("borrowModal");
const returnModal = document.getElementById("returnModal");

// ---- Review Modal elements (must exist in search.ejs) ----
const reviewModal   = document.getElementById("reviewModal");
const reviewRating  = document.getElementById("reviewRating");
const reviewComment = document.getElementById("reviewComment");
const cancelReview  = document.getElementById("cancelReview");
const saveReview    = document.getElementById("saveReview");

// ---- Reviews List Modal elements ----
const reviewsListModal = document.getElementById("reviewsListModal");
const reviewsListBody  = document.getElementById("reviewsListBody");
const closeReviewsList = document.getElementById("closeReviewsList");

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
    borrowedBooks = new Set(history.filter(h => !h.returnDate).map(h => h.bookId?._id));
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
      <td>
        <span class="rating-cell"
              data-action="open-reviews"
              data-id="${book._id}"
              style="cursor:pointer;"
              title="View all reviews">
          ${renderStars(book.ratingAvg, book.ratingCount)}
        </span>
      </td>
    `;

    if (!isAdmin) {
      rowHtml += `
        <td>
          <div class="actions-cell">
            <button class="btn-request" data-id="${book._id}" ${(!available || isBorrowed) ? "disabled" : ""}>Request</button>
            <button class="btn-return"  data-id="${book._id}" ${isBorrowed ? "" : "disabled"}>Return</button>
            <button class="btn"         data-action="review"        data-id="${book._id}">Review</button>
            <button class="btn-view"    data-action="view-reviews"  data-id="${book._id}">View</button>
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
resultsBody.addEventListener("click", async (e) => {
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

    // Optional: prefill my existing review if present
    try {
      const res = await fetch(`${API_URL}/${currentReviewBookId}/reviews`, { credentials: "include" });
      const items = await res.json().catch(() => []);
      const me = (window.CURRENT_USER_EMAIL || "").toLowerCase();
      const mine = items.find(r => (r.userId?.email || "").toLowerCase() === me);
      if (mine) {
        if (reviewRating)  reviewRating.value = mine.rating;
        if (reviewComment) reviewComment.value = mine.comment || "";
      }
    } catch {}
    return;
  }

  // ---- Open Reviews List modal ----
  const viewBtn = e.target.closest('[data-action="view-reviews"]');
  if (viewBtn) {
    openReviewsList(viewBtn.dataset.id);
    return;
  }
});

/* -------- Event delegation for modal buttons -------- */
document.addEventListener("click", async (e) => {
  if (isAdmin) return;

  // cancel borrow
  if (e.target.id === "cancelBorrow") {
    borrowModal.style.display = "none";
    selectedBookId = null;
    return;
  }

  // confirm borrow
  if (e.target.id === "confirmBorrow") {
    if (!selectedBookId) return;
    try {
      const res = await fetch(`/api/books/${selectedBookId}/borrow`, {
        method: "PATCH",
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to borrow");
      showNotification("✅ Book borrowed successfully", "success");
      await syncBorrowedBooks();
      await fetchBooks();
      await fetchLoanHistory();
    } catch (err) {
      console.error(err);
      showNotification("❌ " + err.message, "error");
    } finally {
      borrowModal.style.display = "none";
      selectedBookId = null;
    }
    return;
  }

  // cancel return
  if (e.target.id === "cancelReturn") {
    returnModal.style.display = "none";
    selectedBookId = null;
    return;
  }

  // confirm return
  if (e.target.id === "confirmReturn") {
    if (!selectedBookId) return;
    try {
      const res = await fetch(`/api/books/${selectedBookId}/return`, {
        method: "PATCH",
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to return");
      showNotification("✅ Book returned successfully", "success");
      await syncBorrowedBooks();
      await fetchBooks();
      await fetchLoanHistory();
    } catch (err) {
      console.error(err);
      showNotification("❌ " + err.message, "error");
    } finally {
      returnModal.style.display = "none";
      selectedBookId = null;
    }
  }
});

/* -------- Review modal: save & cancel -------- */
if (cancelReview) {
  cancelReview.addEventListener("click", () => {
    if (reviewModal) reviewModal.style.display = "none";
    currentReviewBookId = null;
  });
}

if (saveReview) {
  saveReview.addEventListener("click", async () => {
    if (!currentReviewBookId) return;

    const rating  = Number(reviewRating?.value || 0);
    const comment = (reviewComment?.value || "").trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      showNotification("❌ Rating must be between 1 and 5", "error");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/${currentReviewBookId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating, comment })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to save review");

      showNotification("⭐ Review saved", "success");
      await fetchBooks(); // refresh stars (avg & count)
    } catch (err) {
      console.error(err);
      showNotification("❌ " + err.message, "error");
    } finally {
      if (reviewModal) reviewModal.style.display = "none";
      currentReviewBookId = null;
    }
  });
}

/* ---- Reviews list modal helpers ---- */
function starsInline(n = 0) {
  const s = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
  return Array.from({ length: 5 }, (_, i) => (i < s ? "★" : "☆")).join("");
}

async function openReviewsList(bookId) {
  if (!reviewsListModal || !reviewsListBody) return;
  reviewsListBody.innerHTML = "<div class='muted'>Loading…</div>";
  reviewsListModal.style.display = "flex";
  try {
    const res = await fetch(`${API_URL}/${bookId}/reviews`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load reviews");
    const items = await res.json();
    if (!items.length) {
      reviewsListBody.innerHTML = "<div class='muted'>No reviews yet.</div>";
      return;
    }
    reviewsListBody.innerHTML = items.map(r => {
      const name = r.userId?.name || r.userId?.email || "Anonymous";
      const when = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "";
      const comment = (r.comment || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `
        <div class="review-item" style="padding:10px 0; border-bottom:1px solid #eee;">
          <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
            <strong>${name}</strong>
            <span>${starsInline(r.rating)}</span>
          </div>
          ${comment ? `<div style="margin-top:6px;">${comment}</div>` : ""}
          <div class="muted" style="margin-top:4px; font-size:12px;">${when}</div>
        </div>
      `;
    }).join("");
  } catch (e) {
    console.error(e);
    reviewsListBody.innerHTML = "<div class='muted'>Failed to load reviews.</div>";
  }
}

if (closeReviewsList) {
  closeReviewsList.addEventListener("click", () => {
    reviewsListModal.style.display = "none";
  });
}
window.addEventListener("click", (e) => {
  if (e.target === reviewsListModal) reviewsListModal.style.display = "none";
});

/* ---------------- Loan history (user only) ---------------- */
async function fetchLoanHistory() {
  if (isAdmin || !loanHistoryBody) return;
  try {
    const res = await fetch("/api/books/history", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch loan history");
    const history = await res.json();

    loanHistoryBody.innerHTML = "";
    if (!history || history.length === 0) {
      loanHistoryBody.innerHTML = "<tr><td colspan='4'>No past loans found</td></tr>";
      return;
    }

    history.forEach(loan => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${loan.bookId?.title || "—"}</td>
        <td>${loan.borrowDate ? new Date(loan.borrowDate).toLocaleDateString() : "-"}</td>
        <td>${loan.returnDate ? new Date(loan.returnDate).toLocaleDateString() : "-"}</td>
        <td>${loan.returnDate ? "✅ Returned" : "⏳ Borrowed"}</td>
      `;
      loanHistoryBody.appendChild(row);
    });
  } catch (err) {
    console.error("Error fetching loan history:", err);
  }
}

/* ---------------- Notifications ---------------- */
function showNotification(msg, type) {
  notification.textContent = msg;
  notification.className = type === "error" ? "error show" : "success show";
  setTimeout(() => notification.classList.remove("show"), 2500);
}

/* ===== Search Input ===== */
const searchBox = document.getElementById("searchBox");
if (searchBox) {
  searchBox.addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase();
    fetchBooks();
  });
}

/* ---------------- Init ---------------- */
fetchBooks();
fetchLoanHistory();
