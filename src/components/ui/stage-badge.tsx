import { STAGE_LABEL } from "@/lib/stages";

// Modeled on how a dental chart marks a tooth's condition at each
// position: a small dot carries the state, filled in once treatment is
// actually underway rather than just discussed.
const STAGE_STYLE: Record<string, { dot: string; fill: boolean; text: string }> = {
  new_lead: { dot: "var(--muted)", fill: false, text: "text-[var(--muted)]" },
  contacted: { dot: "var(--teal)", fill: false, text: "text-[var(--ink)]" },
  consultation_booked: { dot: "var(--teal)", fill: true, text: "text-[var(--ink)]" },
  consultation_attended: { dot: "var(--teal-deep)", fill: true, text: "text-[var(--ink)]" },
  treatment_booked: { dot: "var(--coral)", fill: true, text: "text-[var(--ink)]" },
  closed_lost: { dot: "var(--muted)", fill: true, text: "text-[var(--muted)] line-through" },
};

export function StageBadge({ stage }: { stage: string }) {
  const style = STAGE_STYLE[stage] ?? STAGE_STYLE.new_lead;
  return (
    <span className={`inline-flex items-center gap-2 text-sm ${style.text}`}>
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{
          backgroundColor: style.fill ? style.dot : "transparent",
          border: `1.5px solid ${style.dot}`,
        }}
      />
      {STAGE_LABEL[stage] ?? stage}
    </span>
  );
}
