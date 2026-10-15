"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { getProfile } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";
import { sendAssignmentEmail } from "@/lib/notifications/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchMessage } from "@/lib/integrations/dispatch";

function fail(redirectTo: string, message: string): never {
  redirect(`${redirectTo}?error=${encodeURIComponent(message)}`);
}

async function notifyAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  doctorId: string,
  patientFirstName: string,
  patientId: string,
) {
  const { data: doctor } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", doctorId)
    .single();

  if (doctor) {
    await sendAssignmentEmail({
      doctorEmail: doctor.email,
      doctorName: doctor.full_name,
      patientFirstName,
      patientId,
    });
  }
}

export async function createPatient(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const first_name = (formData.get("first_name") as string).trim();
  const last_name = (formData.get("last_name") as string).trim();
  const phone = (formData.get("phone") as string).trim() || null;
  const email = (formData.get("email") as string).trim() || null;
  const instagram_id = (formData.get("instagram_id") as string).trim() || null;
  const preferred_channel = (formData.get("preferred_channel") as string) || null;
  const source = formData.get("source") as string;
  const assigned_to = (formData.get("assigned_to") as string) || null;
  const initial_note = (formData.get("initial_note") as string).trim();

  const { data: patient, error } = await supabase
    .from("patients")
    .insert({
      first_name,
      last_name,
      phone,
      email,
      instagram_id,
      preferred_channel,
      source,
      assigned_to,
    })
    .select("id")
    .single();

  if (error || !patient) {
    fail("/admin/patients/new", error?.message ?? "Could not create patient.");
  }

  if (initial_note) {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("notes").insert({
      patient_id: patient.id,
      author_id: auth.user?.id,
      body: initial_note,
    });
  }

  if (assigned_to) {
    await notifyAssignment(supabase, assigned_to, first_name, patient.id);
  }

  revalidatePath("/admin/patients");
  redirect(`/admin/patients/${patient.id}`);
}

export async function assignPatient(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const patientId = formData.get("patient_id") as string;
  const doctorId = (formData.get("doctor_id") as string) || null;

  const { data: patient, error } = await supabase
    .from("patients")
    .update({ assigned_to: doctorId })
    .eq("id", patientId)
    .select("first_name")
    .single();

  if (error) {
    fail("/admin/patients", error.message);
  }

  if (doctorId && patient) {
    await notifyAssignment(supabase, doctorId, patient.first_name, patientId);
  }

  revalidatePath("/admin/patients");
  revalidatePath("/admin/pipeline");
  redirect("/admin/patients");
}

export async function updateContact(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const patientId = formData.get("patient_id") as string;
  const first_name = (formData.get("first_name") as string).trim();
  const last_name = (formData.get("last_name") as string).trim();
  const phone = (formData.get("phone") as string).trim() || null;
  const email = (formData.get("email") as string).trim() || null;
  const instagram_id = (formData.get("instagram_id") as string).trim() || null;
  const preferred_channel = (formData.get("preferred_channel") as string) || null;

  const { error } = await supabase
    .from("patients")
    .update({ first_name, last_name, phone, email, instagram_id, preferred_channel })
    .eq("id", patientId);

  const redirectTo = `/admin/patients/${patientId}`;
  if (error) {
    fail(redirectTo, error.message);
  }

  revalidatePath(redirectTo);
  redirect(redirectTo);
}

export async function updateDentallyDetails(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const patientId = formData.get("patient_id") as string;
  const title = (formData.get("title") as string).trim() || null;
  const date_of_birth = (formData.get("date_of_birth") as string) || null;
  const gender = (formData.get("gender") as string).trim() || null;
  const ethnicity = (formData.get("ethnicity") as string).trim() || null;
  const address_line_1 = (formData.get("address_line_1") as string).trim() || null;
  const postcode = (formData.get("postcode") as string).trim() || null;

  const { error } = await supabase
    .from("patients")
    .update({ title, date_of_birth, gender, ethnicity, address_line_1, postcode })
    .eq("id", patientId);

  const redirectTo = `/admin/patients/${patientId}`;
  if (error) {
    fail(redirectTo, error.message);
  }

  revalidatePath(redirectTo);
  redirect(redirectTo);
}

