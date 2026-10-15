import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { createClient } from "@/lib/supabase/server";
import { MessageThread } from "@/components/patient/message-thread";
import { DoctorFilter } from "./doctor-filter";

type MessageRow = {
  id: string;
  patient_id: string;
  direction: string;
  channel: string;
  body: string;
  status: string;
  created_at: string;
  patients: { first_name: string; last_name: string; assigned_to: string | null } | null;
};

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string; doctor?: string; error?: string }>;
}) {
  await requireAdmin();
  const { patient: selectedPatientId, doctor: doctorFilter, error } = await searchParams;
  const supabase = await createClient();

  const [{ data: messages }, { data: doctors }] = await Promise.all([
    supabase
      .from("messages")
      .select(
        "id, patient_id, direction, channel, body, status, created_at, patients(first_name, last_name, assigned_to)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "doctor")
      .order("full_name"),
  ]);

  const rows = (messages ?? []) as unknown as MessageRow[];

  const latestByPatient = new Map<string, MessageRow>();
  for (const row of rows) {
    if (!row.patients) continue;
    if (!latestByPatient.has(row.patient_id)) {
      latestByPatient.set(row.patient_id, row);
    }
  }

  let conversations = Array.from(latestByPatient.values());
  if (doctorFilter) {
    conversations = conversations.filter(
      (c) => c.patients?.assigned_to === doctorFilter,
    );
  }

  const doctorName = (id: string | null | undefined) =>
    doctors?.find((d) => d.id === id)?.full_name || "Unassigned";

  const activePatientId = selectedPatientId ?? conversations[0]?.patient_id;
  const activeMessages = activePatientId
    ? rows.filter((r) => r.patient_id === activePatientId).reverse()
    : [];
  const activePatient = activePatientId
    ? latestByPatient.get(activePatientId)?.patients
    : null;

  return (
    <div className="px-10 py-10">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-[var(--ink)]">
            Conversations
          </h1>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--muted)]">Doctor</label>
            <DoctorFilter doctors={doctors ?? []} currentDoctorId={doctorFilter ?? ""} />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-[280px_1fr] gap-4">
          <div className="max-h-[70vh] space-y-1 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-sm">
            {conversations.map((c) => (
              <Link
                key={c.patient_id}
                href={`/admin/conversations?patient=${c.patient_id}`}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  c.patient_id === activePatientId
                    ? "bg-[var(--teal-soft)]"
                    : "hover:bg-[var(--porcelain)]"
                }`}
              >
                <p className="font-medium text-[var(--ink)]">
                  {c.patients?.first_name} {c.patients?.last_name}
                </p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {c.body}
                </p>
                <p className="mt-0.5 font-data text-[10px] text-[var(--muted)]">
                  {doctorName(c.patients?.assigned_to)} &middot;{" "}
                  {new Date(c.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
            {conversations.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-[var(--muted)]">
                No conversations yet.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
            {activePatientId && activePatient ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-[var(--ink)]">
                    {activePatient.first_name} {activePatient.last_name}
                  </h2>
                  <Link
                    href={`/admin/patients/${activePatientId}`}
                    className="text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]"
                  >
                    View patient record &rarr;
                  </Link>
                </div>
                <MessageThread
                  patientId={activePatientId}
                  messages={activeMessages}
                  redirectTo={`/admin/conversations?patient=${activePatientId}`}
                />
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Select a conversation.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
