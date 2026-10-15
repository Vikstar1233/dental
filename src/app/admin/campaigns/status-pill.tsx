const STYLE: Record<string, string> = {
  active: "bg-[var(--teal-soft)] text-[var(--teal-deep)]",
  paused: "bg-[var(--warn-soft)] text-[var(--warn)]",
  draft: "bg-[var(--porcelain)] text-[var(--muted)]",
};

const LABEL: Record<string, string> = {
  active: "Running",
  paused: "Paused",
  draft: "Draft",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE[status] ?? STYLE.draft}`}
    >
      {LABEL[status] ?? status}
    </span>
  );
}
