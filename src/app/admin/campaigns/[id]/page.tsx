import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { createClient } from "@/lib/supabase/server";
import {
  deleteCampaign,
  deleteStep,
  enrollMatching,
  runNow,
  saveStep,
  setCampaignStatus,
  updateAudience,
  updateCampaign,
} from "@/lib/actions/campaigns";
import { findAudience } from "@/lib/campaigns/engine";
import { getEmailConfig } from "@/lib/integrations/email-config";
import {
  PLACEHOLDERS,
  SEND_WINDOW_LABEL,
  STEP_CHANNEL_LABEL,
  describeDelay,
  renderTemplate,
  type Audience,
  type CampaignKind,
  type StepChannel,
} from "@/lib/campaigns/shared";
import { SOURCES, SOURCE_LABEL, STAGES, STAGE_LABEL } from "@/lib/stages";
import { StatusPill } from "../status-pill";

const inputClass =
  "mt-1 block w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none";
const labelClass = "block text-xs text-[var(--muted)]";
const cardClass = "rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm";
const ghostButton =
  "rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--porcelain)]";

type Step = {
  id: string;
  position: number;
  delay_hours: number;
  channel: StepChannel;
  subject: string;
  body: string;
};

type Event = {
  id: string;
  step_position: number | null;
  channel: string | null;
  status: string;
  detail: string;
  created_at: string;
  patients: { first_name: string; last_name: string } | null;
};

