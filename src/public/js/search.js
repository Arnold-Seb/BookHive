const API_URL = "/api/books";

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

// Loan history body (user only)
const loanHistoryBody = document.getElementById("loanHistoryBody");

let selectedBookId = null;
let borrowedBooks = new Set();

/* ---------------- Helpers ---------------- */
async function syncBorrowedBooks() {
  if (isAdmin) return; // admins don't track personal loans in UI
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

async function fetchBooks() {
  try {
    await syncBorrowedBooks();
    const res = await fetch(API_URL, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch books");
    const books = await res.json();
    renderBooks(books);
  } catch (err) {
    console.error("Error loading books:", err);
    showNotification("❌ Failed to load books", "error");
  }
}

function renderBooks(books) {
  resultsBody.innerHTML = "";

  books.forEach(book => {
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
    `;

    if (!isAdmin) {
      rowHtml += `
        <td>
          <div class="actions-cell">
            <button class="btn-request" data-id="${book._id}" ${(!available || isBorrowed) ? "disabled" : ""}>Request</button>
            <button class="btn-return" data-id="${book._id}" ${isBorrowed ? "" : "disabled"}>Return</button>
          </div>
        </td>
      `;
    }

    const row = document.createElement("tr");
    row.innerHTML = rowHtml;
    resultsBody.appendChild(row);
  });

  statTotal.textContent = books.length;
  statAvailable.textContent = books.filter(b => (b.quantity ?? 0) > 0).length;
  statBorrowed.textContent = isAdmin ? "—" : borrowedBooks.size;
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
});

/* -------- Event delegation for modal buttons -------- */
document.addEventListener("click", async (e) => {
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

/* ---------------- Init ---------------- */
fetchBooks();
fetchLoanHistory();
