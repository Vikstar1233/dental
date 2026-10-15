"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { setIntegration } from "@/lib/integrations/store";
import { sendEmailViaSmtp } from "@/lib/integrations/smtp";
import { deleteSecret, setSecret, SECRET } from "@/lib/integrations/secrets";

export async function connectEmail(formData: FormData) {
  await requireAdmin();

  const host = (formData.get("host") as string).trim();
  const port = Number(formData.get("port"));
  const secure = formData.get("secure") === "on";
  const username = (formData.get("username") as string).trim();
  const password = (formData.get("password") as string).trim();
  const fromName = (formData.get("from_name") as string).trim();
  const fromAddress = ((formData.get("from_address") as string).trim() || username);

  if (!host || !port || !username || !password) {
    redirect(
      `/admin/integrations?error=${encodeURIComponent("Fill in host, port, email address, and password.")}`,
    );
  }

  // Prove the credentials work before saving them -- a real test send to
  // the account's own address rather than trusting untested details.
  let failure: string | null = null;
  try {
    await sendEmailViaSmtp({
      host,
      port,
      secure,
      username,
      password,
      fromName: fromName || "Patient Portal",
      fromAddress,
      to: fromAddress,
      subject: "Test connection",
      text: "This confirms the patient portal can send email through this account.",
    });
  } catch (err) {
    failure = err instanceof Error ? err.message : "Could not send a test email.";
  }
  if (failure) {
    redirect(`/admin/integrations?error=${encodeURIComponent(`Connection failed: ${failure}`)}`);
  }

  try {
    await setSecret(SECRET.emailPassword, password);
  } catch (err) {
    redirect(
      `/admin/integrations?error=${encodeURIComponent(err instanceof Error ? err.message : "Could not store the password securely.")}`,
    );
  }

  await setIntegration("email", {
    status: "connected",
    config: { host, port, secure, username, from_name: fromName, from_address: fromAddress },
  });

  redirect("/admin/integrations?success=1");
}

export async function disconnectEmail() {
  await requireAdmin();
  await deleteSecret(SECRET.emailPassword);
  await setIntegration("email", { status: "not_connected", config: {} });
  redirect("/admin/integrations?success=1");
}
