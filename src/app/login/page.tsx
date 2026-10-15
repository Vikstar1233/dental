import Link from "next/link";
import { login } from "./actions";
import { ArchPattern } from "@/components/ui/arch-pattern";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;

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
              Sign in
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Use the details your practice gave you.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-[var(--teal)]/30 bg-[var(--teal-soft)] px-3 py-2 text-sm text-[var(--teal-deep)]">
              {success}
            </div>
          )}

          <form action={login} className="space-y-4">
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

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[var(--ink)]"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-[var(--teal)] hover:text-[var(--teal-deep)]"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="mt-1 block w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--teal)] px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--teal-deep)]"
            >
              Sign in
            </button>
          </form>
        </div>

        <div className="text-center">
          <Link
            href="/demo"
            className="inline-block rounded-full border border-white/25 px-5 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
          >
            View demo
          </Link>
          <p className="mt-2 text-xs text-white/45">
            Explore the portal with sample data. No login needed.
          </p>
        </div>
      </div>
    </div>
  );
}
