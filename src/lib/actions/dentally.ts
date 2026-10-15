"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { createClient } from "@/lib/supabase/server";
import { getIntegration } from "@/lib/integrations/store";
import { getSecret, SECRET } from "@/lib/integrations/secrets";
import { searchDentallyPatients, createDentallyPatient } from "@/lib/integrations/dentally";

const REQUIRED_FOR_DENTALLY = [
  ["title", "Title"],
  ["date_of_birth", "Date of birth"],
  ["gender", "Gender"],
  ["ethnicity", "Ethnicity"],
  ["address_line_1", "Address"],
  ["postcode", "Postcode"],
] as const;

export async function sendToDentally(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const patientId = formData.get("patient_id") as string;
  const redirectTo = `/admin/patients/${patientId}`;

  const integration = await getIntegration("dentally");
  const config = (integration?.config ?? {}) as {
    default_payment_plan_id?: string;
  };

  let authHeader: string | null = null;
  try {
    authHeader = await getSecret(SECRET.dentallyAuthHeader);
  } catch {
    authHeader = null;
  }

  if (integration?.status !== "connected" || !authHeader) {
    redirect(
      `${redirectTo}?error=${encodeURIComponent("Dentally isn't connected yet -- set it up on the Integrations page.")}`,
    );
  }

  const { data: patient } = await supabase
    .from("patients")
    .select(
      "id, title, first_name, last_name, email, phone, date_of_birth, gender, ethnicity, address_line_1, postcode, dentally_patient_id",
    )
    .eq("id", patientId)
    .single();

  if (!patient) {
    redirect(`${redirectTo}?error=${encodeURIComponent("Patient not found.")}`);
  }

  if (patient.dentally_patient_id) {
    redirect(`${redirectTo}?error=${encodeURIComponent("Already linked to Dentally.")}`);
  }

  // Look for an existing Dentally patient first -- avoids creating a
  // duplicate there for someone who's already a patient of record.
  const query = patient.phone || patient.email;
  let existingMatch = null;
  if (query) {
    try {
      const found = await searchDentallyPatients(authHeader, query);
      existingMatch = found[0] ?? null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not reach Dentally.";
      redirect(`${redirectTo}?error=${encodeURIComponent(message)}`);
    }
  }

  if (existingMatch) {
    await supabase
      .from("patients")
      .update({ dentally_patient_id: existingMatch.id })
      .eq("id", patientId);
    revalidatePath(redirectTo);
    redirect(`${redirectTo}?success=1`);
  }

  const missing = REQUIRED_FOR_DENTALLY.filter(
    ([key]) => !patient[key as keyof typeof patient],
  );
  if (missing.length > 0) {
    redirect(
      `${redirectTo}?error=${encodeURIComponent(
        `Dentally needs these filled in first: ${missing.map(([, label]) => label).join(", ")}.`,
      )}`,
    );
  }

  if (!config.default_payment_plan_id) {
    redirect(
      `${redirectTo}?error=${encodeURIComponent("Set a default payment plan ID on the Integrations page first.")}`,
    );
  }

  let created;
  try {
    created = await createDentallyPatient(authHeader, {
      title: patient.title!,
      first_name: patient.first_name,
      last_name: patient.last_name,
      date_of_birth: patient.date_of_birth!,
      gender: patient.gender!,
      ethnicity: patient.ethnicity!,
      address_line_1: patient.address_line_1!,
      postcode: patient.postcode!,
      payment_plan_id: config.default_payment_plan_id,
      email_address: patient.email ?? undefined,
      mobile_phone: patient.phone ?? undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not reach Dentally.";
    redirect(`${redirectTo}?error=${encodeURIComponent(message)}`);
  }

  await supabase
    .from("patients")
    .update({ dentally_patient_id: created.id })
    .eq("id", patientId);

  revalidatePath(redirectTo);
  redirect(`${redirectTo}?success=1`);
}
