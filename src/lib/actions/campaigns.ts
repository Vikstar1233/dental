"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrollAudience, runCampaigns, stopEnrollments } from "@/lib/campaigns/engine";
import {
  starterAudience,
  starterSteps,
  type CampaignKind,
  type StepChannel,
} from "@/lib/campaigns/shared";

const LIST = "/admin/campaigns";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function done(path: string, note?: string): never {
  revalidatePath(path);
  redirect(note ? `${path}?note=${encodeURIComponent(note)}` : path);
}

function clean(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function wholeNumber(value: FormDataEntryValue | null): number | null {
  const n = Number.parseInt(clean(value), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function createCampaign(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const name = clean(formData.get("name"));
  const kind = clean(formData.get("kind")) as CampaignKind;
  if (!name) fail(`${LIST}/new`, "Give the campaign a name.");
  if (kind !== "nurture" && kind !== "reactivation") fail(`${LIST}/new`, "Pick a campaign type.");

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      name,
      kind,
      practice_name: clean(formData.get("practice_name")),
      sender_name: clean(formData.get("sender_name")),
      audience: starterAudience(kind),
      auto_enroll: kind === "nurture",
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !campaign) fail(`${LIST}/new`, error?.message ?? "Could not create the campaign.");

  const { error: stepError } = await supabase.from("campaign_steps").insert(
    starterSteps(kind).map((step, i) => ({ ...step, campaign_id: campaign.id, position: i + 1 })),
  );
  if (stepError) fail(`${LIST}/${campaign.id}`, stepError.message);

  redirect(`${LIST}/${campaign.id}`);
}

export async function updateCampaign(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = clean(formData.get("id"));
  const path = `${LIST}/${id}`;

  const name = clean(formData.get("name"));
  if (!name) fail(path, "The campaign needs a name.");

  const dailyLimit = wholeNumber(formData.get("daily_limit"));
  if (!dailyLimit || dailyLimit < 1) fail(path, "Daily limit must be at least 1.");

  const { error } = await supabase
    .from("campaigns")
    .update({
      name,
      practice_name: clean(formData.get("practice_name")),
      sender_name: clean(formData.get("sender_name")),
      daily_limit: dailyLimit,
      auto_enroll: formData.get("auto_enroll") === "on",
    })
    .eq("id", id);

  if (error) fail(path, error.message);
  done(path);
}

export async function updateAudience(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = clean(formData.get("id"));
  const path = `${LIST}/${id}`;

  const tags = clean(formData.get("tags"))
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const { error } = await supabase
    .from("campaigns")
    .update({
      audience: {
        stages: formData.getAll("stages").map(String),
        sources: formData.getAll("sources").map(String),
        tags,
        min_inactive_days: wholeNumber(formData.get("min_inactive_days")),
        max_inactive_days: wholeNumber(formData.get("max_inactive_days")),
      },
    })
    .eq("id", id);

  if (error) fail(path, error.message);
  done(path);
}

export async function saveStep(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const campaignId = clean(formData.get("campaign_id"));
  const stepId = clean(formData.get("step_id"));
  const path = `${LIST}/${campaignId}`;

  const body = clean(formData.get("body"));
  if (!body) fail(path, "A step needs some message text.");

  const channel = clean(formData.get("channel")) as StepChannel;
  if (!["auto", "email", "whatsapp", "instagram"].includes(channel)) fail(path, "Pick a channel.");

  const fields = {
    delay_hours: wholeNumber(formData.get("delay_hours")) ?? 24,
    channel,
    subject: clean(formData.get("subject")),
    body,
  };

  if (stepId) {
    const { error } = await supabase.from("campaign_steps").update(fields).eq("id", stepId);
    if (error) fail(path, error.message);
  } else {
    const { data: last } = await supabase
      .from("campaign_steps")
      .select("position")
      .eq("campaign_id", campaignId)
      .order("position", { ascending: false })
      .limit(1);
    const { error } = await supabase.from("campaign_steps").insert({
      ...fields,
      campaign_id: campaignId,
      position: (last?.[0]?.position ?? 0) + 1,
    });
    if (error) fail(path, error.message);
  }

  done(path);
}

export async function deleteStep(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const campaignId = clean(formData.get("campaign_id"));
  const stepId = clean(formData.get("step_id"));
  const path = `${LIST}/${campaignId}`;

  const { error } = await supabase.from("campaign_steps").delete().eq("id", stepId);
  if (error) fail(path, error.message);

  // Close the gap so positions stay 1..n. Done in order, so each move lands
  // on the slot the previous one just freed.
  const { data: remaining } = await supabase
    .from("campaign_steps")
    .select("id, position")
    .eq("campaign_id", campaignId)
    .order("position");

  for (const [i, step] of (remaining ?? []).entries()) {
    if (step.position !== i + 1) {
      await supabase.from("campaign_steps").update({ position: i + 1 }).eq("id", step.id);
    }
  }

  done(path);
}

export async function setCampaignStatus(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = clean(formData.get("id"));
  const status = clean(formData.get("status"));
  const path = `${LIST}/${id}`;

  if (!["active", "paused", "draft"].includes(status)) fail(path, "Unknown status.");

  const update: Record<string, unknown> = { status };

  if (status === "active") {
    const { count } = await supabase
      .from("campaign_steps")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id);
    if (!count) fail(path, "Add at least one message before switching the campaign on.");

    // Auto-enrolment only ever covers leads that arrive from this moment on.
    update.activated_at = new Date().toISOString();
  }

  const { error } = await supabase.from("campaigns").update(update).eq("id", id);
  if (error) fail(path, error.message);
  done(path);
}

export async function enrollMatching(formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"));
  const path = `${LIST}/${id}`;

  const limit = wholeNumber(formData.get("limit"));
  if (!limit || limit < 1) fail(path, "Enter how many people to enrol.");

  let added = 0;
  let failure: string | null = null;
  try {
    added = await enrollAudience(id, limit);
  } catch (err) {
    failure = err instanceof Error ? err.message : "Could not enrol patients.";
  }
  if (failure) fail(path, failure);

  done(
    path,
    added === 0
      ? "Nobody new to enrol -- everyone who matches is already in a campaign, or the audience is empty."
      : `Enrolled ${added} ${added === 1 ? "person" : "people"}. The first messages go out in the next send window.`,
  );
}

export async function runNow(formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"));
  const path = id ? `${LIST}/${id}` : LIST;

  let note = "";
  let failure: string | null = null;
  try {
    const s = await runCampaigns(id ? { campaignId: id } : {});
    const bits = [
      `${s.sent} sent`,
      s.skipped && `${s.skipped} skipped`,
      s.failed && `${s.failed} failed`,
      s.stopped && `${s.stopped} stopped (replied or booked)`,
      s.enrolled && `${s.enrolled} new leads enrolled`,
      s.waiting && `${s.waiting} waiting`,
    ].filter(Boolean);
    note = bits.join(", ") + ".";
    if (s.outsideWindow) {
      note += " It's outside the send window (09:00-18:00 UK, Mon-Sat), so nothing was sent.";
    }
    if (s.notes.length) note += " " + s.notes.join(" ");
  } catch (err) {
    failure = err instanceof Error ? err.message : "The run failed.";
  }
  if (failure) fail(path, failure);

  done(path, note);
}

export async function deleteCampaign(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = clean(formData.get("id"));

  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) fail(`${LIST}/${id}`, error.message);
  done(LIST);
}

// The do-not-contact switch on a patient. Opting someone out also ends any
// sequence they're partway through.
export async function setMarketingOptOut(formData: FormData) {
  await requireAdmin();
  const patientId = clean(formData.get("patient_id"));
  const optOut = clean(formData.get("opt_out")) === "true";
  const path = `/admin/patients/${patientId}`;

  const { error } = await createAdminClient()
    .from("patients")
    .update({
      marketing_opt_out: optOut,
      marketing_opted_out_at: optOut ? new Date().toISOString() : null,
    })
    .eq("id", patientId);

  if (error) fail(path, error.message);
  if (optOut) await stopEnrollments(patientId, "opted_out");
  done(path);
}
