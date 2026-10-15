"use client";

import { STAGES, STAGE_LABEL } from "@/lib/stages";

export function StageSelect({
  patientId,
  currentStage,
  action,
}: {
  patientId: string;
  currentStage: string;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="patient_id" value={patientId} />
      <select
        name="stage"
        defaultValue={currentStage}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
      >
        {STAGES.map((stage) => (
          <option key={stage} value={stage}>
            {STAGE_LABEL[stage]}
          </option>
        ))}
      </select>
    </form>
  );
}
