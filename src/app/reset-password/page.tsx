import { getProfile } from "@/lib/get-profile";
import { setNewPassword } from "./actions";
import { ArchPattern } from "@/components/ui/arch-pattern";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Requires the session the emailed link just established -- if there
  // isn't one (link already used, expired, or opened directly), this
  // bounces to /login same as any other protected-ish page.
  const profile = await getProfile();
  const { error } = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--teal-deep)] px-4">
      <ArchPattern className="pointer-events-none absolute inset-x-0 top-0 h-[420px] w-full text-white/[0.06]" />

      <div className="relative w-full max-w-sm space-y-8">
        <div className="text-center">
          <p className="font-display text-3xl italic text-white">Fernwell</p>
          <p className="mt-1 text-sm text-white/50">Patient portal</p>
        </div>

        <div className="space-y-6 rounded-2xl bg-[var(--surface)] p-8 shadow-xl">
          <div>
            <h1 className="font-display text-xl text-[var(--ink)]">
              Choose a new password
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              For {profile.email}
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}

          <form action={setNewPassword} className="space-y-4">
            <div>
              <label
                htmlFor="new_password"
                className="block text-sm font-medium text-[var(--ink)]"
              >
                New password
              </label>
              <input
                id="new_password"
                name="new_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1 block w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="confirm_password"
                className="block text-sm font-medium text-[var(--ink)]"
              >
                Confirm new password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1 block w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--teal)] px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--teal-deep)]"
            >
              Set new password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
