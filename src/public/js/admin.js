const API_URL = "/api/books";
const booksTable = document.querySelector("#booksTable tbody");
const form = document.querySelector("#addBookForm");

// Elements
const notification = document.getElementById("notification");
const searchBox = document.getElementById("searchBox");
const darkToggle = document.getElementById("darkToggle");

// Modal
const editModal = document.getElementById("editModal");
const closeModal = document.getElementById("closeModal");
const editBookForm = document.getElementById("editBookForm");

/* ===== Notifications ===== */
function showNotification(message, type = "success") {
  notification.textContent = message;
  notification.className = `${type} show`; // apply color + slide-in
  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
}

/* ===== Fetch & Render Books ===== */
async function fetchBooks() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Failed to fetch books");
    const books = await res.json();
    renderBooks(books);
    updateStats(books);
  } catch (error) {
    console.error("Error fetching books:", error);
    showNotification("❌ Server Timeout", "error");
  }
}

// Update Dashboard Stats
function updateStats(books) {
  const total = books.length;

  // if "available" is missing, treat it as available
  const available = books.filter(b => b.available !== false).length;
  const borrowed = total - available;

  document.getElementById("totalBooks").textContent = total;
  document.getElementById("availableBooks").textContent = available;
  document.getElementById("borrowedBooks").textContent = borrowed;
}


function renderBooks(books) {
  booksTable.innerHTML = "";
  books.forEach((book) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td title="${book.title}">${book.title}</td>
      <td title="${book.author}">${book.author}</td>
      <td title="${book.genre}">${book.genre}</td>
      <td>${book.available ? "Available" : "Borrowed"}</td>
      <td>
        <button onclick="editBook('${book._id}', '${book.title}', '${book.author}', '${book.genre}')">✏️ Edit</button>
        <button onclick="deleteBook('${book._id}')">🗑️ Delete</button>
      </td>
    `;
    booksTable.appendChild(row);
  });
}

/* ===== Add Book ===== */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const newBook = {
    title: document.getElementById("title").value,
    author: document.getElementById("author").value,
    genre: document.getElementById("genre").value,
  };
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBook),
    });
    if (!res.ok) throw new Error("Failed to add book");
    form.reset();
    fetchBooks();
    showNotification("✅ Book added successfully", "success");
  } catch (error) {
    console.error("Error adding book:", error);
    showNotification("❌ Failed to add book", "error");
  }
});

/* ===== Edit Book ===== */
function editBook(id, title, author, genre) {
  document.getElementById("editId").value = id;
  document.getElementById("editTitle").value = title;
  document.getElementById("editAuthor").value = author;
  document.getElementById("editGenre").value = genre;
  editModal.style.display = "flex";   // ✅ show as flex, stays centered
}

/* Close modal */
closeModal.onclick = () => (editModal.style.display = "none");
window.onclick = (e) => { if (e.target === editModal) editModal.style.display = "none"; };

/* Submit edit form */
editBookForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("editId").value;
  const updatedBook = {
    title: document.getElementById("editTitle").value,
    author: document.getElementById("editAuthor").value,
    genre: document.getElementById("editGenre").value,
  };
  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedBook),
    });
    if (!res.ok) throw new Error("Failed to update book");
    fetchBooks();
    editModal.style.display = "none";   // ✅ close properly
    showNotification("✏️ Book updated successfully", "success");
  } catch (error) {
    console.error("Error updating book:", error);
    showNotification("❌ Failed to update book", "error");
  }
});


/* ===== Delete Book with Custom Modal ===== */
let bookToDelete = null;
const deleteModal = document.getElementById("deleteModal");
const cancelDelete = document.getElementById("cancelDelete");
const confirmDelete = document.getElementById("confirmDelete");

function deleteBook(id) {
  bookToDelete = id;
  deleteModal.style.display = "flex"; // show modal
}

// Cancel
cancelDelete.addEventListener("click", () => {
  deleteModal.style.display = "none";
  bookToDelete = null;
});

// Confirm
confirmDelete.addEventListener("click", async () => {
  if (!bookToDelete) return;

  try {
    const res = await fetch(`${API_URL}/${bookToDelete}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete book");
    fetchBooks();
    showNotification("🗑️ Book deleted", "success");
  } catch (error) {
    console.error("Error deleting book:", error);
    showNotification("❌ Failed to delete book", "error");
  } finally {
    deleteModal.style.display = "none";
    bookToDelete = null;
  }
});

// Close modal if clicked outside
window.addEventListener("click", (e) => {
  if (e.target === deleteModal) {
    deleteModal.style.display = "none";
    bookToDelete = null;
  }
});


/* ===== Search ===== */
searchBox.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase();
  Array.from(booksTable.querySelectorAll("tr")).forEach((row) => {
    row.style.display = row.textContent.toLowerCase().includes(query) ? "" : "none";
  });
});

let currentSort = { column: null, asc: true };

// Handle sorting
document.querySelectorAll("#booksTable thead th[data-column]").forEach((th) => {
  th.addEventListener("click", () => {
    const column = th.dataset.column;

    // Toggle sort direction if same column is clicked
    if (currentSort.column === column) {
      currentSort.asc = !currentSort.asc;
    } else {
      currentSort = { column, asc: true };
    }

    sortBooks(column, currentSort.asc);
  });
});

function sortBooks(column, asc = true) {
  const rows = Array.from(booksTable.querySelectorAll("tr"));
  rows.sort((a, b) => {
    const aVal = a.querySelector(`td:nth-child(${getColumnIndex(column)})`).innerText.toLowerCase();
    const bVal = b.querySelector(`td:nth-child(${getColumnIndex(column)})`).innerText.toLowerCase();

    if (aVal < bVal) return asc ? -1 : 1;
    if (aVal > bVal) return asc ? 1 : -1;
    return 0;
  });

  // Re-attach rows
  booksTable.innerHTML = "";
  rows.forEach((row) => booksTable.appendChild(row));
}

// Map column name to index in table
function getColumnIndex(column) {
  switch (column) {
    case "title": return 1;
    case "author": return 2;
    case "genre": return 3;
    case "available": return 4;
    default: return 1;
  }
}


/* ===== Dark Mode ===== */
darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

/* ===== Initial Load ===== */
fetchBooks();
