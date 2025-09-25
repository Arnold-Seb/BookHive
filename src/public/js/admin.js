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

/* ===== Filters ===== */
let statusFilter = "all";        // all | online | offline
let availabilityFilter = "all";  // all | available | unavailable
let filterTitle, filterAuthor, filterQuantity, clearFilters;

/* ===== Notifications ===== */
function showNotification(message, type = "success") {
  notification.textContent = message;
  notification.className = `${type} show`;
  setTimeout(() => {
    notification.classList.remove("show");
  }, 6000);
}

/* ===== Fetch Borrowed Total ===== */
async function fetchBorrowedTotal() {
  try {
    const res = await fetch("/api/borrow/total");
    if (!res.ok) throw new Error("Failed to fetch borrowed data");
    const data = await res.json();
    document.getElementById("borrowedBooks").textContent = data.totalBorrowed;
  } catch (err) {
    console.error("Error fetching borrowed data:", err);
    document.getElementById("borrowedBooks").textContent = "0";
  }
}

/* ===== Apply Filters to Books ===== */
function filterBooks(books) {
  if (!filterTitle || !filterAuthor || !filterQuantity) {
    return books;
  }

  const titleFilter = filterTitle.value.toLowerCase();
  const authorFilter = filterAuthor.value.toLowerCase();
  const quantityFilter = filterQuantity.value;

  return books.filter(book => {
    if (titleFilter && !book.title.toLowerCase().includes(titleFilter)) return false;
    if (authorFilter && !book.author.toLowerCase().includes(authorFilter)) return false;
    if (quantityFilter) {
      const quantity = book.quantity || 0;
      switch (quantityFilter) {
        case "0":
          if (quantity !== 0) return false;
          break;
        case "1":
          if (quantity < 1 || quantity > 5) return false;
          break;
        case "6":
          if (quantity < 6) return false;
          break;
      }
    }
    return true;
  });
}

/* ===== Fetch & Render Books ===== */
async function fetchBooks() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Failed to fetch books");
    const books = await res.json();

    // Apply filters
    const filteredBooks = filterBooks(books);
    renderBooks(filteredBooks);

    // Update stats (all counters)
    updateStats(books);

    // Fetch borrowed count from Borrow model (overrides borrowedBooks)
    await fetchBorrowedTotal();
  } catch (error) {
    console.error("Error fetching books:", error);
    showNotification("❌ Server Timeout", "error");
  }
}

