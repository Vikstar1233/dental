"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { createClient } from "@/lib/supabase/server";

function slugify(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function addFieldDefinition(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const label = (formData.get("label") as string).trim();
  const key = slugify(label);

  if (!key) {
    redirect(`/admin/patients?error=${encodeURIComponent("Field name can't be empty.")}`);
  }

  const { error } = await supabase
    .from("patient_field_definitions")
    .insert({ label, key });

  if (error) {
    redirect(`/admin/patients?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/patients");
  redirect("/admin/patients?success=1");
}

export async function deleteFieldDefinition(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const { error } = await supabase
    .from("patient_field_definitions")
    .delete()
    .eq("id", id);

  if (error) {
    redirect(`/admin/patients?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/patients");
  redirect("/admin/patients?success=1");
}
