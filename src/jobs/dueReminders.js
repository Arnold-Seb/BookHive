// src/jobs/dueReminders.js
import cron from "node-cron";
import Loan from "../models/Loan.js";
import User from "../models/User.js";
import Book from "../models/Book.js";
import { sendReminderEmail } from "../utils/mailer.js";

const DUE_DAYS = 14;

function calcDue(borrowDate) {
  return new Date(new Date(borrowDate).getTime() + DUE_DAYS * 24 * 60 * 60 * 1000);
}

export default function startDueReminderJob() {
  // Runs every day at 09:00 server time
  cron.schedule("0 9 * * *", async () => {
    try {
      const now = new Date();

      // Loans whose due date is 2 days from now => borrowDate ≈ now - 12 days
      const start = new Date(now);
      start.setDate(start.getDate() - (DUE_DAYS - 2));
      start.setHours(0, 0, 0, 0);

      const end = new Date(now);
      end.setDate(end.getDate() - (DUE_DAYS - 2));
      end.setHours(23, 59, 59, 999);

      const loans = await Loan.find({
        returnDate: null,
        borrowDate: { $gte: start, $lte: end },
      })
        .populate("userId", "name email")
        .populate("bookId", "title author")
        .lean();

      for (const loan of loans) {
        const due = calcDue(loan.borrowDate);
        const to = loan.userId?.email;
        if (!to) continue;

        await sendReminderEmail({
          to,
          userName: loan.userId?.name || to,
          bookTitle: loan.bookId?.title || "Book",
          bookAuthor: loan.bookId?.author,
          dueDate: due,
        });
      }
      console.log(`[REMINDER] Processed ${loans.length} loans for reminders`);
    } catch (err) {
      console.warn("[REMINDER] Job failed:", err?.message || err);
    }
  });
}
