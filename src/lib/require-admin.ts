import "server-only";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/get-profile";

// Verifies the signed-in user's role from the database (not just the
// session) and redirects non-admins. Call this at the top of any
// admin-only Server Component or Server Action.
export async function requireAdmin() {
  const profile = await getProfile();

  if (profile.role !== "admin") {
    redirect("/doctor");
  }

  return profile;
}
