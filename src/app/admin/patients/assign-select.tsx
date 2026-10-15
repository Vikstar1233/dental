"use client";

type Doctor = { id: string; full_name: string; email: string };

export function AssignSelect({
  patientId,
  doctors,
  currentDoctorId,
  action,
}: {
  patientId: string;
  doctors: Doctor[];
  currentDoctorId: string | null;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="patient_id" value={patientId} />
      <select
        name="doctor_id"
        defaultValue={currentDoctorId ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
      >
        <option value="">Unassigned</option>
        {doctors.map((doctor) => (
          <option key={doctor.id} value={doctor.id}>
            {doctor.full_name || doctor.email}
          </option>
        ))}
      </select>
    </form>
  );
}
