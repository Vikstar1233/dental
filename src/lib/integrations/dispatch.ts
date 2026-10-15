import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIntegration } from "@/lib/integrations/store";
import { getSecret, SECRET } from "@/lib/integrations/secrets";
import { getEmailConfig } from "@/lib/integrations/email-config";
import { sendEmailViaSmtp } from "@/lib/integrations/smtp";
import { sendWhatsAppText } from "@/lib/integrations/whatsapp";
import { sendInstagramText } from "@/lib/integrations/instagram";

export type DispatchResult = {
  status: "sent" | "failed";
  externalId: string | null;
  failure: string | null;
};

function failed(failure: string): DispatchResult {
  return { status: "failed", externalId: null, failure };
}

// Delivers an outbound message on the channel it was written for. The
// patient's real contact details are looked up here, on the server, with the
// service-role client -- the doctor's browser only ever sent a patient id.
// SMS and call notes aren't dispatched anywhere; they're just logged.
export async function dispatchMessage(
  patientId: string,
  channel: string,
  body: string,
  options: { subject?: string } = {},
): Promise<DispatchResult> {
  if (channel !== "email" && channel !== "whatsapp" && channel !== "instagram") {
    return { status: "sent", externalId: null, failure: null };
  }

  const { data: patient } = await createAdminClient()
    .from("patients")
    .select("email, phone, instagram_scoped_id")
    .eq("id", patientId)
    .single();

  if (!patient) return failed("Patient not found.");

  try {
    if (channel === "email") {
      const config = await getEmailConfig();
      if (!config) return failed("Email isn't connected -- connect a mailbox on the Integrations page.");
      if (!patient.email) return failed("This patient has no email address on file.");

      await sendEmailViaSmtp({
        ...config,
        to: patient.email,
        subject: options.subject || "Message from your dental practice",
        text: body,
      });
      return { status: "sent", externalId: null, failure: null };
    }

    if (channel === "whatsapp") {
      const integration = await getIntegration("whatsapp");
      const token = await getSecret(SECRET.whatsappAccessToken);
      const phoneNumberId = (integration?.config as { phone_number_id?: string } | undefined)
        ?.phone_number_id;

      if (integration?.status !== "connected" || !token || !phoneNumberId) {
        return failed("WhatsApp isn't connected -- connect it on the Integrations page.");
      }
      if (!patient.phone) return failed("This patient has no phone number on file.");

      const wamid = await sendWhatsAppText({ phoneNumberId, token, to: patient.phone, body });
      return { status: "sent", externalId: wamid || null, failure: null };
    }

    // instagram
    const integration = await getIntegration("instagram");
    const token = await getSecret(SECRET.instagramAccessToken);

    if (integration?.status !== "connected" || !token) {
      return failed("Instagram isn't connected -- connect it on the Integrations page.");
    }
    if (!patient.instagram_scoped_id) {
      return failed(
        "Instagram only lets you reply to people who've messaged you first, and this patient hasn't yet.",
      );
    }

    const mid = await sendInstagramText({ token, recipientId: patient.instagram_scoped_id, body });
    return { status: "sent", externalId: mid || null, failure: null };
  } catch (err) {
    return failed(err instanceof Error ? err.message : "Could not send the message.");
  }
}
