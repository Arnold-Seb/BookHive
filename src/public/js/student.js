const API_BOOKS = "/api/books";
const API_BORROW = "/api/borrow";
const booksTable = document.querySelector("#booksTable tbody");
const notification = document.getElementById("notification");
const searchBox = document.getElementById("searchBox");
const darkToggle = document.getElementById("darkToggle");

function showNotification(msg, type = "success") {
  notification.textContent = msg;
  notification.className = `${type} show`;
  setTimeout(() => notification.classList.remove("show"), 3000);
}

async function fetchBooks() {
  try {
    const res = await fetch(API_BOOKS);
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
    const available = (book.quantity ?? 0) > 0;
    row.innerHTML = `
      <td>${book.title}</td>
      <td>${book.author}</td>
      <td>${book.genre}</td>
      <td>${book.quantity ?? 0}</td>
      <td>${available ? "🟢 Available" : "🔴 Unavailable"}</td>
      <td>
        <button class="borrow-btn" data-id="${book._id}" ${!available ? "disabled" : ""}>
          Borrow
        </button>
      </td>
    `;
    booksTable.appendChild(row);
  });

  // attach event listeners
  booksTable.querySelectorAll(".borrow-btn").forEach(btn =>
    btn.addEventListener("click", () => borrowBook(btn.dataset.id))
  );
}

async function borrowBook(bookId) {
  try {
    const res = await fetch(API_BORROW, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error borrowing book");
    showNotification("✅ Book borrowed!");
    fetchBooks(); // refresh table to update quantity
  } catch (err) {
    console.error(err);
    showNotification(`❌ ${err.message}`, "error");
  }
}

searchBox.addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  Array.from(booksTable.rows).forEach(r =>
    r.style.display = r.textContent.toLowerCase().includes(q) ? "" : "none"
  );
});

darkToggle.addEventListener("click", () => document.body.classList.toggle("dark"));

fetchBooks();
