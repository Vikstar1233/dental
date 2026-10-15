import "server-only";
import { getEmailConfig } from "@/lib/integrations/email-config";
import { sendEmailViaSmtp } from "@/lib/integrations/smtp";

// Staff notifications go out through the same mailbox connected on the
// Integrations page -- no separate email service or API key. Silently does
// nothing until a mailbox is connected, and a failed notification never
// blocks the action that triggered it.
async function sendNotification(to: string, subject: string, text: string) {
  try {
    const config = await getEmailConfig();
    if (!config) return;
    await sendEmailViaSmtp({ ...config, to, subject, text });
  } catch (err) {
    console.error("Notification email failed", err);
  }
}

export async function sendAssignmentEmail({
  doctorEmail,
  doctorName,
  patientFirstName,
  patientId,
}: {
  doctorEmail: string;
  doctorName: string;
  patientFirstName: string;
  patientId: string;
}) {
  const patientUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/doctor/patients/${patientId}`;
  await sendNotification(
    doctorEmail,
    `New patient assigned: ${patientFirstName}`,
    `Hi ${doctorName || "there"},\n\n${patientFirstName} has been assigned to you.\n\nOpen their record: ${patientUrl}`,
  );
}

export async function sendPasswordChangedEmail({
  email,
  name,
}: {
  email: string;
  name: string;
}) {
  await sendNotification(
    email,
    "Your password was changed",
    `Hi ${name || "there"},\n\nYour password for the patient portal was just changed. If this was you, no action is needed.\n\nIf you didn't make this change, contact your admin right away.`,
  );
}
