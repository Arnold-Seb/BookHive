// src/utils/mailer.js
let transporter = null;

function hasSmtpConfig() {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

async function buildTransporter() {
  const { default: nodemailer } = await import("nodemailer");

  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;

  console.log(
    `[MAIL] Building transporter host=${process.env.SMTP_HOST} port=${port} secure=${secure}`
  );

  const tx = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure, // false for STARTTLS (Mailtrap on 2525/587), true for 465
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  try {
    await tx.verify();
    console.log("[MAIL] Transporter verified ✅");
  } catch (e) {
    console.warn("[MAIL] Transporter verify failed:", e?.message || e);
  }

  return tx;
}

export async function getTransporter() {
  if (!hasSmtpConfig()) {
    console.log("[MAIL] SMTP not configured — skipping email send.");
    return null;
  }
  if (transporter) return transporter;
  transporter = await buildTransporter();
  return transporter;
}

export async function sendBorrowEmail({ to, userName, bookTitle, bookAuthor, dueDate }) {
  if (!to) { console.warn("[MAIL] No recipient email — skipping."); return; }
  if (process.env.NODE_ENV === "test") {
    console.log(`[MAIL:TEST] Would email ${to}: "${bookTitle}" due ${dueDate.toLocaleDateString()}`);
    return;
  }

  const tx = await getTransporter();
  if (!tx) return;

  const from = process.env.SMTP_FROM || "no-reply@bookhive.local";
  const subject = `You borrowed “${bookTitle}” — due ${dueDate.toLocaleDateString()}`;
  const text = [
    `Hi ${userName || "there"},`,
    ``,
    `You’ve borrowed:`,
    `• Title: ${bookTitle}`,
    bookAuthor ? `• Author: ${bookAuthor}` : null,
    ``,
    `Due date: ${dueDate.toLocaleDateString()} (in 14 days).`,
    ``,
    `Please return or renew by the due date.`,
    ``,
    `— BookHive`,
  ].filter(Boolean).join("\n");

  const html = `
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.5;color:#111">
      <p>Hi ${userName || "there"},</p>
      <p>You’ve borrowed:</p>
      <ul>
        <li><strong>Title:</strong> ${bookTitle}</li>
        ${bookAuthor ? `<li><strong>Author:</strong> ${bookAuthor}</li>` : ""}
      </ul>
      <p><strong>Due date:</strong> ${dueDate.toLocaleDateString()} (in 14 days).</p>
      <p>Please return or renew by the due date.</p>
      <p>— <strong>BookHive</strong></p>
    </div>
  `;
  console.log(`[MAIL] Sending borrow email → to=${to} subject="${subject}"`);
  const info = await tx.sendMail({ from, to, subject, text, html });
  console.log("[MAIL] Sent ✔ messageId:", info?.messageId);
}

export async function sendReminderEmail({ to, userName, bookTitle, bookAuthor, dueDate }) {
  if (!to) { console.warn("[MAIL] No recipient email — skipping."); return; }
  if (process.env.NODE_ENV === "test") {
    console.log(`[MAIL:TEST] Reminder to ${to}: "${bookTitle}" due ${dueDate.toLocaleDateString()}`);
    return;
  }

  const tx = await getTransporter();
  if (!tx) return;

  const from = process.env.SMTP_FROM || "no-reply@bookhive.local";
  const subject = `Reminder: “${bookTitle}” is due on ${dueDate.toLocaleDateString()}`;
  const text = [
    `Hi ${userName || "there"},`,
    ``,
    `This is a friendly reminder that your borrowed book is due soon:`,
    `• Title: ${bookTitle}`,
    bookAuthor ? `• Author: ${bookAuthor}` : null,
    ``,
    `Due date: ${dueDate.toLocaleDateString()} (in ~2 days).`,
    ``,
    `Please return or renew by the due date.`,
    ``,
    `— BookHive`,
  ].filter(Boolean).join("\n");

  const html = `
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.5;color:#111">
      <p>Hi ${userName || "there"},</p>
      <p>This is a friendly reminder that your borrowed book is due soon:</p>
      <ul>
        <li><strong>Title:</strong> ${bookTitle}</li>
        ${bookAuthor ? `<li><strong>Author:</strong> ${bookAuthor}</li>` : ""}
      </ul>
      <p><strong>Due date:</strong> ${dueDate.toLocaleDateString()} (in ~2 days).</p>
      <p>Please return or renew by the due date.</p>
      <p>— <strong>BookHive</strong></p>
    </div>
  `;
  console.log(`[MAIL] Sending reminder email → to=${to} subject="${subject}"`);
  const info = await tx.sendMail({ from, to, subject, text, html });
  console.log("[MAIL] Sent ✔ messageId:", info?.messageId);
}
