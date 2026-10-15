"use server";

import { redirect } from "next/navigation";
import { getProfile } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";
import { sendPasswordChangedEmail } from "@/lib/notifications/email";

export async function setNewPassword(formData: FormData) {
  const profile = await getProfile();
  const supabase = await createClient();

  const newPassword = formData.get("new_password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (newPassword.length < 8) {
    redirect(`/reset-password?error=${encodeURIComponent("Password must be at least 8 characters.")}`);
  }

  if (newPassword !== confirmPassword) {
    redirect(`/reset-password?error=${encodeURIComponent("Passwords don't match.")}`);
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  await sendPasswordChangedEmail({ email: profile.email, name: profile.full_name });

  // Close the recovery session out cleanly rather than leaving them signed
  // in via a link that could have been forwarded or intercepted.
  await supabase.auth.signOut();
  redirect("/login?success=" + encodeURIComponent("Password updated. Sign in with your new password."));
}
