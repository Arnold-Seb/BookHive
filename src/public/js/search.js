const API_URL = "/api/books";

const resultsBody = document.getElementById("resultsBody");
const searchBox = document.getElementById("searchBox");
const notification = document.getElementById("notification");

// Stats
const statTotal = document.getElementById("statTotal");
const statAvailable = document.getElementById("statAvailable");
const statBorrowed = document.getElementById("statBorrowed");

// Modals
const borrowModal = document.getElementById("borrowModal");
const returnModal = document.getElementById("returnModal");
const cancelBorrow = document.getElementById("cancelBorrow");
const confirmBorrow = document.getElementById("confirmBorrow");
const cancelReturn = document.getElementById("cancelReturn");
const confirmReturn = document.getElementById("confirmReturn");

// Loan history body
const loanHistoryBody = document.getElementById("loanHistoryBody");

let selectedBookId = null;

// Track borrowed books for this user (persisted in localStorage)
let borrowedBooks = new Set(JSON.parse(localStorage.getItem("borrowedBooks") || "[]"));

function saveBorrowedBooks() {
  localStorage.setItem("borrowedBooks", JSON.stringify([...borrowedBooks]));
}

// Fetch books from backend
async function fetchBooks() {
  try {
    const res = await fetch(API_URL, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch books");
    const books = await res.json();
    renderBooks(books);
  } catch (err) {
    console.error("Error loading books:", err);
    showNotification("❌ Failed to load books", "error");
  }
}

// Render table rows
function renderBooks(books) {
  resultsBody.innerHTML = "";

  books.forEach((book) => {
    const available = (book.quantity ?? 0) > 0;
    const isBorrowed = borrowedBooks.has(book._id);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td title="${book.title}">${book.title}</td>
      <td title="${book.author}">${book.author}</td>
      <td>${book.genre || "—"}</td>
      <td>${book.quantity ?? 0}</td>
      <td>${available ? "🟢 Available" : "🔴 Unavailable"}</td>
      <td>
        <div class="actions-cell">
          <button class="btn-request" data-id="${book._id}" ${available ? "" : "disabled"}>Request</button>
          <button class="btn-return" data-id="${book._id}" ${isBorrowed ? "" : "disabled"}>Return</button>
        </div>
      </td>
    `;
    resultsBody.appendChild(row);
  });

  // Bind actions
  document.querySelectorAll(".btn-request").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      selectedBookId = btn.dataset.id;
      borrowModal.style.display = "flex";
    });
  });

  document.querySelectorAll(".btn-return").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      selectedBookId = btn.dataset.id;
      returnModal.style.display = "flex";
    });
  });

  // Update stats
  statTotal.textContent = books.length;
  statAvailable.textContent = books.filter(b => (b.quantity ?? 0) > 0).length;
  statBorrowed.textContent = books.filter(b => (b.quantity ?? 0) === 0).length;
}

// Borrow flow
confirmBorrow.addEventListener("click", async () => {
  if (!selectedBookId) return;
  try {
    const res = await fetch(`/api/books/${selectedBookId}/borrow`, { 
      method: "PATCH",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to borrow book");

    borrowedBooks.add(selectedBookId);
    saveBorrowedBooks();
    showNotification("✅ Book borrowed successfully", "success");
    fetchBooks();
    fetchLoanHistory(); // ✅ refresh history after borrow
  } catch (err) {
    console.error(err);
    showNotification("❌ Failed to borrow book", "error");
  } finally {
    borrowModal.style.display = "none";
    selectedBookId = null;
  }
});
cancelBorrow.addEventListener("click", () => {
  borrowModal.style.display = "none";
  selectedBookId = null;
});

// Return flow
confirmReturn.addEventListener("click", async () => {
  if (!selectedBookId) return;
  try {
    const res = await fetch(`/api/books/${selectedBookId}/return`, { 
      method: "PATCH",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to return book");

    borrowedBooks.delete(selectedBookId);
    saveBorrowedBooks();
    showNotification("✅ Book returned successfully", "success");
    fetchBooks();
    fetchLoanHistory(); // ✅ refresh history after return
  } catch (err) {
    console.error(err);
    showNotification("❌ Failed to return book", "error");
  } finally {
    returnModal.style.display = "none";
    selectedBookId = null;
  }
});
cancelReturn.addEventListener("click", () => {
  returnModal.style.display = "none";
  selectedBookId = null;
});

// Search filter
searchBox.addEventListener("input", () => {
  const filter = searchBox.value.toLowerCase();
  Array.from(resultsBody.rows).forEach(row => {
    const title = row.cells[0].textContent.toLowerCase();
    const author = row.cells[1].textContent.toLowerCase();
    row.style.display = (title.includes(filter) || author.includes(filter)) ? "" : "none";
  });
});

// ✅ Loan History fetch
async function fetchLoanHistory() {
  if (!loanHistoryBody) return; // if section not present
  try {
    const res = await fetch("/api/books/history", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch loan history");
    const history = await res.json();

    loanHistoryBody.innerHTML = "";

    if (!history || history.length === 0) {
      loanHistoryBody.innerHTML = "<tr><td colspan='3'>No past loans found</td></tr>";
      return;
    }

    history.forEach(loan => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${loan.bookId?.title || "—"}</td>
            <td>${loan.borrowDate ? new Date(loan.borrowDate).toLocaleDateString() : "-"}</td>
            <td>${loan.returnDate ? new Date(loan.returnDate).toLocaleDateString() : "-"}</td>
        `;
        loanHistoryBody.appendChild(row);
    });
  } catch (err) {
    console.error("Error fetching loan history:", err);
  }
}

// Notification helper
function showNotification(msg, type) {
  notification.textContent = msg;
  notification.className = type === "error" ? "error show" : "success show";
  setTimeout(() => notification.classList.remove("show"), 2200);
}

// Initial load
fetchBooks();
fetchLoanHistory(); // ✅ also fetch history on load
