import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { createCampaign } from "@/lib/actions/campaigns";
import { KIND_BLURB, KIND_LABEL, type CampaignKind } from "@/lib/campaigns/shared";

const inputClass =
  "mt-1 block w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none";
const labelClass = "block text-xs text-[var(--muted)]";

const KINDS: CampaignKind[] = ["nurture", "reactivation"];

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;

  return (
    <div className="px-10 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-[var(--ink)]">New campaign</h1>
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

        <form
          action={createCampaign}
          className="space-y-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm"
        >
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-[var(--ink)]">Type</legend>
            {KINDS.map((kind, i) => (
              <label
                key={kind}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--line)] p-3 has-[:checked]:border-[var(--teal)] has-[:checked]:bg-[var(--teal-soft)]"
              >
                <input type="radio" name="kind" value={kind} defaultChecked={i === 0} className="mt-1" />
                <span>
                  <span className="block text-sm font-medium text-[var(--ink)]">{KIND_LABEL[kind]}</span>
                  <span className="block text-xs text-[var(--muted)]">{KIND_BLURB[kind]}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div>
            <label className={labelClass}>Campaign name</label>
            <input
              name="name"
              type="text"
              required
              placeholder="e.g. New enquiry follow-up"
              className={inputClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Practice name (used in messages)</label>
              <input name="practice_name" type="text" placeholder="e.g. Fernwell Dental" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Messages are signed by</label>
              <input name="sender_name" type="text" placeholder="e.g. Sarah" className={inputClass} />
              <p className="mt-1 text-xs text-[var(--muted)]">
                A real first name reads like a person, not a campaign.
              </p>
            </div>
          </div>

          <p className="text-xs text-[var(--muted)]">
            You&apos;ll start with a ready-written sequence you can edit. Nothing is sent until you switch
            the campaign on.
          </p>

          <button
            type="submit"
            className="rounded-lg bg-[var(--teal)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--teal-deep)]"
          >
            Create campaign
          </button>
        </form>
      </div>
    </div>
  );
}