export async function updateTags(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const patientId = formData.get("patient_id") as string;
  const raw = (formData.get("tags") as string) ?? "";
  const tags = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const { error } = await supabase
    .from("patients")
    .update({ tags })
    .eq("id", patientId);

  const redirectTo = `/admin/patients/${patientId}`;
  if (error) {
    fail(redirectTo, error.message);
  }

  revalidatePath(redirectTo);
  redirect(redirectTo);
}

export async function updateCustomFields(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const patientId = formData.get("patient_id") as string;
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("field_")) {
      values[key.slice("field_".length)] = String(value);
    }
  }

  const { error } = await supabase
    .from("patients")
    .update({ custom_fields: values })
    .eq("id", patientId);

  const redirectTo = `/admin/patients/${patientId}`;
  if (error) {
    fail(redirectTo, error.message);
  }

  revalidatePath(redirectTo);
  redirect(redirectTo);
}

export async function updateStage(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const patientId = formData.get("patient_id") as string;
  const stage = formData.get("stage") as string;

  const { error } = await supabase
    .from("patients")
    .update({ stage, stage_changed_at: new Date().toISOString() })
    .eq("id", patientId);

  const redirectTo = `/admin/patients/${patientId}`;
  if (error) {
    fail(redirectTo, error.message);
  }

  revalidatePath(redirectTo);
  revalidatePath("/admin/pipeline");
  redirect(redirectTo);
}

// Called directly from the pipeline board's drag-and-drop handler (a
// Client Component), not bound to a <form> -- no redirect, just persists
// and lets the board re-render.
export async function updateStageOnBoard(patientId: string, stage: string) {
  await requireAdmin();
  const supabase = await createClient();

  await supabase
    .from("patients")
    .update({ stage, stage_changed_at: new Date().toISOString() })
    .eq("id", patientId);

  revalidatePath("/admin/pipeline");
}

export async function addNote(formData: FormData) {
  const profile = await getProfile();
  const supabase = await createClient();

  const patientId = formData.get("patient_id") as string;
  const body = (formData.get("body") as string).trim();
  const redirectTo = formData.get("redirect_to") as string;

  const { error } = await supabase.from("notes").insert({
    patient_id: patientId,
    author_id: profile.id,
    body,
  });

  if (error) {
    fail(redirectTo, error.message);
  }

  revalidatePath(redirectTo);
  redirect(redirectTo);
}

export async function uploadPhoto(formData: FormData) {
  const profile = await getProfile();
  const supabase = await createClient();

  const patientId = formData.get("patient_id") as string;
  const caption = (formData.get("caption") as string).trim();
  const file = formData.get("file") as File;
  const redirectTo = formData.get("redirect_to") as string;

  if (!file || file.size === 0) {
    fail(redirectTo, "Choose a photo to upload.");
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${patientId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("patient-photos")
    .upload(path, file);

  if (uploadError) {
    fail(redirectTo, uploadError.message);
  }

  const { error: insertError } = await supabase.from("photos").insert({
    patient_id: patientId,
    storage_path: path,
    caption,
    uploaded_by: profile.id,
  });

  if (insertError) {
    fail(redirectTo, insertError.message);
  }

  revalidatePath(redirectTo);
  redirect(redirectTo);
}

export async function sendMessage(formData: FormData) {
  const profile = await getProfile();
  const supabase = await createClient();

  const patientId = formData.get("patient_id") as string;
  const channel = formData.get("channel") as string;
  const body = (formData.get("body") as string).trim();
  const redirectTo = formData.get("redirect_to") as string;

  // Email, WhatsApp and Instagram are delivered for real; SMS and call
  // notes are just logged. The doctor's browser never receives the
  // patient's contact details: the lookup and the send both happen on the
  // server, which is exactly what the core rule requires.
  const result = await dispatchMessage(patientId, channel, body);

  const { error } = await supabase.from("messages").insert({
    patient_id: patientId,
    sent_by: profile.id,
    channel,
    body,
    direction: "outbound",
    status: result.status,
    external_id: result.externalId,
  });

  if (error) {
    fail(redirectTo, error.message);
  }

  if (result.failure) {
    fail(redirectTo, `Not delivered: ${result.failure}`);
  }

  // Doctors have no write access to patients, so this uses the server-side
  // client -- and only ever touches the one timestamp.
  await createAdminClient()
    .from("patients")
    .update({ last_contact_at: new Date().toISOString() })
    .eq("id", patientId);

  revalidatePath(redirectTo);
  redirect(redirectTo);
}
