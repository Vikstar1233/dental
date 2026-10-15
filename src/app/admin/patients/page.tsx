import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { createClient } from "@/lib/supabase/server";
import { assignPatient } from "@/lib/actions/patients";
import { addFieldDefinition, deleteFieldDefinition } from "@/lib/actions/fields";
import { SOURCE_LABEL } from "@/lib/stages";
import { StageBadge } from "@/components/ui/stage-badge";
import { AssignSelect } from "./assign-select";

export default async function AdminPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const { error, success } = await searchParams;
  const supabase = await createClient();

  const [{ data: patients }, { data: doctors }, { data: fieldDefs }] = await Promise.all([
    supabase
      .from("patients")
      .select(
        "id, first_name, last_name, phone, email, source, stage, assigned_to, tags, created_at, last_contact_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "doctor")
      .order("full_name"),
    supabase
      .from("patient_field_definitions")
      .select("id, key, label")
      .order("created_at"),
  ]);

  return (
    <div className="px-10 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-[var(--ink)]">
              Patients
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {patients?.length ?? 0} on file
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/patients/import"
              className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--porcelain)]"
            >
              Import
            </Link>
            <Link
              href="/admin/patients/new"
              className="rounded-lg bg-[var(--teal)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--teal-deep)]"
            >
              Add patient
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-[var(--teal)]/30 bg-[var(--teal-soft)] px-4 py-2.5 text-sm text-[var(--teal-deep)]">
            Done.
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Stage</th>
                <th className="px-5 py-3 font-medium">Tags</th>
                <th className="px-5 py-3 font-medium">Assigned to</th>
                <th className="px-5 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {patients?.map((patient) => (
                <tr
                  key={patient.id}
                  className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--porcelain)]"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/patients/${patient.id}`}
                      className="font-medium text-[var(--ink)] hover:text-[var(--teal)]"
                    >
                      {patient.first_name} {patient.last_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-data text-xs text-[var(--muted)]">
                    <div>{patient.phone || "—"}</div>
                    <div>{patient.email || "—"}</div>
                  </td>
                  <td className="px-5 py-3 text-[var(--muted)]">
                    {SOURCE_LABEL[patient.source] ?? patient.source}
                  </td>
                  <td className="px-5 py-3">
                    <StageBadge stage={patient.stage} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {patient.tags?.map((tag: string) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[var(--coral-soft)] px-2 py-0.5 text-xs text-[var(--coral)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <AssignSelect
                      patientId={patient.id}
                      doctors={doctors ?? []}
                      currentDoctorId={patient.assigned_to}
                      action={assignPatient}
                    />
                  </td>
                  <td className="px-5 py-3 font-data text-xs text-[var(--muted)]">
                    {new Date(patient.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {patients?.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-[var(--muted)]"
                  >
                    No patients yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--ink)]">
            Custom fields
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Extra fields shown on every patient&apos;s record, in addition to
            the built-in ones.
          </p>

          <div className="mt-4 space-y-2">
            {fieldDefs?.map((field) => (
              <div
                key={field.id}
                className="flex items-center justify-between rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
              >
                <span className="text-[var(--ink)]">{field.label}</span>
                <form action={deleteFieldDefinition}>
                  <input type="hidden" name="id" value={field.id} />
                  <button
                    type="submit"
                    className="text-xs font-medium text-[var(--muted)] hover:text-[var(--danger)]"
                  >
                    Remove
                  </button>
                </form>
              </div>
            ))}
            {fieldDefs?.length === 0 && (
              <p className="text-sm text-[var(--muted)]">
                No custom fields yet.
              </p>
            )}
          </div>

          <form action={addFieldDefinition} className="mt-4 flex gap-2">
            <input
              name="label"
              type="text"
              required
              placeholder="Field name, e.g. Insurance provider"
              className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--porcelain)]"
            >
              Add field
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
