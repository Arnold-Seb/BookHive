const API_URL = "/api/books";
const booksTable = document.querySelector("#booksTable tbody");
const notification = document.getElementById("notification");
const searchBox = document.getElementById("searchBox");
const darkToggle = document.getElementById("darkToggle");

/* ===== Notification helper ===== */
function showNotification(message, type = "success") {
  notification.textContent = message;
  notification.className = `${type} show`;
  setTimeout(() => notification.classList.remove("show"), 3000);
}

/* ===== Fetch & Render Books ===== */
async function fetchBooks() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Failed to fetch books");
    const books = await res.json();
    renderBooks(books);
  } catch (err) {
    console.error(err);
    showNotification("❌ Could not load books", "error");
  }
}

function renderBooks(books) {
  booksTable.innerHTML = "";
  books.forEach(book => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td title="${book.title}">${book.title}</td>
      <td title="${book.author}">${book.author}</td>
      <td title="${book.genre}">${book.genre}</td>
      <td>${book.quantity ?? 0}</td>
      <td>${(book.quantity ?? 0) > 0 ? "🟢 Available" : "🔴 Unavailable"}</td>
    `;
    booksTable.appendChild(row);
  });
}

/* ===== Search ===== */
searchBox.addEventListener("input", e => {
  const query = e.target.value.toLowerCase();
  Array.from(booksTable.querySelectorAll("tr")).forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(query) ? "" : "none";
  });
});

/* ===== Dark Mode ===== */
darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

/* ===== Init ===== */
fetchBooks();
