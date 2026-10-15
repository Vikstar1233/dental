import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { createClient } from "@/lib/supabase/server";
import { campaignsReady } from "@/lib/campaigns/ready";
import { runNow } from "@/lib/actions/campaigns";
import { KIND_BLURB, KIND_LABEL, SEND_WINDOW_LABEL, type CampaignKind } from "@/lib/campaigns/shared";
import { StatusPill } from "./status-pill";

const cardClass =
  "rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; note?: string }>;
}) {
  await requireAdmin();
  const { error, note } = await searchParams;

  const ready = await campaignsReady();

  type CampaignRow = {
    id: string;
    name: string;
    kind: CampaignKind;
    status: string;
    created_at: string;
  };
  let campaigns: CampaignRow[] = [];
  const counts = new Map<string, { active: number; completed: number; replied: number; stopped: number }>();
  const sent = new Map<string, number>();

  if (ready) {
    const supabase = await createClient();
    const [{ data: c }, { data: enrollments }, { data: events }] = await Promise.all([
      supabase
        .from("campaigns")
        .select("id, name, kind, status, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("campaign_enrollments").select("campaign_id, status, stop_reason"),
      supabase.from("campaign_events").select("campaign_id").eq("status", "sent"),
    ]);
    campaigns = (c ?? []) as CampaignRow[];

    for (const e of enrollments ?? []) {
      const row = counts.get(e.campaign_id) ?? { active: 0, completed: 0, replied: 0, stopped: 0 };
      if (e.status === "active") row.active += 1;
      else if (e.status === "completed") row.completed += 1;
      else if (e.stop_reason === "replied") row.replied += 1;
      else row.stopped += 1;
      counts.set(e.campaign_id, row);
    }
    for (const e of events ?? []) {
      sent.set(e.campaign_id, (sent.get(e.campaign_id) ?? 0) + 1);
    }
  }

  return (
    <div className="px-10 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl text-[var(--ink)]">Campaigns</h1>
            <p className="text-sm text-[var(--muted)]">
              Automatic follow-up for new enquiries, and win-back messages for people who went quiet.
            </p>
          </div>
          {ready && (
            <div className="flex items-center gap-2">
              <form action={runNow}>
                <input type="hidden" name="id" value="" />
                <button
                  type="submit"
                  className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--porcelain)]"
                >
                  Run due steps now
                </button>
              </form>
              <Link
                href="/admin/campaigns/new"
                className="rounded-lg bg-[var(--teal)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--teal-deep)]"
              >
                New campaign
              </Link>
            </div>
          )}
        </div>

        {!ready && (
          <div className="rounded-lg border border-[var(--warn)]/30 bg-[var(--warn-soft)] px-4 py-3 text-sm text-[var(--warn)]">
            <p className="font-medium">One-time database setup needed</p>
            <p className="mt-1">
              Run <code className="font-data">010_campaigns.sql</code> in your Supabase SQL Editor,
              then refresh this page.
            </p>
          </div>
        )}

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

        {ready && campaigns.length === 0 && (
          <div className={cardClass}>
            <h2 className="text-sm font-semibold text-[var(--ink)]">No campaigns yet</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Start with a nurture campaign so every new enquiry gets followed up, then add a
              reactivation campaign for the leads that went cold.
            </p>
            <Link
              href="/admin/campaigns/new"
              className="mt-4 inline-block rounded-lg bg-[var(--teal)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--teal-deep)]"
            >
              Create the first one
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const c = counts.get(campaign.id) ?? { active: 0, completed: 0, replied: 0, stopped: 0 };
            return (
              <Link
                key={campaign.id}
                href={`/admin/campaigns/${campaign.id}`}
                className={`${cardClass} block hover:border-[var(--teal)]`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-[var(--ink)]">{campaign.name}</div>
                    <div className="text-xs text-[var(--muted)]">{KIND_LABEL[campaign.kind]}</div>
                  </div>
                  <StatusPill status={campaign.status} />
                </div>
                <dl className="mt-4 grid grid-cols-4 gap-3 text-center">
                  {[
                    ["In sequence", c.active],
                    ["Replied", c.replied],
                    ["Finished", c.completed],
                    ["Messages sent", sent.get(campaign.id) ?? 0],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <dd className="font-display text-xl text-[var(--ink)]">{value}</dd>
                      <dt className="text-xs text-[var(--muted)]">{label}</dt>
                    </div>
                  ))}
                </dl>
              </Link>
            );
          })}
        </div>

        <div className={cardClass}>
          <h2 className="text-sm font-semibold text-[var(--ink)]">How campaigns behave</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-[var(--muted)]">
            <li>
              <strong className="text-[var(--ink)]">Nurture:</strong> {KIND_BLURB.nurture}
            </li>
            <li>
              <strong className="text-[var(--ink)]">Reactivation:</strong> {KIND_BLURB.reactivation}
            </li>
            <li>
              Messages only go out {SEND_WINDOW_LABEL}, and never beyond each campaign&apos;s daily limit.
            </li>
            <li>
              The moment someone replies, books in, or your team messages them, their sequence stops.
            </li>
            <li>
              Every message ends with a way to opt out. A STOP reply on WhatsApp or Instagram is picked
              up automatically; for email, switch the patient&apos;s opt-out on from their record.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
