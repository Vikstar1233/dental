import { getProfile } from "@/lib/get-profile";
import { changePassword } from "@/lib/actions/account";

const inputClass =
  "mt-1 block w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none";
const labelClass = "block text-sm font-medium text-[var(--ink)]";

export async function AccountSettings({
  redirectTo,
  error,
  success,
}: {
  redirectTo: string;
  error?: string;
  success?: string;
}) {
  const profile = await getProfile();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-display text-2xl text-[var(--ink)]">My account</h1>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
        <p className="text-sm text-[var(--muted)]">Signed in as</p>
        <p className="font-medium text-[var(--ink)]">{profile.email}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-2.5 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-[var(--teal)]/30 bg-[var(--teal-soft)] px-4 py-2.5 text-sm text-[var(--teal-deep)]">
          Password changed. We&apos;ve sent a confirmation to your email.
        </div>
      )}

      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--ink)]">
          Change password
        </h2>
        <form action={changePassword} className="mt-4 space-y-4">
          <input type="hidden" name="redirect_to" value={redirectTo} />
          <div>
            <label className={labelClass}>Current password</label>
            <input
              name="current_password"
              type="password"
              required
              autoComplete="current-password"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>New password</label>
            <input
              name="new_password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Confirm new password</label>
            <input
              name="confirm_password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--teal)] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--teal-deep)]"
          >
            Change password
          </button>
        </form>
      </div>
    </div>
  );
}