const EVENT_STYLE: Record<string, string> = {
  sent: "text-[var(--teal)]",
  failed: "text-[var(--danger)]",
  skipped: "text-[var(--muted)]",
};

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; note?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error, note } = await searchParams;
  const supabase = await createClient();

  const { data: campaign } = await supabase.from("campaigns").select("*").eq("id", id).single();
  if (!campaign) notFound();

  const kind = campaign.kind as CampaignKind;
  const audience = (campaign.audience ?? {}) as Audience;

  const [{ data: stepRows }, { data: enrollments }, { data: eventRows }, emailConfig, matches] =
    await Promise.all([
      supabase.from("campaign_steps").select("*").eq("campaign_id", id).order("position"),
      supabase.from("campaign_enrollments").select("status, stop_reason").eq("campaign_id", id),
      supabase
        .from("campaign_events")
        .select("id, step_position, channel, status, detail, created_at, patients(first_name, last_name)")
        .eq("campaign_id", id)
        .order("created_at", { ascending: false })
        .limit(25),
      getEmailConfig(),
      findAudience({ id, audience }),
    ]);

  const steps = (stepRows ?? []) as Step[];
  const events = (eventRows ?? []) as unknown as Event[];

  const tally = { active: 0, completed: 0, replied: 0, optedOut: 0, other: 0 };
  for (const e of enrollments ?? []) {
    if (e.status === "active") tally.active += 1;
    else if (e.status === "completed") tally.completed += 1;
    else if (e.stop_reason === "replied") tally.replied += 1;
    else if (e.stop_reason === "opted_out") tally.optedOut += 1;
    else tally.other += 1;
  }
  const withEmail = matches.filter((p) => p.email).length;

  const sampleVars = {
    first_name: "Priya",
    practice: campaign.practice_name,
    sender: campaign.sender_name,
  };

  // Cumulative hours before each message, for the "about day N" hint.
  const startsAtHours = steps.map((_, i) =>
    steps.slice(0, i + 1).reduce((sum, s) => sum + s.delay_hours, 0),
  );

  return (
    <div className="px-10 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl text-[var(--ink)]">{campaign.name}</h1>
              <StatusPill status={campaign.status} />
            </div>
            <p className="text-sm capitalize text-[var(--muted)]">{kind} campaign</p>
          </div>
          <Link
            href="/admin/campaigns"
            className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]"
          >
            &larr; Back to campaigns
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}
        {note && (
          <div className="rounded-lg border border-[var(--teal)]/30 bg-[var(--teal-soft)] px-4 py-2.5 text-sm text-[var(--teal-deep)]">
            {note}
          </div>
        )}
        {!emailConfig && (
          <div className="rounded-lg border border-[var(--warn)]/30 bg-[var(--warn-soft)] px-4 py-2.5 text-sm text-[var(--warn)]">
            No mailbox is connected, so email steps will wait.{" "}
            <Link href="/admin/integrations" className="font-medium underline">
              Connect one on the Integrations page
            </Link>
            .
          </div>
        )}

        <div className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink)]">
                {campaign.status === "active" ? "Running" : "Not running"}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Sends {SEND_WINDOW_LABEL}, up to {campaign.daily_limit} a day.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {campaign.status === "active" && (
                <form action={runNow}>
                  <input type="hidden" name="id" value={id} />
                  <button type="submit" className={ghostButton}>
                    Run due steps now
                  </button>
                </form>
              )}
              <form action={setCampaignStatus}>
                <input type="hidden" name="id" value={id} />
                <input
                  type="hidden"
                  name="status"
                  value={campaign.status === "active" ? "paused" : "active"}
                />
                <button
                  type="submit"
                  className={
                    campaign.status === "active"
                      ? ghostButton
                      : "rounded-lg bg-[var(--teal)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--teal-deep)]"
                  }
                >
                  {campaign.status === "active" ? "Pause" : campaign.status === "paused" ? "Resume" : "Switch on"}
                </button>
              </form>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-center sm:grid-cols-5">
            {[
              ["In sequence", tally.active],
              ["Replied", tally.replied],
              ["Finished", tally.completed],
              ["Opted out", tally.optedOut],
              ["Stopped", tally.other],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dd className="font-display text-xl text-[var(--ink)]">{value}</dd>
                <dt className="text-xs text-[var(--muted)]">{label}</dt>
              </div>
            ))}
          </dl>
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Who it&apos;s for</h2>
          <form action={updateAudience} className="space-y-4">
            <input type="hidden" name="id" value={id} />

            <fieldset>
              <legend className={labelClass}>Pipeline stage (none ticked = any)</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {STAGES.map((stage) => (
                  <label
                    key={stage}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--ink)] has-[:checked]:border-[var(--teal)] has-[:checked]:bg-[var(--teal-soft)]"
                  >
                    <input
                      type="checkbox"
                      name="stages"
                      value={stage}
                      defaultChecked={audience.stages?.includes(stage)}
                    />
                    {STAGE_LABEL[stage]}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className={labelClass}>Where they came from (none ticked = anywhere)</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {SOURCES.map((source) => (
                  <label
                    key={source}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--ink)] has-[:checked]:border-[var(--teal)] has-[:checked]:bg-[var(--teal-soft)]"
                  >
                    <input
                      type="checkbox"
                      name="sources"
                      value={source}
                      defaultChecked={audience.sources?.includes(source)}
                    />
                    {SOURCE_LABEL[source]}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Tagged with (any of)</label>
                <input
                  name="tags"
                  type="text"
                  defaultValue={(audience.tags ?? []).join(", ")}
                  placeholder="invisalign interest"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Quiet for at least (days)</label>
                <input
                  name="min_inactive_days"
                  type="number"
                  min={0}
                  defaultValue={audience.min_inactive_days ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>…but no more than (days)</label>
                <input
                  name="max_inactive_days"
                  type="number"
                  min={0}
                  defaultValue={audience.max_inactive_days ?? ""}
                  className={inputClass}
                />
              </div>
            </div>
            <p className="text-xs text-[var(--muted)]">
              &ldquo;Quiet&rdquo; counts from the last time anyone messaged or called them. Anyone who has
              opted out, or is already in another campaign, is left out automatically.
            </p>
            <button type="submit" className={ghostButton}>
              Save audience
            </button>
          </form>

          <div className="mt-5 rounded-lg bg-[var(--porcelain)] p-4">
            <p className="text-sm text-[var(--ink)]">
              <strong>{matches.length}</strong> {matches.length === 1 ? "person matches" : "people match"} right
              now, <strong>{withEmail}</strong> with an email address.
            </p>
            {matches.length > 0 && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                {matches
                  .slice(0, 8)
                  .map((p) => `${p.first_name} ${p.last_name}`.trim())
                  .join(", ")}
                {matches.length > 8 ? ` and ${matches.length - 8} more` : ""}
              </p>
            )}

            {kind === "reactivation" || !campaign.auto_enroll ? (
              <form action={enrollMatching} className="mt-3 flex items-end gap-2">
                <input type="hidden" name="id" value={id} />
                <div>
                  <label className={labelClass}>Enrol how many?</label>
                  <input
                    name="limit"
                    type="number"
                    min={1}
                    defaultValue={10}
                    className="mt-1 block w-24 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={matches.length === 0}
                  className="rounded-lg bg-[var(--teal)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--teal-deep)] disabled:opacity-50"
                >
                  Enrol them
                </button>
              </form>
            ) : (
              <p className="mt-3 text-xs text-[var(--muted)]">
                Automatic: new leads that match are enrolled as they arrive once the campaign is running.
                Existing patients are never added.
              </p>
            )}
            {(kind === "reactivation" || !campaign.auto_enroll) && (
              <p className="mt-2 text-xs text-[var(--muted)]">
                Start with about 10 to see how it goes before enrolling the rest.
              </p>
            )}
          </div>
        </div>

        <div className={cardClass}>
          <h2 className="mb-1 text-sm font-semibold text-[var(--ink)]">The messages</h2>
          <p className="mb-4 text-xs text-[var(--muted)]">
            Use {PLACEHOLDERS.join(", ")} in the text. Each message has to earn a reply, so keep to one
            easy question. A sequence stops as soon as the person replies.
          </p>

          <div className="space-y-4">
            {steps.map((step, index) => {
              return (
                <form
                  key={step.id}
                  action={saveStep}
                  className="space-y-3 rounded-lg border border-[var(--line)] p-4"
                >
                  <input type="hidden" name="campaign_id" value={id} />
                  <input type="hidden" name="step_id" value={step.id} />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--ink)]">
                      Message {step.position}
                    </span>
                    <span className="text-[var(--muted)]">
                      {describeDelay(step.delay_hours)}
                      {step.position > 1 && ` · about day ${Math.floor(startsAtHours[index] / 24) + 1}`}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className={labelClass}>Wait (hours)</label>
                      <input
                        name="delay_hours"
                        type="number"
                        min={0}
                        defaultValue={step.delay_hours}
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Send by</label>
                      <select name="channel" defaultValue={step.channel} className={inputClass}>
                        {(Object.keys(STEP_CHANNEL_LABEL) as StepChannel[]).map((c) => (
                          <option key={c} value={c}>
                            {STEP_CHANNEL_LABEL[c]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Email subject</label>
                    <input name="subject" type="text" defaultValue={step.subject} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Message</label>
                    <textarea
                      name="body"
                      rows={5}
                      required
                      defaultValue={step.body}
                      className={inputClass}
                    />
                  </div>
                  <details className="text-xs text-[var(--muted)]">
                    <summary className="cursor-pointer">Preview for &ldquo;Priya&rdquo;</summary>
                    <div className="mt-2 whitespace-pre-wrap rounded-lg bg-[var(--porcelain)] p-3 text-[var(--ink)]">
                      {step.channel !== "whatsapp" && step.channel !== "instagram" && step.subject && (
                        <div className="mb-2 font-medium">
                          Subject: {renderTemplate(step.subject, sampleVars)}
                        </div>
                      )}
                      {renderTemplate(step.body, sampleVars)}
                    </div>
                  </details>
                  <div className="flex items-center gap-2">
                    <button type="submit" className={ghostButton}>
                      Save message
                    </button>
                    <button
                      type="submit"
                      formAction={deleteStep}
                      className="text-xs font-medium text-[var(--muted)] hover:text-[var(--danger)]"
                    >
                      Delete
                    </button>
                  </div>
                </form>
              );
            })}
            {steps.length === 0 && (
              <p className="text-sm text-[var(--muted)]">No messages yet. Add the first one below.</p>
            )}
          </div>

          <form action={saveStep} className="mt-5 space-y-3 rounded-lg border border-dashed border-[var(--line)] p-4">
            <input type="hidden" name="campaign_id" value={id} />
            <div className="text-xs font-semibold text-[var(--ink)]">Add a message</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Wait (hours)</label>
                <input name="delay_hours" type="number" min={0} defaultValue={24} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Send by</label>
                <select name="channel" defaultValue="email" className={inputClass}>
                  {(Object.keys(STEP_CHANNEL_LABEL) as StepChannel[]).map((c) => (
                    <option key={c} value={c}>
                      {STEP_CHANNEL_LABEL[c]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Email subject</label>
              <input name="subject" type="text" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Message</label>
              <textarea name="body" rows={4} required className={inputClass} />
            </div>
            <button type="submit" className={ghostButton}>
              Add message
            </button>
          </form>

          <p className="mt-4 text-xs text-[var(--muted)]">
            Text is appended with &ldquo;Reply STOP&rdquo; automatically. WhatsApp and Instagram only allow
            a free-text message within 24 hours of the patient&apos;s last message to you, so those steps
            apply to people who have just been in touch there; everyone else is reached by email.
          </p>
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Settings</h2>
          <form action={updateCampaign} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={id} />
            <div className="sm:col-span-2">
              <label className={labelClass}>Campaign name</label>
              <input name="name" type="text" required defaultValue={campaign.name} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Practice name</label>
              <input name="practice_name" type="text" defaultValue={campaign.practice_name} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Signed by</label>
              <input name="sender_name" type="text" defaultValue={campaign.sender_name} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Daily limit (messages a day)</label>
              <input
                name="daily_limit"
                type="number"
                min={1}
                defaultValue={campaign.daily_limit}
                className={inputClass}
              />
            </div>
            {kind === "nurture" && (
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-[var(--ink)]">
                <input type="checkbox" name="auto_enroll" defaultChecked={campaign.auto_enroll} />
                Enrol new leads automatically
              </label>
            )}
            <div className="sm:col-span-2">
              <button type="submit" className={ghostButton}>
                Save settings
              </button>
            </div>
          </form>
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Recent activity</h2>
          {events.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Nothing sent yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b border-[var(--line)] last:border-0">
                      <td className="py-2 pr-3 text-[var(--ink)]">
                        {event.patients
                          ? `${event.patients.first_name} ${event.patients.last_name}`.trim()
                          : "Unknown"}
                      </td>
                      <td className="py-2 pr-3 text-xs text-[var(--muted)]">
                        Message {event.step_position}
                        {event.channel ? ` · ${event.channel}` : ""}
                      </td>
                      <td className={`py-2 pr-3 text-xs font-medium capitalize ${EVENT_STYLE[event.status]}`}>
                        {event.status}
                      </td>
                      <td className="py-2 pr-3 text-xs text-[var(--muted)]">{event.detail}</td>
                      <td className="py-2 font-data text-xs text-[var(--muted)]">
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <form action={deleteCampaign}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" className="text-xs font-medium text-[var(--muted)] hover:text-[var(--danger)]">
              Delete this campaign
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
