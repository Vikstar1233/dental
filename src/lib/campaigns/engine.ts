import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailConfig } from "@/lib/integrations/email-config";
import { getIntegration } from "@/lib/integrations/store";
import { getSecret, SECRET } from "@/lib/integrations/secrets";
import { dispatchMessage } from "@/lib/integrations/dispatch";
import {
  BOOKED_STAGES,
  inSendWindow,
  londonDay,
  renderTemplate,
  withOptOut,
  type Audience,
  type StepChannel,
} from "@/lib/campaigns/shared";

type Campaign = {
  id: string;
  name: string;
  kind: "nurture" | "reactivation";
  status: string;
  practice_name: string;
  sender_name: string;
  audience: Audience;
  auto_enroll: boolean;
  daily_limit: number;
  activated_at: string | null;
};

type Step = {
  id: string;
  campaign_id: string;
  position: number;
  delay_hours: number;
  channel: StepChannel;
  subject: string;
  body: string;
};

type PatientRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  stage: string;
  source: string;
  tags: string[] | null;
  created_at: string;
  last_contact_at: string | null;
  instagram_scoped_id: string | null;
  marketing_opt_out: boolean;
};

export type RunSummary = {
  enrolled: number;
  sent: number;
  skipped: number;
  failed: number;
  stopped: number;
  waiting: number;
  outsideWindow: boolean;
  notes: string[];
};

const PATIENT_COLUMNS =
  "id, first_name, last_name, email, phone, stage, source, tags, created_at, last_contact_at, instagram_scoped_id, marketing_opt_out";

const DAY_MS = 24 * 3600 * 1000;
const LIVE_CHAT_MS = DAY_MS; // WhatsApp / Instagram free-text reply window

function emptySummary(): RunSummary {
  return {
    enrolled: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    stopped: 0,
    waiting: 0,
    outsideWindow: false,
    notes: [],
  };
}

// --- audiences ---------------------------------------------------------------

function inactiveDays(p: PatientRow, now: number): number {
  const last = new Date(p.last_contact_at ?? p.created_at).getTime();
  return (now - last) / DAY_MS;
}

function matchesAudience(p: PatientRow, audience: Audience, now: number): boolean {
  if (p.marketing_opt_out) return false;
  if (audience.stages?.length && !audience.stages.includes(p.stage)) return false;
  if (audience.sources?.length && !audience.sources.includes(p.source)) return false;
  if (audience.tags?.length) {
    const tags = (p.tags ?? []).map((t) => t.toLowerCase());
    if (!audience.tags.some((t) => tags.includes(t.toLowerCase()))) return false;
  }
  if (audience.min_inactive_days && inactiveDays(p, now) < audience.min_inactive_days) {
    return false;
  }
  if (audience.max_inactive_days && inactiveDays(p, now) > audience.max_inactive_days) {
    return false;
  }
  return true;
}

// Patients who fit a campaign's audience and are free to be enrolled: not
// opted out, not already in this campaign, and not mid-sequence in another
// one (nobody should get two campaigns' messages at once).
export async function findAudience(campaign: Pick<Campaign, "id" | "audience">) {
  const admin = createAdminClient();
  const now = Date.now();

  const [{ data: patients }, { data: enrolled }, { data: busy }] = await Promise.all([
    admin
      .from("patients")
      .select(PATIENT_COLUMNS)
      .eq("marketing_opt_out", false)
      .order("created_at", { ascending: false })
      .limit(1000),
    admin.from("campaign_enrollments").select("patient_id").eq("campaign_id", campaign.id),
    admin.from("campaign_enrollments").select("patient_id").eq("status", "active"),
  ]);

  const taken = new Set([
    ...(enrolled ?? []).map((e) => e.patient_id as string),
    ...(busy ?? []).map((e) => e.patient_id as string),
  ]);

  const matches = ((patients ?? []) as PatientRow[]).filter(
    (p) => !taken.has(p.id) && matchesAudience(p, campaign.audience ?? {}, now),
  );
  return matches;
}

