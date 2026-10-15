import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Fetches the signed-in user's own profile row (id, email, full_name,
// role), redirecting to /login if there's no session. RLS restricts this
// query to the caller's own row regardless of who calls it.
export async function getProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, active")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.active) {
    // A deactivated account keeps a valid Supabase session otherwise --
    // sign it out here so "Deactivate" actually blocks access, not just
    // relabels a row on the Doctors page.
    await supabase.auth.signOut();
    redirect("/login?error=" + encodeURIComponent("This account has been deactivated."));
  }

  return profile;
}
