"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";

export async function postTeamMessage(formData: FormData) {
  const profile = await getProfile();
  const supabase = await createClient();

  const body = (formData.get("body") as string).trim();
  const redirectTo = formData.get("redirect_to") as string;

  if (body) {
    await supabase.from("staff_messages").insert({
      author_id: profile.id,
      body,
    });
  }

  revalidatePath(redirectTo);
  redirect(redirectTo);
}