// Enrols matching patients, up to `limit`. Returns how many were added.
export async function enrollAudience(campaignId: string, limit: number): Promise<number> {
  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("id, audience")
    .eq("id", campaignId)
    .single();
  if (!campaign) return 0;

  const { data: first } = await admin
    .from("campaign_steps")
    .select("delay_hours")
    .eq("campaign_id", campaignId)
    .eq("position", 1)
    .maybeSingle();
  if (!first) return 0;

  const matches = (await findAudience(campaign)).slice(0, limit);
  if (matches.length === 0) return 0;

  const runAt = new Date(Date.now() + first.delay_hours * 3600 * 1000).toISOString();
  const { error } = await admin.from("campaign_enrollments").insert(
    matches.map((p) => ({
      campaign_id: campaignId,
      patient_id: p.id,
      next_step: 1,
      next_run_at: runAt,
    })),
  );
  if (error) throw new Error(error.message);
  return matches.length;
}

// Active nurture campaigns pick up new leads automatically -- only people
// who arrived after the campaign was switched on, never the back catalogue.
async function autoEnroll(campaign: Campaign): Promise<number> {
  if (!campaign.auto_enroll || campaign.kind !== "nurture" || !campaign.activated_at) return 0;

  const admin = createAdminClient();
  const { data: first } = await admin
    .from("campaign_steps")
    .select("delay_hours")
    .eq("campaign_id", campaign.id)
    .eq("position", 1)
    .maybeSingle();
  if (!first) return 0;

  const since = new Date(campaign.activated_at).getTime();
  const matches = (await findAudience(campaign))
    .filter((p) => new Date(p.created_at).getTime() > since)
    .slice(0, 100);
  if (matches.length === 0) return 0;

  const runAt = new Date(Date.now() + first.delay_hours * 3600 * 1000).toISOString();
  const { error } = await admin.from("campaign_enrollments").insert(
    matches.map((p) => ({
      campaign_id: campaign.id,
      patient_id: p.id,
      next_step: 1,
      next_run_at: runAt,
    })),
  );
  return error ? 0 : matches.length;
}

// --- stopping ----------------------------------------------------------------

export async function stopEnrollments(
  patientId: string,
  reason: "replied" | "opted_out" | "manual",
) {
  await createAdminClient()
    .from("campaign_enrollments")
    .update({ status: "stopped", stop_reason: reason, finished_at: new Date().toISOString() })
    .eq("patient_id", patientId)
    .eq("status", "active");
}

async function stopReason(
  patient: PatientRow,
  campaign: Campaign,
  enrolledAt: string,
): Promise<string | null> {
  if (patient.marketing_opt_out) return "opted_out";

  const audienceStages = campaign.audience?.stages ?? [];
  if (audienceStages.length > 0 && !audienceStages.includes(patient.stage)) {
    return "left_audience";
  }
  // Once someone's in the diary the follow-ups stop, unless the campaign was
  // deliberately aimed at a booked stage.
  if (
    BOOKED_STAGES.includes(patient.stage) &&
    !audienceStages.some((s) => BOOKED_STAGES.includes(s))
  ) {
    return "booked";
  }

  const admin = createAdminClient();

  const { count: replies } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patient.id)
    .eq("direction", "inbound")
    .gt("created_at", enrolledAt);
  if (replies) return "replied";

  // A person on the team has already been in touch (message or logged call).
  const { count: manual } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patient.id)
    .eq("direction", "outbound")
    .is("campaign_id", null)
    .gt("created_at", enrolledAt);
  if (manual) return "team_contacted";

  return null;
}

// --- channels ----------------------------------------------------------------

type Availability = { email: boolean; whatsapp: boolean; instagram: boolean };

