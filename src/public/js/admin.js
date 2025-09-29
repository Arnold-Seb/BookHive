const API_URL = "/api/books";
const booksTable = document.querySelector("#booksTable tbody");
const form = document.querySelector("#addBookForm");

// Elements
const notification = document.getElementById("notification");
const searchBox = document.getElementById("searchBox");
const darkToggle = document.getElementById("darkToggle");

// Modals
const editModal = document.getElementById("editModal");
const closeModal = document.getElementById("closeModal");
const editBookForm = document.getElementById("editBookForm");

const deleteModal = document.getElementById("deleteModal");
const cancelDelete = document.getElementById("cancelDelete");
const confirmDelete = document.getElementById("confirmDelete");

const borrowModal = document.getElementById("borrowModal");
const cancelBorrow = document.getElementById("cancelBorrow");
const confirmBorrow = document.getElementById("confirmBorrow");
const borrowerSelect = document.getElementById("borrowerSelect"); // <select>

const returnModal = document.getElementById("returnModal");
const cancelReturn = document.getElementById("cancelReturn");
const confirmReturn = document.getElementById("confirmReturn");
const returnerSelect = document.getElementById("returnerSelect"); // <select>

/* ===== Filter & Search States ===== */
let statusFilter = "all";        // all | online | offline
let availabilityFilter = "all";  // all | available | unavailable
let searchQuery = "";            // 🔍 search text
let bookToBorrow = null;
let bookToReturn = null;

/* ===== Notifications ===== */
function showNotification(message, type = "success") {
  notification.textContent = message;
  notification.className = `${type} show`;
  setTimeout(() => {
    notification.classList.remove("show");
  }, 6000);
}

