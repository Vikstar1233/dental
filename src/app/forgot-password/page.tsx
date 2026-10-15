import Link from "next/link";
import { requestPasswordReset } from "./actions";
import { ArchPattern } from "@/components/ui/arch-pattern";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

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
              Reset your password
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              We&apos;ll email you a link to choose a new one.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}

          {sent ? (
            <div className="rounded-lg border border-[var(--teal)]/30 bg-[var(--teal-soft)] px-3 py-2.5 text-sm text-[var(--teal-deep)]">
              If that email has an account, a reset link is on its way. It
              expires after a short while, so use it soon.
            </div>
          ) : (
            <form action={requestPasswordReset} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[var(--ink)]"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="mt-1 block w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-[var(--teal)] px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--teal-deep)]"
              >
                Send reset link
              </button>
            </form>
          )}

          <p className="text-center text-sm">
            <Link
              href="/login"
              className="font-medium text-[var(--teal)] hover:text-[var(--teal-deep)]"
            >
              &larr; Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
