import cron from "node-cron";
import Borrow from "../models/Borrow.js";
import { sendEmail } from "../utils/email.js";

const checkBorrowDue = async () => {
  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const borrows = await Borrow.find({ returned: false }).populate("student");

    for (const borrow of borrows) {
      if (!borrow.student?.email) continue;

      const due = new Date(borrow.dueDate);

      // Overdue
      if (due < now && !borrow.overdueNotified) {
        await sendEmail(
          borrow.student.email,
          `Book "${borrow.bookTitle}" is overdue!`,
          `Hi ${borrow.studentName},\n\nYour borrowed book "${borrow.bookTitle}" was due on ${due.toLocaleString()}.\nPlease return it as soon as possible.`
        );
        borrow.overdueNotified = true;
        await borrow.save();
      }

      // Due Soon (within 24 hours)
      else if (due > now && due <= in24Hours && !borrow.dueSoonNotified) {
        await sendEmail(
          borrow.student.email,
          `Reminder: Book "${borrow.bookTitle}" is due soon`,
          `Hi ${borrow.studentName},\n\nYour borrowed book "${borrow.bookTitle}" is due on ${due.toLocaleString()}.\nPlease make sure to return it on time.`
        );
        borrow.dueSoonNotified = true;
        await borrow.save();
      }
    }
  } catch (err) {
    console.error("Error in borrow reminder cron:", err);
  }
};

// Run every 30 seconds (development/testing)
cron.schedule("*/30 * * * * *", () => {
  console.log("Checking borrowed books for due reminders...");
  checkBorrowDue();
});
