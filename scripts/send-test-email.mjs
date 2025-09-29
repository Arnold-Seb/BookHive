import 'dotenv/config';
import { sendBorrowEmail } from '../src/utils/mailer.js';

const due = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

await sendBorrowEmail({
  to: 'you@inbox.mailtrap.io',     // any email; Mailtrap catches it
  userName: 'Test User',
  bookTitle: 'Demo Book',
  bookAuthor: 'Anon',
  dueDate: due,
});

console.log('Mail queued ✔');
process.exit(0);
