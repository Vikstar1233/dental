import "server-only";
import nodemailer from "nodemailer";

// Sends patient-facing emails through a real mailbox the clinic connects
// (Gmail, Outlook, or any provider) via standard SMTP -- deliberately not
// tied to a single provider's API, since a small clinic is more likely to
// already have a Gmail/Outlook account than a transactional-email-service
// account. Most providers require an "app password" rather than the
// account's normal login password when connecting a third-party client
// like this.
export async function sendEmailViaSmtp({
  host,
  port,
  secure,
  username,
  password,
  fromName,
  fromAddress,
  to,
  subject,
  text,
}: {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromAddress: string;
  to: string;
  subject: string;
  text: string;
}) {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: username, pass: password },
  });

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    text,
  });
}
