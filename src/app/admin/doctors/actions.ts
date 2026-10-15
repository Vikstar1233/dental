"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createUser(formData: FormData) {
  await requireAdmin();

  const email = (formData.get("email") as string).trim();
  const fullName = (formData.get("full_name") as string).trim();
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  if (role !== "admin" && role !== "doctor") {
    redirect(`/admin/doctors?error=${encodeURIComponent("Invalid role.")}`);
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    redirect(
      `/admin/doctors?error=${encodeURIComponent(
        error?.message ?? "Could not create user.",
      )}`,
    );
  }

  // The DB trigger creates the profile row with role='doctor' by default.
  if (role === "admin") {
    const { error: updateError } = await admin
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", data.user.id);

    if (updateError) {
      redirect(
        `/admin/doctors?error=${encodeURIComponent(updateError.message)}`,
      );
    }
  }

  redirect("/admin/doctors?success=1");
}

export async function deactivateUser(formData: FormData) {
  await requireAdmin();

  const userId = formData.get("user_id") as string;
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ active: false })
    .eq("id", userId);

  if (error) {
    redirect(`/admin/doctors?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/doctors?success=1");
}

export async function reactivateUser(formData: FormData) {
  await requireAdmin();

  const userId = formData.get("user_id") as string;
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ active: true })
    .eq("id", userId);

  if (error) {
    redirect(`/admin/doctors?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/doctors?success=1");
}

export async function updateAircallUserId(formData: FormData) {
  await requireAdmin();

  const userId = formData.get("user_id") as string;
  const aircallUserId = (formData.get("aircall_user_id") as string).trim() || null;
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ aircall_user_id: aircallUserId })
    .eq("id", userId);

  if (error) {
    redirect(`/admin/doctors?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/doctors?success=1");
}

export async function reassignPatients(formData: FormData) {
  await requireAdmin();

  const fromDoctorId = formData.get("from_doctor_id") as string;
  const toDoctorId = formData.get("to_doctor_id") as string;

  if (!toDoctorId || fromDoctorId === toDoctorId) {
    redirect(
      `/admin/doctors?error=${encodeURIComponent("Pick a different doctor to reassign to.")}`,
    );
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("patients")
    .update({ assigned_to: toDoctorId })
    .eq("assigned_to", fromDoctorId);

  if (error) {
    redirect(`/admin/doctors?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/doctors?success=1");
}
