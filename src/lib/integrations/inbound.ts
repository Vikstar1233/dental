import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { toWhatsAppNumber } from "@/lib/integrations/whatsapp";
import { stopEnrollments } from "@/lib/campaigns/engine";
import { isStopMessage } from "@/lib/campaigns/shared";

type Inbound =
  | {
      channel: "whatsapp";
      externalId: string;
      body: string;
      waId: string; // sender's number as WhatsApp gives it: digits, country code
      name?: string;
    }
  | {
      channel: "instagram";
      externalId: string;
      body: string;
      igsid: string; // Instagram-scoped ID
      resolveName?: () => Promise<string | undefined>;
    };

function splitName(full: string | undefined, fallback: string) {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? fallback, last: parts.slice(1).join(" ") };
}

// Files a message the patient sent us into their thread. If it's from
// someone we don't know yet, they become a new lead -- an enquiry arriving
// by WhatsApp or Instagram shouldn't vanish just because there's no record.
export async function recordInbound(msg: Inbound) {
  const admin = createAdminClient();

  let patientId: string | null = null;

  if (msg.channel === "whatsapp") {
    const { data: candidates } = await admin
      .from("patients")
      .select("id, phone")
      .not("phone", "is", null);
    patientId =
      candidates?.find((p) => p.phone && toWhatsAppNumber(p.phone) === msg.waId)?.id ?? null;
  } else {
    const { data } = await admin
      .from("patients")
      .select("id")
      .eq("instagram_scoped_id", msg.igsid)
      .maybeSingle();
    patientId = data?.id ?? null;
  }

  if (!patientId) {
    const name =
      msg.channel === "whatsapp" ? msg.name : await msg.resolveName?.();
    const { first, last } = splitName(
      name,
      msg.channel === "whatsapp" ? "WhatsApp contact" : "Instagram contact",
    );

    const { data: created, error } = await admin
      .from("patients")
      .insert({
        first_name: first,
        last_name: last,
        phone: msg.channel === "whatsapp" ? `+${msg.waId}` : null,
        instagram_scoped_id: msg.channel === "instagram" ? msg.igsid : null,
        source: msg.channel === "instagram" ? "instagram" : "other",
        stage: "new_lead",
        preferred_channel: msg.channel,
      })
      .select("id")
      .single();

    if (error || !created) throw new Error(error?.message ?? "Could not create a lead.");
    patientId = created.id;
  } else if (msg.channel === "instagram") {
    // Remember how to reply -- harmless if it's already stored.
    await admin
      .from("patients")
      .update({ instagram_scoped_id: msg.igsid })
      .eq("id", patientId)
      .is("instagram_scoped_id", null);
  }

  // Providers redeliver; external_id is unique, so a repeat is a no-op.
  await admin.from("messages").upsert(
    {
      patient_id: patientId,
      direction: "inbound",
      channel: msg.channel,
      body: msg.body,
      external_id: msg.externalId,
      sent_by: null,
      status: "delivered",
    },
    { onConflict: "external_id", ignoreDuplicates: true },
  );

  await admin
    .from("patients")
    .update({ last_contact_at: new Date().toISOString() })
    .eq("id", patientId);

  if (patientId) await handleCampaignReply(patientId, msg.body);

  return patientId;
}

// Any reply ends the person's follow-up sequence on the spot; STOP also
// puts them on the do-not-contact list for every campaign and channel.
// Failures here (e.g. the campaigns tables don't exist yet) must never stop
// the message itself being recorded.
async function handleCampaignReply(patientId: string, body: string) {
  try {
    if (isStopMessage(body)) {
      await createAdminClient()
        .from("patients")
        .update({ marketing_opt_out: true, marketing_opted_out_at: new Date().toISOString() })
        .eq("id", patientId);
      await stopEnrollments(patientId, "opted_out");
    } else {
      await stopEnrollments(patientId, "replied");
    }
  } catch (err) {
    console.error("Could not update campaign enrolments", err);
  }
}

// Delivery receipts for messages we sent (WhatsApp reports sent / delivered
// / read / failed against the message id we stored when sending).
export async function recordDeliveryStatus(externalId: string, providerStatus: string) {
  const status =
    providerStatus === "failed"
      ? "failed"
      : providerStatus === "delivered" || providerStatus === "read"
        ? "delivered"
        : "sent";

  let query = createAdminClient()
    .from("messages")
    .update({ status })
    .eq("external_id", externalId)
    .eq("direction", "outbound");

  // Receipts can arrive out of order -- never step back from "delivered".
  if (status === "sent") query = query.neq("status", "delivered");

  await query;
}
