import { requireAdmin } from "@/lib/require-admin";
import { createClient } from "@/lib/supabase/server";
import {
  createUser,
  deactivateUser,
  reactivateUser,
  reassignPatients,
  updateAircallUserId,
} from "./actions";

const inputClass =
  "mt-1 block w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none";
const labelClass = "block text-sm font-medium text-[var(--ink)]";
const cardClass =
  "rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm";

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const { error, success } = await searchParams;
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, active, aircall_user_id")
    .order("created_at", { ascending: true });

  const doctors = (users ?? []).filter((u) => u.role === "doctor");

  const { data: patients } = await supabase
    .from("patients")
    .select("assigned_to");

  const patientCounts = new Map<string, number>();
  patients?.forEach((p) => {
    if (p.assigned_to) {
      patientCounts.set(p.assigned_to, (patientCounts.get(p.assigned_to) ?? 0) + 1);
    }
  });

  return (
    <div className="px-10 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <h1 className="font-display text-2xl text-[var(--ink)]">Doctors</h1>

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
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Patients</th>
                <th className="px-5 py-3 font-medium">Aircall user ID</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[var(--line)] last:border-0"
                >
                  <td className="px-5 py-3 text-[var(--ink)]">
                    {user.full_name || "—"}
                  </td>
                  <td className="px-5 py-3 text-[var(--ink)]">{user.email}</td>
                  <td className="px-5 py-3 capitalize text-[var(--ink)]">
                    {user.role}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        user.active
                          ? "text-[var(--teal)]"
                          : "text-[var(--muted)]"
                      }
                    >
                      {user.active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-data text-[var(--ink)]">
                    {user.role === "doctor" ? (patientCounts.get(user.id) ?? 0) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {user.role === "doctor" && (
                      <form action={updateAircallUserId} className="flex gap-1">
                        <input type="hidden" name="user_id" value={user.id} />
                        <input
                          name="aircall_user_id"
                          type="text"
                          defaultValue={user.aircall_user_id ?? ""}
                          placeholder="e.g. 123456"
                          className="w-24 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]"
                        >
                          Save
                        </button>
                      </form>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <form
                      action={user.active ? deactivateUser : reactivateUser}
                    >
                      <input type="hidden" name="user_id" value={user.id} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:underline"
                      >
                        {user.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {doctors.length > 1 && (
          <div className={cardClass}>
            <h2 className="text-sm font-semibold text-[var(--ink)]">
              Reassign patients
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Move every patient from one doctor to another — do this before
              deactivating someone.
            </p>
            <form
              action={reassignPatients}
              className="mt-4 flex flex-wrap items-end gap-3"
            >
              <div>
                <label className={labelClass}>From</label>
                <select name="from_doctor_id" className={inputClass}>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.full_name || doctor.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>To</label>
                <select name="to_doctor_id" className={inputClass}>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.full_name || doctor.email}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--porcelain)]"
              >
                Reassign
              </button>
            </form>
          </div>
        )}

        <div className={cardClass}>
          <h2 className="text-sm font-semibold text-[var(--ink)]">Add a user</h2>
          <form action={createUser} className="mt-4 space-y-4">
            <div>
              <label htmlFor="full_name" className={labelClass}>
                Full name
              </label>
              <input id="full_name" name="full_name" type="text" required className={inputClass} />
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input id="email" name="email" type="email" required className={inputClass} />
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>
                Temporary password
              </label>
              <input
                id="password"
                name="password"
                type="text"
                required
                minLength={8}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-[var(--muted)]">
                Share this with the user directly — invite emails aren&apos;t
                wired up yet.
              </p>
            </div>

            <div>
              <label htmlFor="role" className={labelClass}>
                Role
              </label>
              <select id="role" name="role" defaultValue="doctor" className={inputClass}>
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--teal)] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--teal-deep)]"
            >
              Create user
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
