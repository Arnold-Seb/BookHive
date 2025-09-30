# BookHive

## 📚 BookHive Admin Panel

A full-stack web application for managing books with a modern, professional admin dashboard.  
Built with **Node.js, Express, MongoDB, HTML, CSS, and Vanilla JavaScript**.

---

## 🚀 Features

- **CRUD Operations**
  - Add, edit, delete, and view books.
  - Case-insensitive duplicate handling: if **title + author + genre** match, the **quantity increases** instead of creating a new item.
- **PDF Support**
  - Upload and view PDFs (stored as base64). New books with a PDF are auto-set to **online**.
- **Borrow & Return**
  - Prevents duplicate active loans per user/book.
  - Quantity decrements on borrow and increments on return.
- **Dashboard Overview**
  - KPIs: Total, Available, Borrowed (live), Online, Offline.
- **Search & Filters**
  - Search by title/author/genre; filter by **Status** and **Availability**.
- **Loan History & Active Loans**
  - Per-user history; admin can view active loans for a given book.
- **Dark / Light Mode**
  - One-click theme toggle with smooth transitions.
- **Responsive & Modern UI**
  - Clean glassmorphism design, gradients, and subtle animations.
- **Notifications**
  - Animated success/error toasts for actions.

---

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT cookie; role-based access (`admin`, `user`)
- **Uploads:** Multer (memory storage) for PDFs
- **Views:** EJS for login/search pages

---

## ⚙️ Installation

### 1) Clone the repository
```bash
git clone https://github.com/<your-username>/BookHive.git
cd BookHive
```
### 2) Install dependencies
```bash
npm install
```

### 3) Create .env in the project root
# Database
MONGODB_URI=mongodb://localhost:27017/bookhive
MONGODB_URI_TEST=mongodb://localhost:27017/bookhive_test

# App
- PORT=3000
- JWT_SECRET=your-very-strong-secret

# Admin login (email list is comma-separated)
- ADMIN_EMAILS=admin@example.com
- ADMIN_PASSWORD=supersecret

### 4) Start the server
```bash
npm start
```
Open: http://localhost:3000

### 🔐 Authentication & Roles
- Log in at /auth/login.
- Users listed in ADMIN_EMAILS (with ADMIN_PASSWORD) receive the admin role.
- Admin routes: /admin, /auth/users, GET /api/books/:id/activeLoans.
- User routes: /search, borrow/return endpoints, loan history, stats.

### 🧭 Admin Panel Guide
- Open: ` /admin ` (requires admin login).
- Add Book: set Title, Author, Genre, Quantity, optional PDF and Status.
- If a PDF is included on create, status is auto-set to online.
- If another book has the same title+author+genre (any casing), its quantity increases and optional PDF/status update is applied.
- Edit Book: if the new identity matches another book, the records merge (quantities add) and the edited document is removed.
- Delete Book: removes the book.
- Borrow / Return: admins can perform these actions (e.g., on behalf of users).
- View PDF: click “📄 View PDF” to open the embedded viewer.
- Search & Filters: quickly narrow by text, Status (all/online/offline), and Availability.

### 📚 Loan History
- User history: ` GET /api/books/history ` returns loans for the authenticated user (most recent first).
- Active loans for a book (admin): ` GET /api/books/:id/activeLoans ` lists current borrowers.
- Borrowed count:
- ` GET /api/books/stats/borrowed `
  - Admins see global count.
  - Regular users see their active-borrow count.
 
🔌 API Summary
| Method | Path               | Auth        | Notes                                                                                                        |
| -----: | ------------------ | ----------- | ------------------------------------------------------------------------------------------------------------ |
|    GET | `/`                | Public      | List all books.                                                                                              |
|   POST | `/`                | Admin (JWT) | Create (JSON or `multipart/form-data` with `pdfFile`). Case-insensitive duplicate → **quantity increments**. |
|    PUT | `/:id`             | Admin (JWT) | Update. If identity clashes with another book → **merge** quantities and delete the edited doc.              |
| DELETE | `/:id`             | Admin (JWT) | Delete a book.                                                                                               |
|    GET | `/:id/pdf`         | Public      | Returns PDF bytes if present; `404` if missing.                                                              |
|  PATCH | `/:id/borrow`      | Auth (JWT)  | Borrow a book (uses `req.user.id`). Prevents duplicate active loans.                                         |
|  PATCH | `/:id/return`      | Auth (JWT)  | Return a book (requires active loan).                                                                        |
|    GET | `/history`         | Auth (JWT)  | Loan history for the logged-in user.                                                                         |
|    GET | `/stats/borrowed`  | Auth (JWT)  | Borrowed count (global for admin, per-user otherwise).                                                       |
|    GET | `/:id/activeLoans` | Admin (JWT) | List active loans for a book.                                                                                |
------------------------------------------------------------------------------------------------------------------------------------------------------------

### Other:
- POST /auth/login, POST /auth/logout, GET /auth/users (admin-only)
- GET /search (requires login)
- GET /admin (admin dashboard)

### 🧪 Tests
We use Jest + Supertest.
### Run
```bash
npm test
```

### Coverage
- Books CRUD (JSON + multipart/PDF)
- Case-insensitive duplicate merge on create
- Merge on update (edit into existing identity)
- PDF fetch + 404 when absent
- Borrow/Return success/fail (qty 0, duplicate active loan, no active loan)
- Loan history & stats (user vs admin/global)
- Active loans (admin)
- Access control for `/search`, `/admin`, `/auth/users`

Notes:
 - Tests log in via Supertest and normalize cookies into a single Cookie header.
 - Borrow/return tests do not send borrowerId — the server uses req.user.id.
 - Ensure src/tests/sample.pdf exists for the PDF test.

### 🗂️ Project Structure (high level)
```
src/
├── app.js
├── controllers/
│ └── bookController.js
├── routes/
│ ├── bookRoutes.js
│ ├── auth.js
│ └── borrow.js
├── models/
│ ├── Book.js
│ ├── Loan.js
│ └── User.js
├── public/
│ ├── admin.html
│ ├── css/
│ │ ├── admin.css
│ │ └── style.css
│ └── js/
│ ├── admin.js
│ ├── main.js
│ └── search.js
├── views/
│ ├── login.ejs
│ ├── signup.ejs
│ └── search.ejs
└── tests/
├── bookRoutes.test.js
└── sample.pdf
```

### 🧰 Troubleshooting
- 403 / Forbidden: log in as an email listed in ADMIN_EMAILS using ADMIN_PASSWORD.
- PDF tests fail: ensure src/tests/sample.pdf exists and is a valid PDF.
- Jest hangs: confirm Mongoose is closed in afterAll and that MONGODB_URI_TEST is reachable.