/* ===== Update Dashboard Stats ===== */
function updateStats(books) {
  const total = books.length;

  const available = books.filter(b => {
    if (b.status === "online") return true;
    return (b.quantity || 0) > 0;
  }).length;

  const borrowed = total - available;
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

  let filtered = books.filter((book) => {
    const qty = Number(book.quantity || 0);
    const isOnline = book.status === "online";
    const isAvailable = isOnline || qty > 0;

    // Status filter
    if (statusFilter === "online" && book.status !== "online") return false;
    if (statusFilter === "offline" && book.status !== "offline") return false;

    // Availability filter
    if (availabilityFilter === "available" && !isAvailable) return false;
    if (availabilityFilter === "unavailable" && isAvailable) return false;

    return true;
  });

  filtered.forEach((book) => {
    const qty = Number(book.quantity ?? 0);
    const isOnline = book.status === "online";

    const availabilityText = isOnline
      ? "🟢 Available"
      : qty > 0
      ? "🟢 Available"
      : "🔴 Unavailable";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td title="${book.title}">${book.title}</td>
      <td title="${book.author}">${book.author}</td>
      <td title="${book.genre}">${book.genre}</td>
      <td>${qty}</td>
      <td>${availabilityText}</td>
      <td>
        ${
          book.pdfData
            ? `<button class="btn-pdf" onclick="openPdf('${book._id}')">📄 View PDF</button>`
            : "No PDF"
        }
      </td>
      <td>${book.status || "offline"}</td>
      <td>
        <div class="actions-cell">
          <button class="btn-edit" 
            onclick="editBook('${book._id}', '${book.title}', '${book.author}', '${book.genre}', ${qty}, '${book.status || "offline"}')">✏️ Edit</button>
          <button class="btn-delete" onclick="deleteBook('${book._id}')">🗑️ Delete</button>
          <button class="btn-borrow" onclick="borrowBook('${book._id}')" ${(qty === 0 && !isOnline) ? "disabled" : ""}>📉 Borrow</button>
          <button class="btn-return" onclick="returnBook('${book._id}')">🔁 Return</button>
        </div>
      </td>
    `;
    booksTable.appendChild(row);
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

window.onclick = (e) => {
  if (e.target === pdfModal) {
    pdfModal.style.display = "none";
    document.getElementById("pdfViewer").src = "";
  }
};

/* ===== Add Book ===== */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append("title", document.getElementById("title").value);
  formData.append("author", document.getElementById("author").value);
  formData.append("genre", document.getElementById("genre").value);

  const qVal = Number(document.getElementById("quantity").value);
  formData.append("quantity", Number.isFinite(qVal) ? qVal : 0); // ✅ allow 0

  formData.append("status", document.getElementById("status").value);

  const pdfFile = document.getElementById("pdfFile").files[0];
  if (pdfFile) formData.append("pdfFile", pdfFile);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: formData,
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
function editBook(id, title, author, genre, quantity, status) {
  document.getElementById("editId").value = id;
  document.getElementById("editTitle").value = title;
  document.getElementById("editAuthor").value = author;
  document.getElementById("editGenre").value = genre;
  document.getElementById("editQuantity").value = quantity;
  document.getElementById("editStatus").value = status;
  editModal.style.display = "flex";
}

closeModal.onclick = () => (editModal.style.display = "none");
window.onclick = (e) => {
  if (e.target === editModal) editModal.style.display = "none";
};

editBookForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("editId").value;

  const formData = new FormData();
  formData.append("title", document.getElementById("editTitle").value);
  formData.append("author", document.getElementById("editAuthor").value);
  formData.append("genre", document.getElementById("editGenre").value);

  const qVal = Number(document.getElementById("editQuantity").value);
  formData.append("quantity", Number.isFinite(qVal) ? qVal : 0); // ✅ allow 0

  formData.append("status", document.getElementById("editStatus").value);

  const pdfFile = document.getElementById("editPdf").files[0];
  if (pdfFile) formData.append("pdfFile", pdfFile);

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      body: formData,
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

/* ===== Delete Book ===== */
let bookToDelete = null;
const deleteModal = document.getElementById("deleteModal");
const cancelDelete = document.getElementById("cancelDelete");
const confirmDelete = document.getElementById("confirmDelete");

function deleteBook(id) {
  bookToDelete = id;
  deleteModal.style.display = "flex";
}

cancelDelete.addEventListener("click", () => {
  deleteModal.style.display = "none";
  bookToDelete = null;
});

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

/* ===== Filter Toggles ===== */
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

// ===== Borrow / Return =====
let bookToBorrow = null;
let bookToReturn = null;

const borrowModal = document.getElementById("borrowModal");
const cancelBorrow = document.getElementById("cancelBorrow");
const confirmBorrow = document.getElementById("confirmBorrow");

const returnModal = document.getElementById("returnModal");
const cancelReturn = document.getElementById("cancelReturn");
const confirmReturn = document.getElementById("confirmReturn");

function borrowBook(id) {
  bookToBorrow = id;
  borrowModal.style.display = "flex";
}

function returnBook(id) {
  bookToReturn = id;
  returnModal.style.display = "flex";
}

cancelBorrow.addEventListener("click", () => {
  borrowModal.style.display = "none";
  bookToBorrow = null;
});

confirmBorrow.addEventListener("click", async () => {
  if (!bookToBorrow) return;
  try {
    const res = await fetch(`${API_URL}/${bookToBorrow}/borrow`, { method: "PATCH" });
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

cancelReturn.addEventListener("click", () => {
  returnModal.style.display = "none";
  bookToReturn = null;
});

confirmReturn.addEventListener("click", async () => {
  if (!bookToReturn) return;
  try {
    const res = await fetch(`${API_URL}/${bookToReturn}/return`, { method: "PATCH" });
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

/* ===== Dark Mode ===== */
darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

/* ===== Filtering System UI ===== */
function addFilterControls() {
  const tableSection = document.querySelector(".table-section");
  const filterControls = document.createElement("div");
  filterControls.className = "filter-controls";
  filterControls.innerHTML = `
    <h3>Filter Books</h3>
    <div class="filter-inputs">
      <input type="text" id="filterTitle" placeholder="Filter by title" />
      <input type="text" id="filterAuthor" placeholder="Filter by author" />
      <select id="filterQuantity">
        <option value="">All quantities</option>
        <option value="0">Out of stock (0)</option>
        <option value="1">Low stock (1-5)</option>
        <option value="6">In stock (6+)</option>
      </select>
      <button id="clearFilters">Clear Filters</button>
    </div>
  `;

  const searchBox = document.getElementById("searchBox");
  tableSection.insertBefore(filterControls, searchBox.nextSibling);

  filterTitle = document.getElementById("filterTitle");
  filterAuthor = document.getElementById("filterAuthor");
  filterQuantity = document.getElementById("filterQuantity");
  clearFilters = document.getElementById("clearFilters");
}

function setupFilterEvents() {
  filterTitle.addEventListener("input", fetchBooks);
  filterAuthor.addEventListener("input", fetchBooks);
  filterQuantity.addEventListener("change", fetchBooks);
  clearFilters.addEventListener("click", () => {
    filterTitle.value = "";
    filterAuthor.value = "";
    filterQuantity.value = "";
    fetchBooks();
  });
}

/* ===== Initial Load ===== */
function initializeApp() {
  addFilterControls();
  setupFilterEvents();
  fetchBooks();
}

initializeApp();
