"use server";

import { redirect } from "next/navigation";
import { getProfile } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";
import { sendPasswordChangedEmail } from "@/lib/notifications/email";

export async function changePassword(formData: FormData) {
  const profile = await getProfile();
  const supabase = await createClient();
  const redirectTo = formData.get("redirect_to") as string;

  const currentPassword = formData.get("current_password") as string;
  const newPassword = formData.get("new_password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (newPassword.length < 8) {
    redirect(`${redirectTo}?error=${encodeURIComponent("New password must be at least 8 characters.")}`);
  }

  if (newPassword !== confirmPassword) {
    redirect(`${redirectTo}?error=${encodeURIComponent("New password and confirmation don't match.")}`);
  }

  // Re-verify identity with the current password before changing it --
  // an active session alone (e.g. an unlocked, unattended device)
  // shouldn't be enough to take over the account.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: currentPassword,
  });

  if (verifyError) {
    redirect(`${redirectTo}?error=${encodeURIComponent("Current password is incorrect.")}`);
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    redirect(`${redirectTo}?error=${encodeURIComponent(updateError.message)}`);
  }

  await sendPasswordChangedEmail({ email: profile.email, name: profile.full_name });

  redirect(`${redirectTo}?success=1`);
}
