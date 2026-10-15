import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { createClient } from "@/lib/supabase/server";
import { getPhotoUrls } from "@/lib/get-photo-urls";
import {
  assignPatient,
  updateContact,
  updateCustomFields,
  updateDentallyDetails,
  updateStage,
  updateTags,
} from "@/lib/actions/patients";
import { sendToDentally } from "@/lib/actions/dentally";
import { setMarketingOptOut } from "@/lib/actions/campaigns";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIntegration } from "@/lib/integrations/store";
import { CHANNELS, CHANNEL_LABEL } from "@/lib/stages";
import { PatientIdentityFields } from "@/components/duplicate-warning";
import { NotesPanel } from "@/components/patient/notes-panel";
import { PhotosPanel } from "@/components/patient/photos-panel";
import { MessageThread } from "@/components/patient/message-thread";
import { AssignSelect } from "../assign-select";
import { StageSelect } from "../stage-select";

const inputClass =
  "mt-1 block w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none";
const labelClass = "block text-xs text-[var(--muted)]";
const cardClass =
  "rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm";

export default async function AdminPatientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const redirectTo = `/admin/patients/${id}`;

  const { data: patient } = await supabase
    .from("patients")
    .select(
      "id, first_name, last_name, phone, email, instagram_id, preferred_channel, source, stage, assigned_to, tags, custom_fields, title, date_of_birth, gender, ethnicity, address_line_1, postcode, dentally_patient_id, created_at, last_contact_at",
    )
    .eq("id", id)
    .single();

  if (!patient) {
    notFound();
  }

  const [
    { data: doctors },
    { data: notes },
    { data: photos },
    { data: messages },
    { data: fieldDefs },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "doctor")
      .order("full_name"),
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
    supabase
      .from("patient_field_definitions")
      .select("id, key, label")
      .order("created_at"),
  ]);

  const photoUrls = await getPhotoUrls(
    supabase,
    (photos ?? []).map((p) => p.storage_path),
  );

  const customFields = (patient.custom_fields ?? {}) as Record<string, string>;
  const dentally = await getIntegration("dentally");

  // Read separately so the page still loads before the campaigns migration
  // has been run (the column doesn't exist until then).
  const { data: optOutRow, error: optOutError } = await createAdminClient()
    .from("patients")
    .select("marketing_opt_out")
    .eq("id", id)
    .single();
  const optOut = optOutError ? null : !!optOutRow?.marketing_opt_out;

  return (
    <div className="px-10 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-[var(--ink)]">
            {patient.first_name} {patient.last_name}
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

        <div className={cardClass}>
          <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">
            Stage and assignment
          </h2>
          <div className="flex flex-wrap gap-6">
            <div>
              <div className={`${labelClass} mb-1`}>Stage</div>
              <StageSelect
                patientId={id}
                currentStage={patient.stage}
                action={updateStage}
              />
            </div>
            <div>
              <div className={`${labelClass} mb-1`}>Assigned to</div>
              <AssignSelect
                patientId={id}
                doctors={doctors ?? []}
                currentDoctorId={patient.assigned_to}
                action={assignPatient}
              />
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">
            Contact info
          </h2>
          <form action={updateContact} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="patient_id" value={id} />
            <div>
              <label className={labelClass}>First name</label>
              <input
                name="first_name"
                type="text"
                defaultValue={patient.first_name}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Last name</label>
              <input
                name="last_name"
                type="text"
                defaultValue={patient.last_name}
                className={inputClass}
              />
            </div>
            <PatientIdentityFields
              defaultPhone={patient.phone ?? ""}
              defaultEmail={patient.email ?? ""}
              excludePatientId={id}
            />
            <div>
              <label className={labelClass}>Instagram handle</label>
              <input
                name="instagram_id"
                type="text"
                defaultValue={patient.instagram_id ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Preferred contact method</label>
              <select
                name="preferred_channel"
                defaultValue={patient.preferred_channel ?? ""}
                className={inputClass}
              >
                <option value="">No preference</option>
                {CHANNELS.map((channel) => (
                  <option key={channel} value={channel}>
                    {CHANNEL_LABEL[channel]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--porcelain)]"
              >
                Save contact info
              </button>
            </div>
          </form>
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">
            Tags
          </h2>
          <form action={updateTags} className="flex gap-2">
            <input type="hidden" name="patient_id" value={id} />
            <input
              name="tags"
              type="text"
              defaultValue={(patient.tags ?? []).join(", ")}
              placeholder="e.g. nervous patient, invisalign interest"
              className={`${inputClass} mt-0 flex-1`}
            />
            <button
              type="submit"
              className="h-fit rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--porcelain)]"
            >
              Save
            </button>
          </form>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Comma-separated.
          </p>
        </div>

        {optOut !== null && (
          <div className={cardClass}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-[var(--ink)]">
                  Marketing messages
                </h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {optOut
                    ? "Opted out. This patient won't receive any campaign messages, on any channel."
                    : "Eligible for nurture and reactivation campaigns. Switch off if they ask to stop."}
                </p>
              </div>
              <form action={setMarketingOptOut}>
                <input type="hidden" name="patient_id" value={id} />
                <input type="hidden" name="opt_out" value={optOut ? "false" : "true"} />
                <button
                  type="submit"
                  className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--porcelain)]"
                >
                  {optOut ? "Allow messages again" : "Opt out"}
                </button>
              </form>
            </div>
          </div>
        )}

        {dentally?.status === "connected" && (
          <div className={cardClass}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--ink)]">
                Dentally
              </h2>
              {patient.dentally_patient_id ? (
                <span className="text-xs font-medium text-[var(--teal)]">
                  Linked
                </span>
              ) : (
                <form action={sendToDentally}>
                  <input type="hidden" name="patient_id" value={id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-[var(--teal)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--teal-deep)]"
                  >
                    Send to Dentally
                  </button>
                </form>
              )}
            </div>

            {patient.dentally_patient_id ? (
              <p className="text-sm text-[var(--muted)]">
                Dentally patient ID:{" "}
                <span className="font-data">{patient.dentally_patient_id}</span>
              </p>
            ) : (
              <form
                action={updateDentallyDetails}
                className="grid gap-3 sm:grid-cols-3"
              >
                <input type="hidden" name="patient_id" value={id} />
                <div>
                  <label className={labelClass}>Title</label>
                  <input
                    name="title"
                    type="text"
                    placeholder="Mr / Mrs / Dr…"
                    defaultValue={patient.title ?? ""}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Date of birth</label>
                  <input
                    name="date_of_birth"
                    type="date"
                    defaultValue={patient.date_of_birth ?? ""}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Gender</label>
                  <input
                    name="gender"
                    type="text"
                    defaultValue={patient.gender ?? ""}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Ethnicity</label>
                  <input
                    name="ethnicity"
                    type="text"
                    defaultValue={patient.ethnicity ?? ""}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Address</label>
                  <input
                    name="address_line_1"
                    type="text"
                    defaultValue={patient.address_line_1 ?? ""}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Postcode</label>
                  <input
                    name="postcode"
                    type="text"
                    defaultValue={patient.postcode ?? ""}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--porcelain)]"
                  >
                    Save Dentally details
                  </button>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Only needed if this patient doesn&apos;t already exist in
                    Dentally by phone or email -- we check first.
                  </p>
                </div>
              </form>
            )}
          </div>
        )}

        {fieldDefs && fieldDefs.length > 0 && (
          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">
              Custom fields
            </h2>
            <form action={updateCustomFields} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="patient_id" value={id} />
              {fieldDefs.map((field) => (
                <div key={field.id}>
                  <label className={labelClass}>{field.label}</label>
                  <input
                    name={`field_${field.key}`}
                    type="text"
                    defaultValue={customFields[field.key] ?? ""}
                    className={inputClass}
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--porcelain)]"
                >
                  Save custom fields
                </button>
              </div>
            </form>
          </div>
        )}

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">
            Notes
          </h2>
          <NotesPanel patientId={id} notes={notes ?? []} redirectTo={redirectTo} />
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

        <div className={cardClass}>
          <MessageThread
            patientId={id}
            messages={messages ?? []}
            redirectTo={redirectTo}
          />
        </div>
      </div>
    </div>
  );
}