async function integrationAvailability(): Promise<Availability> {
  const [email, whatsapp, instagram, waToken, igToken] = await Promise.all([
    getEmailConfig(),
    getIntegration("whatsapp"),
    getIntegration("instagram"),
    getSecret(SECRET.whatsappAccessToken),
    getSecret(SECRET.instagramAccessToken),
  ]);
  return {
    email: !!email,
    whatsapp: whatsapp?.status === "connected" && !!waToken,
    instagram: instagram?.status === "connected" && !!igToken,
  };
}

type Resolved =
  | { kind: "send"; channel: "email" | "whatsapp" | "instagram" }
  | { kind: "skip"; reason: string }
  | { kind: "wait"; reason: string };

// Which channel a step goes out on for this patient, or why it can't.
// WhatsApp and Instagram only allow free-text replies within 24 hours of the
// person's last message, so those only apply to someone who has just been in
// touch on that channel; everyone else is reached by email.
async function resolveChannel(
  patient: PatientRow,
  wanted: StepChannel,
  available: Availability,
): Promise<Resolved> {
  const { data: recent } = await createAdminClient()
    .from("messages")
    .select("channel, created_at")
    .eq("patient_id", patient.id)
    .eq("direction", "inbound")
    .in("channel", ["whatsapp", "instagram"])
    .gt("created_at", new Date(Date.now() - LIVE_CHAT_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  const live = recent?.[0]?.channel as "whatsapp" | "instagram" | undefined;

  const tryEmail = (): Resolved => {
    if (!patient.email) return { kind: "skip", reason: "No email address on file." };
    if (!available.email) {
      return { kind: "wait", reason: "Email isn't connected -- connect a mailbox on the Integrations page." };
    }
    return { kind: "send", channel: "email" };
  };

  const tryLive = (channel: "whatsapp" | "instagram"): Resolved | null => {
    if (live !== channel) return null;
    if (!available[channel]) return null;
    if (channel === "whatsapp" && !patient.phone) return null;
    if (channel === "instagram" && !patient.instagram_scoped_id) return null;
    return { kind: "send", channel };
  };

  if (wanted === "email") return tryEmail();

  if (wanted === "auto") {
    return (live && tryLive(live)) || tryEmail();
  }

  const direct = tryLive(wanted);
  if (direct) return direct;
  return {
    kind: "skip",
    reason: `${wanted === "whatsapp" ? "WhatsApp" : "Instagram"} only allows a free-text message within 24 hours of the patient's last message to you.`,
  };
}

// --- the run -----------------------------------------------------------------

async function sentTodayCount(campaignId: string): Promise<number> {
  const { data } = await createAdminClient()
    .from("campaign_events")
    .select("created_at")
    .eq("campaign_id", campaignId)
    .eq("status", "sent")
    .gt("created_at", new Date(Date.now() - 36 * 3600 * 1000).toISOString());
  const today = londonDay(new Date());
  return (data ?? []).filter((e) => londonDay(new Date(e.created_at)) === today).length;
}

// Safe to call as often as you like: it only acts on steps that are due,
// only inside the send window, and never beyond each campaign's daily limit.
export async function runCampaigns(options: { campaignId?: string } = {}): Promise<RunSummary> {
  const summary = emptySummary();
  const admin = createAdminClient();

  let query = admin.from("campaigns").select("*").eq("status", "active");
  if (options.campaignId) query = query.eq("id", options.campaignId);
  const { data: campaigns } = await query;

  if (!campaigns || campaigns.length === 0) return summary;

  for (const campaign of campaigns as Campaign[]) {
    summary.enrolled += await autoEnroll(campaign);
  }

  if (!inSendWindow()) {
    summary.outsideWindow = true;
    return summary;
  }

  const available = await integrationAvailability();

  for (const campaign of campaigns as Campaign[]) {
    const { data: stepRows } = await admin
      .from("campaign_steps")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("position");
    const steps = (stepRows ?? []) as Step[];
    if (steps.length === 0) continue;

    let budget = campaign.daily_limit - (await sentTodayCount(campaign.id));
    if (budget <= 0) {
      summary.notes.push(`${campaign.name}: daily limit of ${campaign.daily_limit} reached.`);
      continue;
    }

    const { data: due } = await admin
      .from("campaign_enrollments")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("status", "active")
      .lte("next_run_at", new Date().toISOString())
      .order("next_run_at")
      .limit(50);

    for (const enrollment of due ?? []) {
      if (budget <= 0) break;

      const { data: patient } = await admin
        .from("patients")
        .select(PATIENT_COLUMNS)
        .eq("id", enrollment.patient_id)
        .single();
      if (!patient) continue;

      const reason = await stopReason(patient as PatientRow, campaign, enrollment.enrolled_at);
      if (reason) {
        await admin
          .from("campaign_enrollments")
          .update({ status: "stopped", stop_reason: reason, finished_at: new Date().toISOString() })
          .eq("id", enrollment.id);
        summary.stopped += 1;
        continue;
      }

      const step = steps.find((s) => s.position === enrollment.next_step);
      if (!step) {
        await admin
          .from("campaign_enrollments")
          .update({ status: "completed", finished_at: new Date().toISOString() })
          .eq("id", enrollment.id);
        continue;
      }

      const resolved = await resolveChannel(patient as PatientRow, step.channel, available);

      if (resolved.kind === "wait") {
        summary.waiting += 1;
        if (!summary.notes.includes(resolved.reason)) summary.notes.push(resolved.reason);
        continue;
      }

      // Claim the step so two overlapping runs can't both send it. If the
      // run dies after this, the step is retried in ten minutes.
      const { data: claimed } = await admin
        .from("campaign_enrollments")
        .update({ next_run_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() })
        .eq("id", enrollment.id)
        .eq("next_run_at", enrollment.next_run_at)
        .eq("status", "active")
        .select("id");
      if (!claimed || claimed.length === 0) continue;

      let eventStatus: "sent" | "failed" | "skipped";
      let detail = "";
      let channelUsed: string | null = null;

      if (resolved.kind === "skip") {
        eventStatus = "skipped";
        detail = resolved.reason;
        summary.skipped += 1;
      } else {
        channelUsed = resolved.channel;
        const vars = {
          first_name: patient.first_name,
          practice: campaign.practice_name,
          sender: campaign.sender_name,
        };
        const body = withOptOut(renderTemplate(step.body, vars), resolved.channel);
        const subject = renderTemplate(step.subject || "a quick question", vars);

        const result = await dispatchMessage(patient.id, resolved.channel, body, { subject });

        if (result.status === "sent") {
          eventStatus = "sent";
          summary.sent += 1;
          budget -= 1;
          await admin.from("messages").insert({
            patient_id: patient.id,
            direction: "outbound",
            channel: resolved.channel,
            body,
            sent_by: null,
            status: "sent",
            external_id: result.externalId,
            campaign_id: campaign.id,
          });
          await admin
            .from("patients")
            .update({ last_contact_at: new Date().toISOString() })
            .eq("id", patient.id);
        } else {
          eventStatus = "failed";
          detail = result.failure ?? "Could not send.";
          summary.failed += 1;
        }
      }

      await admin.from("campaign_events").insert({
        campaign_id: campaign.id,
        enrollment_id: enrollment.id,
        patient_id: patient.id,
        step_position: step.position,
        channel: channelUsed,
        status: eventStatus,
        detail,
      });

      const next = steps.find((s) => s.position === step.position + 1);
      if (next) {
        // A little jitter so a batch doesn't all land in the same minute.
        const jitterMs = Math.floor(Math.random() * 40 * 60 * 1000);
        await admin
          .from("campaign_enrollments")
          .update({
            next_step: next.position,
            next_run_at: new Date(Date.now() + next.delay_hours * 3600 * 1000 + jitterMs).toISOString(),
          })
          .eq("id", enrollment.id);
      } else {
        await admin
          .from("campaign_enrollments")
          .update({ status: "completed", next_step: step.position + 1, finished_at: new Date().toISOString() })
          .eq("id", enrollment.id);
      }
    }
  }

  return summary;
}
