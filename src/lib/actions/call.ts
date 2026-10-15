"use server";

import { getProfile } from "@/lib/get-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIntegration } from "@/lib/integrations/store";
import { getSecret, SECRET } from "@/lib/integrations/secrets";
import { dialViaAircall } from "@/lib/integrations/aircall";

// The doctor's browser only ever sends a patient id. Everything needed to
// actually place the call -- the patient's number, the Aircall
// credentials, the doctor's Aircall user id -- is looked up here, on the
// server, with the service-role client. None of it is returned to the
// caller; only success or a message.
export async function callPatient(
  patientId: string,
): Promise<{ ok: boolean; message: string }> {
  const profile = await getProfile();
  const admin = createAdminClient();

  const { data: patient } = await admin
    .from("patients")
    .select("phone, assigned_to")
    .eq("id", patientId)
    .single();

  if (!patient || patient.assigned_to !== profile.id) {
    // Same shape whether the patient doesn't exist or isn't theirs --
    // doesn't confirm which.
    return { ok: false, message: "Patient not found." };
  }

  if (!patient.phone) {
    return { ok: false, message: "This patient has no phone number on file." };
  }

  const { data: doctorProfile } = await admin
    .from("profiles")
    .select("aircall_user_id")
    .eq("id", profile.id)
    .single();

  if (!doctorProfile?.aircall_user_id) {
    return {
      ok: false,
      message: "Ask an admin to link your Aircall account first.",
    };
  }

  const integration = await getIntegration("aircall");
  const config = (integration?.config ?? {}) as {
    api_id?: string;
    number_id?: number;
  };

  let apiToken: string | null = null;
  try {
    apiToken = await getSecret(SECRET.aircallApiToken);
  } catch {
    apiToken = null;
  }

  if (integration?.status !== "connected" || !config.api_id || !config.number_id || !apiToken) {
    return { ok: false, message: "Aircall isn't connected yet." };
  }

  try {
    await dialViaAircall({
      apiId: config.api_id,
      apiToken,
      aircallUserId: doctorProfile.aircall_user_id,
      numberId: config.number_id,
      to: patient.phone,
    });
    return { ok: true, message: "Calling now -- pick up on your Aircall line." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Could not place the call.",
    };
  }
}
