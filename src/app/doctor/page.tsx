import Link from "next/link";
import { getProfile } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";
import { StageBadge } from "@/components/ui/stage-badge";

export default async function DoctorHomePage() {
  await getProfile();
  const supabase = await createClient();

  const { data: patients } = await supabase
    .from("patient_safe")
    .select("id, first_name, stage, last_contact_at")
    .order("last_contact_at", { ascending: false, nullsFirst: false });

  return (
    <div className="px-10 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-display text-2xl text-[var(--ink)]">
          My patients
        </h1>

        <div className="space-y-3">
          {patients?.map((patient) => (
            <Link
              key={patient.id}
              href={`/doctor/patients/${patient.id}`}
              className="block rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm transition-colors hover:border-[var(--teal)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-[var(--ink)]">
                  {patient.first_name}
                </span>
                <StageBadge stage={patient.stage} />
              </div>
              {patient.last_contact_at && (
                <p className="mt-1 font-data text-xs text-[var(--muted)]">
                  Last contact{" "}
                  {new Date(patient.last_contact_at).toLocaleString()}
                </p>
              )}
            </Link>
          ))}
          {patients?.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              No patients assigned to you yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
