import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// False until supabase/010_campaigns.sql has been run.
export async function campaignsReady(): Promise<boolean> {
  const admin = createAdminClient();
  const [{ error: tableError }, { error: columnError }] = await Promise.all([
    admin.from("campaigns").select("id").limit(1),
    admin.from("patients").select("marketing_opt_out").limit(1),
  ]);
  return !tableError && !columnError;
}

export const STOP_REASON_LABEL: Record<string, string> = {
  replied: "Replied",
  opted_out: "Opted out",
  booked: "Booked in",
  left_audience: "Stage changed",
  team_contacted: "Team got in touch",
  manual: "Removed",
};
