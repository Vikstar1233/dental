import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { createClient } from "@/lib/supabase/server";
import { createPatient } from "@/lib/actions/patients";
import { SOURCES, SOURCE_LABEL, CHANNELS, CHANNEL_LABEL } from "@/lib/stages";
import { PatientIdentityFields } from "@/components/duplicate-warning";

const inputClass =
  "mt-1 block w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none";
const labelClass = "block text-sm font-medium text-[var(--ink)]";

export default async function NewPatientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: doctors } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "doctor")
    .eq("active", true)
    .order("full_name");

  return (
    <div className="px-10 py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-[var(--ink)]">
            Add patient
          </h1>
          <Link
            href="/admin/patients"
            className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]"
          >
            &larr; Back to patients
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-7 shadow-sm">
          <form action={createPatient} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>First name</label>
              <input name="first_name" type="text" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Last name</label>
              <input name="last_name" type="text" className={inputClass} />
            </div>
            <PatientIdentityFields />
            <div>
              <label className={labelClass}>Instagram handle</label>
              <input
                name="instagram_id"
                type="text"
                placeholder="@handle"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Source</label>
              <select name="source" defaultValue="manual" className={inputClass}>
                {SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {SOURCE_LABEL[source]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Preferred way to be contacted</label>
              <select name="preferred_channel" defaultValue="" className={inputClass}>
                <option value="">No preference</option>
                {CHANNELS.map((channel) => (
                  <option key={channel} value={channel}>
                    {CHANNEL_LABEL[channel]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Assign to doctor</label>
              <select name="assigned_to" defaultValue="" className={inputClass}>
                <option value="">Unassigned</option>
                {doctors?.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.full_name || doctor.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Initial note</label>
              <textarea name="initial_note" rows={3} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full rounded-lg bg-[var(--teal)] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--teal-deep)]"
              >
                Add patient
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