/* ===== Fetch & Render Books ===== */
async function fetchBooks() {
  try {
    const res = await fetch(API_URL, { credentials: "include" });
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
async function updateStats(books) {
  const total = books.length;
  const available = books.filter(b => (b.status === "online") || (b.quantity || 0) > 0).length;

  // 🔄 Global borrowed count
  let borrowed = 0;
  try {
    const res = await fetch("/api/books/stats/borrowed", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      borrowed = data.borrowed || 0;
    }
  } catch (err) {
    console.error("Error fetching global borrowed stats:", err);
  }

  const online = books.filter(b => b.status === "online").length;
  const offline = books.filter(b => b.status === "offline").length;

  document.getElementById("totalBooks").textContent = total;
  document.getElementById("availableBooks").textContent = available;
  document.getElementById("borrowedBooks").textContent = borrowed;
  document.getElementById("onlineBooks").textContent = online;
  document.getElementById("offlineBooks").textContent = offline;
}

/* ===== Render Books ===== */
function renderBooks(books) {
  booksTable.innerHTML = "";

  let filtered = books.filter(book => {
    const qty = Number(book.quantity || 0);
    const isOnline = book.status === "online";
    const isAvailable = isOnline || qty > 0;

    // 🔍 Search filter
    const textMatch =
      book.title.toLowerCase().includes(searchQuery) ||
      book.author.toLowerCase().includes(searchQuery) ||
      (book.genre || "").toLowerCase().includes(searchQuery);

    if (!textMatch) return false;
    if (statusFilter === "online" && book.status !== "online") return false;
    if (statusFilter === "offline" && book.status !== "offline") return false;
    if (availabilityFilter === "available" && !isAvailable) return false;
    if (availabilityFilter === "unavailable" && isAvailable) return false;

    return true;
  });

  filtered.forEach(book => {
    const qty = Number(book.quantity ?? 0);
    const isOnline = book.status === "online";

    const availabilityText = isOnline || qty > 0 ? "🟢 Available" : "🔴 Unavailable";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td title="${book.title}">${book.title}</td>
      <td title="${book.author}">${book.author}</td>
      <td title="${book.genre}">${book.genre}</td>
      <td>${qty}</td>
      <td>${availabilityText}</td>
      <td>${book.pdfData ? `<button class="btn-pdf" data-id="${book._id}">📄 View PDF</button>` : "No PDF"}</td>
      <td>${book.status || "offline"}</td>
      <td>
        <div class="actions-cell">
          <button class="btn-edit"
            data-id="${book._id}"
            data-title="${book.title}"
            data-author="${book.author}"
            data-genre="${book.genre}"
            data-quantity="${qty}"
            data-status="${book.status || "offline"}"
          >✏️ Edit</button>
          <button class="btn-delete" data-id="${book._id}">🗑️ Delete</button>
          <button class="btn-borrow" data-id="${book._id}" ${(qty === 0 && !isOnline) ? "disabled" : ""}>📉 Borrow</button>
          <button class="btn-return" data-id="${book._id}">🔁 Return</button>
        </div>
      </td>
    `;
    booksTable.appendChild(row);
  });

  attachRowEventListeners();
}

/* ===== Attach Row Event Listeners ===== */
function attachRowEventListeners() {
  document.querySelectorAll(".btn-pdf").forEach(btn => {
    btn.addEventListener("click", () => openPdf(btn.dataset.id));
  });
  document.querySelectorAll(".btn-edit").forEach(btn => {
    btn.addEventListener("click", () => editBook(
      btn.dataset.id,
      btn.dataset.title,
      btn.dataset.author,
      btn.dataset.genre,
      btn.dataset.quantity,
      btn.dataset.status
    ));
  });
  document.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", () => deleteBook(btn.dataset.id));
  });
  document.querySelectorAll(".btn-borrow").forEach(btn => {
    btn.addEventListener("click", () => borrowBook(btn.dataset.id));
  });
  document.querySelectorAll(".btn-return").forEach(btn => {
    btn.addEventListener("click", () => returnBook(btn.dataset.id));
  });
}

/* ===== PDF Modal ===== */
const pdfModal = document.createElement("div");
pdfModal.id = "pdfModal";
pdfModal.className = "modal";
pdfModal.innerHTML = `
  <div class="modal-content glass pdf-modal">
    <span class="close" id="closePdfModal">&times;</span>
    <iframe id="pdfViewer" width="100%" height="500px"></iframe>
  </div>
`;
document.body.appendChild(pdfModal);

function openPdf(bookId) {
  const viewer = document.getElementById("pdfViewer");
  viewer.src = `/api/books/${bookId}/pdf`;
  pdfModal.style.display = "flex";
}

document.getElementById("closePdfModal").onclick = () => {
  pdfModal.style.display = "none";
  document.getElementById("pdfViewer").src = "";
};

/* ===== Borrow / Return ===== */
async function borrowBook(id) {
  bookToBorrow = id;
  await populateBorrowerSelect();
  borrowModal.style.display = "flex";
}

async function returnBook(id) {
  bookToReturn = id;
  await populateReturnerSelect(id);
  returnModal.style.display = "flex";
}

cancelBorrow.addEventListener("click", () => {
  borrowModal.style.display = "none";
  bookToBorrow = null;
});
cancelReturn.addEventListener("click", () => {
  returnModal.style.display = "none";
  bookToReturn = null;
});

confirmBorrow.addEventListener("click", async () => {
  if (!bookToBorrow) return;
  const borrowerId = borrowerSelect.value;
  try {
    const res = await fetch(`${API_URL}/${bookToBorrow}/borrow`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ borrowerId })
    });
    if (!res.ok) throw new Error("Borrow failed");
    showNotification("📉 Borrowed 1 copy", "success");
    fetchBooks();
  } catch (err) {
    showNotification("❌ Failed to borrow book", "error");
  } finally {
    borrowModal.style.display = "none";
    bookToBorrow = null;
  }
});

confirmReturn.addEventListener("click", async () => {
  if (!bookToReturn) return;
  const borrowerId = returnerSelect.value;
  try {
    const res = await fetch(`${API_URL}/${bookToReturn}/return`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ borrowerId })
    });
    if (!res.ok) throw new Error("Return failed");
    showNotification("🔁 Returned 1 copy", "success");
    fetchBooks();
  } catch (err) {
    showNotification("❌ Failed to return book", "error");
  } finally {
    returnModal.style.display = "none";
    bookToReturn = null;
  }
});

/* ===== Populate Borrower Select ===== */
async function populateBorrowerSelect() {
  borrowerSelect.innerHTML = "";
  try {
    const res = await fetch("/auth/users", { credentials: "include" }); // ✅ fixed endpoint
    if (!res.ok) throw new Error("Failed to fetch users");
    const users = await res.json();

    if (!users.length) {
      borrowerSelect.innerHTML = "<option disabled>No users found</option>";
      return;
    }

    users.forEach(u => {
      const opt = document.createElement("option");
      opt.value = u._id;
      opt.textContent = `${u.name} (${u.role})`;
      borrowerSelect.appendChild(opt);
    });
  } catch (err) {
    console.error("Error loading users:", err);
    borrowerSelect.innerHTML = "<option disabled>Error loading users</option>";
  }
}

/* ===== Populate Returner Select ===== */
async function populateReturnerSelect(bookId) {
  returnerSelect.innerHTML = "";
  try {
    const res = await fetch(`/api/books/${bookId}/activeLoans`, { credentials: "include" });
    const loans = await res.json();
    loans.forEach(l => {
      const opt = document.createElement("option");
      opt.value = l.userId._id;
      opt.textContent = `${l.userId.name} (${l.userId.role})`;
      returnerSelect.appendChild(opt);
    });
  } catch {
    returnerSelect.innerHTML = "<option disabled>Error loading borrowers</option>";
  }
}

/* ===== Search & Filters ===== */
searchBox.addEventListener("input", (e) => {
  searchQuery = e.target.value.toLowerCase();
  fetchBooks();
});
const filterStatusBtn = document.getElementById("filterStatus");
const filterAvailabilityBtn = document.getElementById("filterAvailability");
if (filterStatusBtn) {
  filterStatusBtn.addEventListener("click", () => {
    if (statusFilter === "all") statusFilter = "online";
    else if (statusFilter === "online") statusFilter = "offline";
    else statusFilter = "all";
    filterStatusBtn.textContent = `Filter Status: ${capitalize(statusFilter)}`;
    fetchBooks();
  });
}
if (filterAvailabilityBtn) {
  filterAvailabilityBtn.addEventListener("click", () => {
    if (availabilityFilter === "all") availabilityFilter = "available";
    else if (availabilityFilter === "available") availabilityFilter = "unavailable";
    else availabilityFilter = "all";
    filterAvailabilityBtn.textContent = `Filter Availability: ${capitalize(availabilityFilter)}`;
    fetchBooks();
  });
}
function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/* ===== Dark Mode ===== */
darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

/* ===== Unified Modal Close ===== */
window.onclick = (e) => {
  if (e.target === pdfModal) pdfModal.style.display = "none";
  if (e.target === editModal) editModal.style.display = "none";
  if (e.target === deleteModal) deleteModal.style.display = "none";
  if (e.target === borrowModal) borrowModal.style.display = "none";
  if (e.target === returnModal) returnModal.style.display = "none";
};

/* ===== Add Book ===== */
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // ✅ stop page refresh

    const formData = new FormData();
    formData.append("title", document.getElementById("title").value.trim());
    formData.append("author", document.getElementById("author").value.trim());
    formData.append("genre", document.getElementById("genre").value.trim());

    const qVal = Number(document.getElementById("quantity").value) || 0;
    formData.append("quantity", qVal);

    formData.append("status", document.getElementById("status").value);

    const pdfFile = document.getElementById("pdfFile").files[0];
    if (pdfFile) formData.append("pdfFile", pdfFile);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add book");

      const data = await res.json();
      showNotification(data.message || "✅ Book added successfully", "success");

      form.reset();
      fetchBooks(); // refresh table
    } catch (err) {
      console.error("Error adding book:", err);
      showNotification("❌ Failed to add book", "error");
    }
  });
}

/* ===== Edit Book: open modal & submit ===== */
function editBook(id, title, author, genre, quantity, status) {
  document.getElementById("editId").value = id;
  document.getElementById("editTitle").value = title || "";
  document.getElementById("editAuthor").value = author || "";
  document.getElementById("editGenre").value = genre || "";
  document.getElementById("editQuantity").value = Number(quantity) || 0;
  document.getElementById("editStatus").value = status || "offline";
  editModal.style.display = "flex";
}

// close edit modal (X)
if (closeModal) {
  closeModal.addEventListener("click", () => {
    editModal.style.display = "none";
  });
}

// submit edit form (PUT /:id)
if (editBookForm) {
  editBookForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("editId").value;

    const fd = new FormData();
    fd.append("title", document.getElementById("editTitle").value.trim());
    fd.append("author", document.getElementById("editAuthor").value.trim());
    fd.append("genre", document.getElementById("editGenre").value.trim());
    fd.append("quantity", Number(document.getElementById("editQuantity").value) || 0);
    fd.append("status", document.getElementById("editStatus").value);

    const pdf = document.getElementById("editPdf").files[0];
    if (pdf) fd.append("pdfFile", pdf);

    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update book");
      showNotification("✏️ Book updated successfully", "success");
      editModal.style.display = "none";
      fetchBooks();
    } catch (err) {
      console.error("Error updating book:", err);
      showNotification("❌ Failed to update book", "error");
    }
  });
}

/* ===== Delete Book modal ===== */
let bookToDelete = null;

function deleteBook(id) {
  bookToDelete = id;
  deleteModal.style.display = "flex";
}

if (cancelDelete) {
  cancelDelete.addEventListener("click", () => {
    deleteModal.style.display = "none";
    bookToDelete = null;
  });
}

if (confirmDelete) {
  confirmDelete.addEventListener("click", async () => {
    if (!bookToDelete) return;
    try {
      const res = await fetch(`${API_URL}/${bookToDelete}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete book");
      showNotification("🗑️ Book deleted", "success");
      fetchBooks();
    } catch (err) {
      console.error("Error deleting book:", err);
      showNotification("❌ Failed to delete book", "error");
    } finally {
      deleteModal.style.display = "none";
      bookToDelete = null;
    }
  });
}

/* ===== Initial Load ===== */
fetchBooks();
