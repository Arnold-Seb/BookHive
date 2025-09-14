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
  notification.className = `${type} show`;
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

// Update Dashboard Stats (📌 now includes quantity)
function updateStats(books) {
  const total = books.reduce((sum, b) => sum + (b.quantity || 0), 0);
  const available = books.filter(b => (b.quantity || 0) > 0).length;
  const borrowed = books.length - available;

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
      <td>${book.quantity ?? 0}</td>
      <td>${(book.quantity ?? 0) > 0 ? "🟢 Available" : "🔴 Unavailable"}</td>
      <td>
        <button onclick="editBook('${book._id}', '${book.title}', '${book.author}', '${book.genre}', ${book.quantity ?? 0})">✏️ Edit</button>
        <button onclick="deleteBook('${book._id}')">🗑️ Delete</button>
      </td>
    `;
    booksTable.appendChild(row);
  });
}

/* ===== Add Book ===== */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const qVal = Number(document.getElementById("quantity").value);
  const newBook = {
    title: document.getElementById("title").value,
    author: document.getElementById("author").value,
    genre: document.getElementById("genre").value,
    quantity: Number.isFinite(qVal) ? qVal : 1, // ✅ preserve 0
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
function editBook(id, title, author, genre, quantity) {
  document.getElementById("editId").value = id;
  document.getElementById("editTitle").value = title;
  document.getElementById("editAuthor").value = author;
  document.getElementById("editGenre").value = genre;
  document.getElementById("editQuantity").value = quantity;
  editModal.style.display = "flex";
}

/* Close modal */
closeModal.onclick = () => (editModal.style.display = "none");
window.onclick = (e) => { if (e.target === editModal) editModal.style.display = "none"; };

/* Submit edit form */
editBookForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("editId").value;
  const qVal = Number(document.getElementById("editQuantity").value);
  const updatedBook = {
    title: document.getElementById("editTitle").value,
    author: document.getElementById("editAuthor").value,
    genre: document.getElementById("editGenre").value,
    quantity: Number.isFinite(qVal) ? qVal : 1, // ✅ preserve 0
  };
  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedBook),
    });
    if (!res.ok) throw new Error("Failed to update book");
    fetchBooks();
    editModal.style.display = "none";
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
  deleteModal.style.display = "flex";
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

/* ===== Dark Mode ===== */
darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

/* ===== Initial Load ===== */
fetchBooks();
