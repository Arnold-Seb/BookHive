const API_URL = "/api/books";
const booksTable = document.querySelector("#resultsBody"); // ✅ fixed selector
const searchBox = document.getElementById("searchBox");
const notification = document.getElementById("notification");

// Borrow Modal Elements
const borrowModal = document.getElementById("borrowModal");
const cancelBorrow = document.getElementById("cancelBorrow");
const confirmBorrow = document.getElementById("confirmBorrow");

let bookToBorrow = null;

// Fetch books from server
async function fetchBooks() {
  try {
    const res = await fetch(API_URL, { credentials: "include" }); 
    const books = await res.json();
    renderBooks(books);
  } catch (error) {
    console.error(error);
    showNotification("❌ Failed to load books", "error");
  }
}

// Render book table
function renderBooks(books) {
  booksTable.innerHTML = "";
  books.forEach((book) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${book.title}</td>
      <td>${book.author}</td>
      <td>${book.genre}</td>
      <td>${book.quantity ?? 0}</td>
      <td>${(book.quantity ?? 0) > 0 ? "🟢 Available" : "🔴 Unavailable"}</td>
      <td>
        <button class="borrow-btn" data-id="${book._id}" ${book.quantity === 0 ? "disabled" : ""}>
          📚 Borrow
        </button>
      </td>
    `;
    booksTable.appendChild(row);
  });

  document.querySelectorAll(".borrow-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      bookToBorrow = btn.getAttribute("data-id");
      borrowModal.style.display = "flex";
    });
  });
}

// Cancel borrow
cancelBorrow.addEventListener("click", () => {
  bookToBorrow = null;
  borrowModal.style.display = "none";
});

// Confirm borrow
confirmBorrow.addEventListener("click", async () => {
  if (!bookToBorrow) return;

  try {
    const res = await fetch(`/api/books/${bookToBorrow}/borrow`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Failed to borrow book");

    showNotification("✅ Book borrowed successfully", "success");
    fetchBooks();
    fetchLoanHistory(); // ✅ refresh history
  } catch (error) {
    console.error(error);
    showNotification("❌ Failed to borrow book", "error");
  } finally {
    borrowModal.style.display = "none";
    bookToBorrow = null;
  }
});

// Search functionality
searchBox.addEventListener("input", () => {
  const filter = searchBox.value.toLowerCase();
  Array.from(booksTable.rows).forEach(row => {
    const title = row.cells[0].textContent.toLowerCase();
    const author = row.cells[1].textContent.toLowerCase();
    const genre = row.cells[2].textContent.toLowerCase();
    row.style.display = (title.includes(filter) || author.includes(filter) || genre.includes(filter)) ? "" : "none";
  });
});

// ✅ Loan History fetch
async function fetchLoanHistory() {
  try {
    const res = await fetch("/api/books/history", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch loan history");
    const history = await res.json();

    const body = document.getElementById("loanHistoryBody");
    body.innerHTML = "";

    if (!history || history.length === 0) {
      body.innerHTML = "<tr><td colspan='3'>No past loans found</td></tr>";
      return;
    }

    history.forEach(loan => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${loan.bookTitle}</td>
        <td>${loan.borrowDate ? new Date(loan.borrowDate).toLocaleDateString() : "-"}</td>
        <td>${loan.returnDate ? new Date(loan.returnDate).toLocaleDateString() : "-"}</td>
      `;
      body.appendChild(row);
    });
  } catch (err) {
    console.error(err);
    showNotification("❌ Failed to load loan history", "error");
  }
}

// Notification helper
function showNotification(message, type) {
  notification.textContent = message;
  notification.className = type; 
  setTimeout(() => notification.textContent = "", 3000);
}

// Close modal if clicked outside
window.addEventListener("click", (e) => {
  if (e.target === borrowModal) borrowModal.style.display = "none";
});

// Initial fetch
fetchBooks();
fetchLoanHistory();
