import Link from "next/link";
import { getProfile } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";
import { MessageThread } from "@/components/patient/message-thread";
import { STAGE_LABEL } from "@/lib/stages";

type MessageRow = {
  id: string;
  patient_id: string;
  direction: string;
  channel: string;
  body: string;
  status: string;
  created_at: string;
};

export default async function DoctorConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string; error?: string }>;
}) {
  await getProfile();
  const { patient: selectedPatientId, error } = await searchParams;
  const supabase = await createClient();

  // RLS already restricts this to messages for this doctor's own
  // patients -- no filtering needed here.
  const { data: messages } = await supabase
    .from("messages")
    .select("id, patient_id, direction, channel, body, status, created_at")
    .order("created_at", { ascending: false });

  const rows = (messages ?? []) as MessageRow[];

  const latestByPatient = new Map<string, MessageRow>();
  for (const row of rows) {
    if (!latestByPatient.has(row.patient_id)) {
      latestByPatient.set(row.patient_id, row);
    }
  }

  const patientIds = Array.from(latestByPatient.keys());
  const { data: patients } = patientIds.length
    ? await supabase
        .from("patient_safe")
        .select("id, first_name, stage")
        .in("id", patientIds)
    : { data: [] };

  const patientById = new Map((patients ?? []).map((p) => [p.id, p]));

  const conversations = Array.from(latestByPatient.values()).filter((c) =>
    patientById.has(c.patient_id),
  );

  const activePatientId = selectedPatientId ?? conversations[0]?.patient_id;
  const activeMessages = activePatientId
    ? rows.filter((r) => r.patient_id === activePatientId).reverse()
    : [];
  const activePatient = activePatientId ? patientById.get(activePatientId) : null;

  return (
    <div className="px-10 py-10">
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-[var(--ink)]">
          Conversations
        </h1>

        {error && (
          <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-[280px_1fr] gap-4">
          <div className="max-h-[70vh] space-y-1 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-sm">
            {conversations.map((c) => {
              const patient = patientById.get(c.patient_id);
              return (
                <Link
                  key={c.patient_id}
                  href={`/doctor/conversations?patient=${c.patient_id}`}
                  className={`block rounded-lg px-3 py-2 text-sm ${
                    c.patient_id === activePatientId
                      ? "bg-[var(--teal-soft)]"
                      : "hover:bg-[var(--porcelain)]"
                  }`}
                >
                  <p className="font-medium text-[var(--ink)]">
                    {patient?.first_name}
                  </p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {c.body}
                  </p>
                  <p className="mt-0.5 font-data text-[10px] text-[var(--muted)]">
                    {patient ? STAGE_LABEL[patient.stage] ?? patient.stage : ""}{" "}
                    &middot; {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </Link>
              );
            })}
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
                    {activePatient.first_name}
                  </h2>
                  <Link
                    href={`/doctor/patients/${activePatientId}`}
                    className="text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]"
                  >
                    View patient &rarr;
                  </Link>
                </div>
                <MessageThread
                  patientId={activePatientId}
                  messages={activeMessages}
                  redirectTo={`/doctor/conversations?patient=${activePatientId}`}
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
