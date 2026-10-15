import Link from "next/link";
import { StageBadge } from "@/components/ui/stage-badge";
import { SOURCE_LABEL, STAGES } from "@/lib/stages";
import {
  NURTURE_STEPS,
  REACTIVATION_STEPS,
  describeDelay,
  renderTemplate,
} from "@/lib/campaigns/shared";
import {
  DEMO_CAMPAIGNS,
  DEMO_DOCTORS,
  DEMO_DOCTOR_ID,
  DEMO_PATIENTS,
  DEMO_THREADS,
  type DemoCampaign,
} from "@/lib/demo-data";

// A public walkthrough of the whole portal with made-up data. It never
// touches the database and needs no login, so it's safe to show anyone.

export const metadata = { title: "Demo | Fernwell patient portal" };

const cardClass = "rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm";
const SAMPLE = { practice: "Fernwell Dental", sender: "Sarah" };

type Role = "admin" | "doctor";

const ADMIN_NAV = [
  ["overview", "Overview"],
  ["pipeline", "Pipeline"],
  ["patients", "Patients"],
  ["conversations", "Conversations"],
  ["campaigns", "Campaigns"],
] as const;

const DOCTOR_NAV = [
  ["patients", "My patients"],
  ["conversations", "Conversations"],
] as const;

