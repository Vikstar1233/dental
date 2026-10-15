"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

export function Sidebar({
  items,
  roleLabel,
  email,
  accountHref,
  logoutAction,
}: {
  items: NavItem[];
  roleLabel: string;
  email: string;
  accountHref: string;
  logoutAction: (formData: FormData) => void;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-none flex-col bg-[var(--teal-deep)] px-5 py-6 text-white/90">
      <div className="mb-8">
        <p className="font-display text-xl italic text-white">Fernwell</p>
        <p className="text-xs tracking-wide text-white/50">Patient portal</p>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const active =
            item.href === "/admin" || item.href === "/doctor"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-white/95 text-[var(--teal-deep)]"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 space-y-3 border-t border-white/10 pt-4">
        <Link href={accountHref} className="block hover:opacity-80">
          <p className="truncate text-sm text-white/90">{email}</p>
          <p className="text-xs uppercase tracking-wide text-white/45">
            {roleLabel} &middot; Account settings
          </p>
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
