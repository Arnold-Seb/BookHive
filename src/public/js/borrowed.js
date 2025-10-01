// -------------------- TOAST NOTIFICATION --------------------
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "show";

  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, 4000);
}

// -------------------- COUNTDOWN TIMER --------------------
function startCountdown(dueDate, countdownCell, statusCell) {
  function update() {
    const now = new Date().getTime();
    const distance = dueDate - now;

    if (distance <= 0) {
      countdownCell.textContent = "Expired";
      statusCell.textContent = "Overdue";
      statusCell.className = "status-overdue";
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    countdownCell.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    if (days < 1) {
      statusCell.textContent = "Due Soon";
      statusCell.className = "status-soon";
    } else {
      statusCell.textContent = "On Time";
      statusCell.className = "status-ontime";
    }
  }

  update();
  setInterval(update, 1000);
}

// -------------------- MAIN LOGIC --------------------
document.addEventListener("DOMContentLoaded", async () => {
  const tableBody = document.querySelector("#borrowedTable tbody");

  try {
    const res = await fetch("/api/borrow/my");
    const borrowedBooks = await res.json();

    if (!borrowedBooks.length) {
      tableBody.innerHTML = `<tr><td colspan="6">No borrowed books yet.</td></tr>`;
      return;
    }

    // Render table rows
    borrowedBooks.forEach(borrow => {
      const row = document.createElement("tr");

      const countdownCell = document.createElement("td");
      const statusCell = document.createElement("td");

      row.innerHTML = `
        <td>${borrow.bookTitle}</td>
        <td>${borrow.quantity}</td>
        <td>${new Date(borrow.borrowedAt).toLocaleDateString()}</td>
        <td>${new Date(borrow.dueDate).toLocaleDateString()}</td>
      `;

      row.appendChild(countdownCell);
      row.appendChild(statusCell);
      tableBody.appendChild(row);

      // Start live countdown
      startCountdown(new Date(borrow.dueDate).getTime(), countdownCell, statusCell);

      // 🔔 Show reminders when page loads
      if (borrow.overdue) {
        showToast(`⚠️ Overdue: "${borrow.bookTitle}" was due on ${new Date(borrow.dueDate).toLocaleDateString()}`);
      } else if (borrow.dueSoon) {
        showToast(`⏰ Reminder: "${borrow.bookTitle}" is due on ${new Date(borrow.dueDate).toLocaleDateString()}`);
      }
    });

  } catch (err) {
    console.error("Error fetching borrowed books:", err);
    tableBody.innerHTML = `<tr><td colspan="6">⚠️ Failed to load borrowed books.</td></tr>`;
  }
});
