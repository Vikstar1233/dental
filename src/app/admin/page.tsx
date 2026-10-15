import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { createClient } from "@/lib/supabase/server";

// Interim landing page. This becomes the pipeline Kanban board
// (/admin/pipeline, build order step 9) once that's built.
export default async function AdminHomePage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ count: patientCount }, { count: doctorCount }, { count: newLeadCount }] =
    await Promise.all([
      supabase.from("patients").select("id", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "doctor")
        .eq("active", true),
      supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("stage", "new_lead"),
    ]);

  const stats = [
    { label: "Patients", value: patientCount ?? 0, href: "/admin/patients" },
    { label: "Active doctors", value: doctorCount ?? 0, href: "/admin/doctors" },
    { label: "New leads", value: newLeadCount ?? 0, href: "/admin/patients" },
  ];

  return (
    <div className="px-10 py-10">
      <div className="mx-auto max-w-3xl space-y-10">
        <div>
          <h1 className="font-display text-3xl text-[var(--ink)]">
            Good to see you.
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Here&apos;s where things stand across the practice.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm transition-colors hover:border-[var(--teal)]"
            >
              <p className="font-data text-3xl text-[var(--ink)]">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">{stat.label}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Link
            href="/admin/patients/new"
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm transition-colors hover:border-[var(--teal)]"
          >
            <p className="font-medium text-[var(--ink)]">Add a patient</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Log a phone or walk-in enquiry
            </p>
          </Link>
          <Link
            href="/admin/doctors"
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm transition-colors hover:border-[var(--teal)]"
          >
            <p className="font-medium text-[var(--ink)]">Add a doctor</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Create a login for a new clinician
            </p>
          </Link>
          <Link
            href="/admin/integrations"
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm transition-colors hover:border-[var(--teal)]"
          >
            <p className="font-medium text-[var(--ink)]">Connect a channel</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Meta lead forms, WhatsApp, and more
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
