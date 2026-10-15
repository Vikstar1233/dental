"use client";

type Doctor = { id: string; full_name: string; email: string };

export function DoctorFilter({
  doctors,
  currentDoctorId,
}: {
  doctors: Doctor[];
  currentDoctorId: string;
}) {
  return (
    <form>
      <select
        name="doctor"
        defaultValue={currentDoctorId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
      >
        <option value="">All doctors</option>
        {doctors.map((d) => (
          <option key={d.id} value={d.id}>
            {d.full_name || d.email}
          </option>
        ))}
      </select>
    </form>
  );
}
