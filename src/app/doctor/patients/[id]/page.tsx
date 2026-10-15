import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";
import { getPhotoUrls } from "@/lib/get-photo-urls";
import { NotesPanel } from "@/components/patient/notes-panel";
import { PhotosPanel } from "@/components/patient/photos-panel";
import { MessageThread } from "@/components/patient/message-thread";
import { StageBadge } from "@/components/ui/stage-badge";

const cardClass =
  "rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm";

export default async function DoctorPatientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await getProfile();
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const redirectTo = `/doctor/patients/${id}`;

  // patient_safe's row filter means this returns nothing (not a
  // permission error) for a patient not assigned to this doctor.
  const { data: patient } = await supabase
    .from("patient_safe")
    .select("id, first_name, stage, created_at")
    .eq("id", id)
    .single();

  if (!patient) {
    notFound();
  }

  const [{ data: notes }, { data: photos }, { data: messages }] =
    await Promise.all([
      supabase
        .from("notes")
        .select("id, body, created_at")
        .eq("patient_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("photos")
        .select("id, storage_path, caption")
        .eq("patient_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("messages")
        .select("id, direction, channel, body, status, created_at")
        .eq("patient_id", id)
        .order("created_at", { ascending: true }),
    ]);

  const photoUrls = await getPhotoUrls(
    supabase,
    (photos ?? []).map((p) => p.storage_path),
  );

  const daysSinceContact = Math.floor(
    (Date.now() - new Date(patient.created_at).getTime()) / 86_400_000,
  );

  return (
    <div className="px-8 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl text-[var(--ink)]">
            {patient.first_name}
          </h1>
          <Link
            href="/doctor"
            className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]"
          >
            &larr; My patients
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[200px_1fr_320px]">
          {/* Left: patient info -- nothing beyond first name, stage, days */}
          <div className={`${cardClass} space-y-3`}>
            <div>
              <div className="text-xs text-[var(--muted)]">First name</div>
              <div className="text-sm font-medium text-[var(--ink)]">
                {patient.first_name}
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted)]">Stage</div>
              <div className="mt-1">
                <StageBadge stage={patient.stage} />
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted)]">
                Days since first contact
              </div>
              <div className="font-data text-sm font-medium text-[var(--ink)]">
                {daysSinceContact}
              </div>
            </div>
          </div>

          {/* Centre: conversation */}
          <div className={cardClass}>
            <MessageThread
              patientId={id}
              messages={messages ?? []}
              redirectTo={redirectTo}
            />
          </div>

          {/* Right: notes and photos */}
          <div className="space-y-4">
            <div className={cardClass}>
              <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">
                Notes
              </h2>
              <NotesPanel
                patientId={id}
                notes={notes ?? []}
                redirectTo={redirectTo}
              />
            </div>
            <div className={cardClass}>
              <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">
                Photos
              </h2>
              <PhotosPanel
                patientId={id}
                photos={photos ?? []}
                photoUrls={photoUrls}
                redirectTo={redirectTo}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
