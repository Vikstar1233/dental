"use server";

import { requireAdmin } from "@/lib/require-admin";
import { createClient } from "@/lib/supabase/server";
import { SOURCES } from "@/lib/stages";

export type ImportRow = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  instagram_id: string;
  source: string;
  preferred_channel: string;
  tags: string;
};

export type ImportResult = {
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
};

function isValidPhone(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  return digits.length >= 7;
}

export async function importPatients(
  rows: ImportRow[],
  filename: string,
  duplicateStrategy: "skip" | "update",
): Promise<ImportResult> {
  await requireAdmin();
  const supabase = await createClient();

  const result: ImportResult = { added: 0, updated: 0, skipped: 0, errors: [] };
  const seenEmails = new Set<string>();

  for (const [index, row] of rows.entries()) {
    const rowLabel = `Row ${index + 2}`; // +2: header row + 1-index

    if (!row.first_name?.trim()) {
      result.skipped += 1;
      result.errors.push(`${rowLabel}: missing first name -- skipped.`);
      continue;
    }

    if (row.phone && !isValidPhone(row.phone)) {
      result.skipped += 1;
      result.errors.push(`${rowLabel}: "${row.phone}" doesn't look like a phone number -- skipped.`);
      continue;
    }

    const email = row.email?.trim().toLowerCase() || null;
    if (email) {
      if (seenEmails.has(email)) {
        result.skipped += 1;
        result.errors.push(`${rowLabel}: duplicate email within this file -- skipped.`);
        continue;
      }
      seenEmails.add(email);
    }

    const source = SOURCES.includes(row.source as (typeof SOURCES)[number])
      ? row.source
      : "manual";

    const payload = {
      first_name: row.first_name.trim(),
      last_name: row.last_name?.trim() || "",
      phone: row.phone?.trim() || null,
      email,
      instagram_id: row.instagram_id?.trim() || null,
      preferred_channel: row.preferred_channel?.trim() || null,
      source,
      tags: row.tags
        ? row.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
    };

    let existingId: string | null = null;
    if (email) {
      const { data: existing } = await supabase
        .from("patients")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      existingId = existing?.id ?? null;
    }

    if (existingId) {
      if (duplicateStrategy === "skip") {
        result.skipped += 1;
        continue;
      }
      const { error } = await supabase
        .from("patients")
        .update(payload)
        .eq("id", existingId);
      if (error) {
        result.errors.push(`${rowLabel}: ${error.message}`);
        result.skipped += 1;
      } else {
        result.updated += 1;
      }
      continue;
    }

    const { error } = await supabase.from("patients").insert(payload);
    if (error) {
      result.errors.push(`${rowLabel}: ${error.message}`);
      result.skipped += 1;
    } else {
      result.added += 1;
    }
  }

  const { data: auth } = await supabase.auth.getUser();
  await supabase.from("imports").insert({
    filename,
    uploaded_by: auth.user?.id,
    rows_added: result.added,
    rows_updated: result.updated,
    rows_skipped: result.skipped,
  });

  return result;
}