function doctorName(id: string | null) {
  return DEMO_DOCTORS.find((d) => d.id === id)?.name ?? "Unassigned";
}

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string; view?: string; c?: string; p?: string }>;
}) {
  const params = await searchParams;
  const role: Role = params.as === "doctor" ? "doctor" : "admin";
  const nav = role === "doctor" ? DOCTOR_NAV : ADMIN_NAV;

  const allowed = nav.map(([key]) => key as string);
  const view = params.view && allowed.includes(params.view) ? params.view : nav[0][0];
  const campaignId = params.c;

  const to = (v: string, extra = "") => `/demo?as=${role}&view=${v}${extra}`;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--coral)] px-6 py-2 text-sm text-white">
        <span>
          <strong>Demo.</strong> Sample patients and messages only &mdash; nothing here is real, and nothing you
          click is saved.
        </span>
        <span className="flex items-center gap-3">
          <span className="flex overflow-hidden rounded-full border border-white/40 text-xs font-medium">
            <Link
              href={`/demo?as=admin`}
              className={`px-3 py-1 ${role === "admin" ? "bg-white text-[var(--coral)]" : "hover:bg-white/15"}`}
            >
              Practice owner
            </Link>
            <Link
              href={`/demo?as=doctor`}
              className={`px-3 py-1 ${role === "doctor" ? "bg-white text-[var(--coral)]" : "hover:bg-white/15"}`}
            >
              Doctor
            </Link>
          </span>
          <Link href="/login" className="font-medium underline">
            Sign in
          </Link>
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-60 flex-none flex-col bg-[var(--teal-deep)] px-5 py-6 text-white/90">
          <div className="mb-8">
            <p className="font-display text-xl italic text-white">Fernwell</p>
            <p className="text-xs tracking-wide text-white/50">Patient portal</p>
          </div>
          <nav className="flex-1 space-y-1">
            {nav.map(([key, label]) => (
              <Link
                key={key}
                href={to(key)}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  view === key
                    ? "bg-white/95 text-[var(--teal-deep)]"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 border-t border-white/10 pt-4">
            <p className="truncate text-sm text-white/90">
              {role === "admin" ? "owner@fernwell.example" : "amelia@fernwell.example"}
            </p>
            <p className="text-xs uppercase tracking-wide text-white/45">
              {role === "admin" ? "Admin" : "Doctor"} &middot; Demo
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-10 py-10">
          <div className="mx-auto max-w-5xl space-y-6">
            {view === "overview" && <Overview to={to} />}
            {view === "pipeline" && <Pipeline />}
            {view === "patients" && <Patients role={role} />}
            {view === "conversations" && <Conversations role={role} to={to} selected={params.p} />}
            {view === "campaigns" && !campaignId && <Campaigns to={to} />}
            {view === "campaigns" && campaignId && <CampaignDetail id={campaignId} to={to} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function Title({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl text-[var(--ink)]">{title}</h1>
      {sub && <p className="text-sm text-[var(--muted)]">{sub}</p>}
    </div>
  );
}

function Overview({ to }: { to: (v: string, extra?: string) => string }) {
  const count = (stage: string) => DEMO_PATIENTS.filter((p) => p.stage === stage).length;
  const unassigned = DEMO_PATIENTS.filter((p) => !p.doctor && p.stage !== "closed_lost");

  return (
    <>
      <Title title="Overview" sub="Every enquiry in one place, from ad click to booked treatment." />

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["New leads", count("new_lead")],
          ["Contacted", count("contacted")],
          ["Consultations", count("consultation_booked") + count("consultation_attended")],
          ["Treatment booked", count("treatment_booked")],
        ].map(([label, value]) => (
          <div key={label as string} className={cardClass}>
            <div className="font-display text-3xl text-[var(--ink)]">{value}</div>
            <div className="text-xs text-[var(--muted)]">{label}</div>
          </div>
        ))}
      </div>

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Waiting to be assigned</h2>
        <ul className="space-y-2">
          {unassigned.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            >
              <span className="text-[var(--ink)]">
                {p.first} {p.last}{" "}
                <span className="text-xs text-[var(--muted)]">via {SOURCE_LABEL[p.source]}</span>
              </span>
              <span className="text-xs text-[var(--muted)]">{p.lastActivity}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {DEMO_CAMPAIGNS.map((c) => (
          <Link
            key={c.id}
            href={to("campaigns", `&c=${c.id}`)}
            className={`${cardClass} block hover:border-[var(--teal)]`}
          >
            <div className="text-xs capitalize text-[var(--muted)]">{c.kind} campaign</div>
            <div className="font-medium text-[var(--ink)]">{c.name}</div>
            <div className="mt-3 text-sm text-[var(--muted)]">
              <strong className="text-[var(--ink)]">{c.stats.replied}</strong> replies from{" "}
              <strong className="text-[var(--ink)]">{c.stats.sent}</strong> messages
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

function Pipeline() {
  return (
    <>
      <Title title="Pipeline" sub="Drag-and-drop in the real portal. Here it's read-only." />
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => {
          const patients = DEMO_PATIENTS.filter((p) => p.stage === stage);
          return (
            <div key={stage} className="w-52 flex-none rounded-xl bg-[var(--porcelain)] p-3">
              <div className="mb-3 flex items-center justify-between">
                <StageBadge stage={stage} />
                <span className="text-xs text-[var(--muted)]">{patients.length}</span>
              </div>
              <div className="space-y-2">
                {patients.map((p) => (
                  <div key={p.id} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
                    <div className="text-sm font-medium text-[var(--ink)]">
                      {p.first} {p.last}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      {SOURCE_LABEL[p.source]} &middot; {doctorName(p.doctor)}
                    </div>
                    {p.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-[var(--coral-soft)] px-2 py-0.5 text-xs text-[var(--coral)]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Patients({ role }: { role: Role }) {
  const patients =
    role === "doctor" ? DEMO_PATIENTS.filter((p) => p.doctor === DEMO_DOCTOR_ID) : DEMO_PATIENTS;

  return (
    <>
      <Title
        title={role === "doctor" ? "My patients" : "Patients"}
        sub={role === "doctor" ? `${patients.length} assigned to you` : `${patients.length} on file`}
      />

      {role === "doctor" && (
        <div className="rounded-lg border border-[var(--teal)]/30 bg-[var(--teal-soft)] px-4 py-3 text-sm text-[var(--teal-deep)]">
          Doctors see first names, stage, notes, photos and messages only. Phone numbers, email addresses
          and Instagram handles are never sent to a doctor&apos;s browser &mdash; the database itself
          refuses to hand them over, not just the screen.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--line)] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              {role === "admin" && <th className="px-5 py-3 font-medium">Contact</th>}
              {role === "admin" && <th className="px-5 py-3 font-medium">Source</th>}
              <th className="px-5 py-3 font-medium">Stage</th>
              {role === "admin" && <th className="px-5 py-3 font-medium">Assigned to</th>}
              <th className="px-5 py-3 font-medium">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id} className="border-b border-[var(--line)] last:border-0">
                <td className="px-5 py-3 font-medium text-[var(--ink)]">
                  {role === "doctor" ? p.first : `${p.first} ${p.last}`}
                </td>
                {role === "admin" && (
                  <td className="px-5 py-3 font-data text-xs text-[var(--muted)]">
                    <div>{p.phone}</div>
                    <div>{p.email}</div>
                  </td>
                )}
                {role === "admin" && (
                  <td className="px-5 py-3 text-[var(--muted)]">{SOURCE_LABEL[p.source]}</td>
                )}
                <td className="px-5 py-3">
                  <StageBadge stage={p.stage} />
                </td>
                {role === "admin" && (
                  <td className="px-5 py-3 text-[var(--muted)]">{doctorName(p.doctor)}</td>
                )}
                <td className="px-5 py-3 font-data text-xs text-[var(--muted)]">{p.lastActivity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Conversations({
  role,
  to,
  selected,
}: {
  role: Role;
  to: (v: string, extra?: string) => string;
  selected?: string;
}) {
  const visible = DEMO_PATIENTS.filter(
    (p) => DEMO_THREADS[p.id] && (role === "admin" || p.doctor === DEMO_DOCTOR_ID),
  );
  const current = visible.find((p) => p.id === selected) ?? visible[0];
  const thread = current ? DEMO_THREADS[current.id] : [];

  return (
    <>
      <Title
        title="Conversations"
        sub="Every message, on every channel, in one thread per patient."
      />
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="space-y-2">
          {visible.map((p) => {
            const last = DEMO_THREADS[p.id].at(-1);
            return (
              <Link
                key={p.id}
                href={to("conversations", `&p=${p.id}`)}
                className={`block rounded-xl border p-3 ${
                  current?.id === p.id
                    ? "border-[var(--teal)] bg-[var(--teal-soft)]"
                    : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--teal)]"
                }`}
              >
                <div className="text-sm font-medium text-[var(--ink)]">
                  {role === "doctor" ? p.first : `${p.first} ${p.last}`}
                </div>
                <div className="mt-0.5 truncate text-xs text-[var(--muted)]">{last?.body}</div>
              </Link>
            );
          })}
        </div>

        {current && (
          <div className={cardClass}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--ink)]">
                {role === "doctor" ? current.first : `${current.first} ${current.last}`}
              </h2>
              <StageBadge stage={current.stage} />
            </div>
            <div className="space-y-2">
              {thread.map((m, i) => (
                <div
                  key={i}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    m.dir === "in"
                      ? "border-[var(--line)] bg-[var(--porcelain)]"
                      : "border-[var(--teal-soft)] bg-[var(--teal-soft)]/40"
                  }`}
                >
                  <div className="flex justify-between font-data text-xs text-[var(--muted)]">
                    <span className="capitalize">
                      {m.channel} &middot; {m.dir === "in" ? "inbound" : "outbound"}
                      {m.campaign && (
                        <span className="ml-2 rounded-full bg-[var(--coral-soft)] px-2 py-0.5 text-[var(--coral)]">
                          {m.campaign}
                        </span>
                      )}
                    </span>
                    <span>{m.when}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[var(--ink)]">{m.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                disabled
                placeholder="Replying is switched off in the demo"
                className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--porcelain)] px-3 py-2 text-sm"
              />
              <button disabled className="rounded-lg bg-[var(--teal)] px-4 py-2 text-sm text-white opacity-50">
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Campaigns({ to }: { to: (v: string, extra?: string) => string }) {
  return (
    <>
      <Title
        title="Campaigns"
        sub="Automatic follow-up for new enquiries, and win-back messages for people who went quiet."
      />
      <div className="space-y-3">
        {DEMO_CAMPAIGNS.map((c) => (
          <Link
            key={c.id}
            href={to("campaigns", `&c=${c.id}`)}
            className={`${cardClass} block hover:border-[var(--teal)]`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-[var(--ink)]">{c.name}</div>
                <div className="text-xs capitalize text-[var(--muted)]">{c.kind}</div>
              </div>
              <span className="rounded-full bg-[var(--teal-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--teal-deep)]">
                {c.status}
              </span>
            </div>
            <Stats campaign={c} />
          </Link>
        ))}
      </div>
    </>
  );
}

function Stats({ campaign }: { campaign: DemoCampaign }) {
  const s = campaign.stats;
  return (
    <dl className="mt-4 grid grid-cols-4 gap-3 text-center">
      {[
        ["In sequence", s.inSequence],
        ["Replied", s.replied],
        ["Finished", s.finished],
        ["Messages sent", s.sent],
      ].map(([label, value]) => (
        <div key={label as string}>
          <dd className="font-display text-xl text-[var(--ink)]">{value}</dd>
          <dt className="text-xs text-[var(--muted)]">{label}</dt>
        </div>
      ))}
    </dl>
  );
}

function CampaignDetail({
  id,
  to,
}: {
  id: string;
  to: (v: string, extra?: string) => string;
}) {
  const campaign = DEMO_CAMPAIGNS.find((c) => c.id === id) ?? DEMO_CAMPAIGNS[0];
  const steps = campaign.kind === "nurture" ? NURTURE_STEPS : REACTIVATION_STEPS;

  const timed = steps.map((step, i) => ({
    ...step,
    day: Math.floor(steps.slice(0, i + 1).reduce((sum, s) => sum + s.delay_hours, 0) / 24) + 1,
  }));

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl text-[var(--ink)]">{campaign.name}</h1>
            <span className="rounded-full bg-[var(--teal-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--teal-deep)]">
              {campaign.status}
            </span>
          </div>
          <p className="text-sm capitalize text-[var(--muted)]">{campaign.kind} campaign</p>
        </div>
        <Link href={to("campaigns")} className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]">
          &larr; Back to campaigns
        </Link>
      </div>

      <div className={cardClass}>
        <Stats campaign={campaign} />
        <ul className="mt-4 space-y-1 border-t border-[var(--line)] pt-4 text-sm text-[var(--muted)]">
          <li>
            <strong className="text-[var(--ink)]">Who it&apos;s for:</strong> {campaign.audience}
          </li>
          {campaign.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
          <li>
            Stops automatically when someone replies, books in, or your team messages them. STOP replies
            opt people out of every campaign.
          </li>
        </ul>
      </div>

      <div className={cardClass}>
        <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">The messages</h2>
        <div className="space-y-3">
          {timed.map((step, i) => (
            <div key={i} className="rounded-lg border border-[var(--line)] p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--ink)]">Message {i + 1}</span>
                <span className="text-[var(--muted)]">
                  {describeDelay(step.delay_hours)}
                  {i > 0 && ` · about day ${step.day}`} &middot; {step.channel === "auto" ? "chat or email" : step.channel}
                </span>
              </div>
              {step.subject && (
                <div className="mt-2 text-sm font-medium text-[var(--ink)]">
                  Subject: {renderTemplate(step.subject, { first_name: "Priya", ...SAMPLE })}
                </div>
              )}
              <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted)]">
                {renderTemplate(step.body, { first_name: "Priya", ...SAMPLE })}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Recent activity</h2>
        <table className="w-full text-left text-sm">
          <tbody>
            {campaign.events.map((e, i) => (
              <tr key={i} className="border-b border-[var(--line)] last:border-0">
                <td className="py-2 pr-3 text-[var(--ink)]">{e.who}</td>
                <td className="py-2 pr-3 text-xs text-[var(--muted)]">
                  Message {e.step} &middot; {e.channel}
                </td>
                <td
                  className={`py-2 pr-3 text-xs font-medium capitalize ${
                    e.status === "sent"
                      ? "text-[var(--teal)]"
                      : e.status === "failed"
                        ? "text-[var(--danger)]"
                        : "text-[var(--muted)]"
                  }`}
                >
                  {e.status}
                </td>
                <td className="py-2 pr-3 text-xs text-[var(--muted)]">{e.detail}</td>
                <td className="py-2 font-data text-xs text-[var(--muted)]">{e.when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
