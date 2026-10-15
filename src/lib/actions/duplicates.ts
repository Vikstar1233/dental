"use server";

import { requireAdmin } from "@/lib/require-admin";
import { createClient } from "@/lib/supabase/server";

export type DuplicateMatch = {
  id: string;
  first_name: string;
  last_name: string;
  matched_on: "phone" | "email";
};

export async function findDuplicates(
  phone: string,
  email: string,
  excludePatientId?: string,
): Promise<DuplicateMatch[]> {
  await requireAdmin();
  const supabase = await createClient();

  const matches: DuplicateMatch[] = [];
  const trimmedPhone = phone.trim();
  const trimmedEmail = email.trim().toLowerCase();

  if (trimmedPhone) {
    let query = supabase
      .from("patients")
      .select("id, first_name, last_name")
      .eq("phone", trimmedPhone);
    if (excludePatientId) query = query.neq("id", excludePatientId);
    const { data } = await query;
    data?.forEach((p) => matches.push({ ...p, matched_on: "phone" }));
  }

  if (trimmedEmail) {
    let query = supabase
      .from("patients")
      .select("id, first_name, last_name")
      .eq("email", trimmedEmail);
    if (excludePatientId) query = query.neq("id", excludePatientId);
    const { data } = await query;
    data?.forEach((p) => {
      if (!matches.some((m) => m.id === p.id)) {
        matches.push({ ...p, matched_on: "email" });
      }
    });
  }

  return matches;
}
