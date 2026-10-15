import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Uses the Supabase SECRET key, which bypasses row-level security entirely.
// Only ever import this from Server Actions/Route Handlers that have
// already verified the caller is an admin. The `server-only` import above
// makes it a build error to accidentally import this into client code.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
