// An abstracted dental arch -- the row of dots a chart uses to mark tooth
// positions, laid out along the curve a chart draws them on. Purely
// decorative background texture, not a literal illustration.
export function ArchPattern({ className }: { className?: string }) {
  const count = 16;
  const marginX = 60;
  const baseY = 340;
  const archHeight = 260;

  const dots = Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const x = marginX + t * (1000 - 2 * marginX);
    const y = baseY - archHeight * 4 * t * (1 - t);
    // Central incisors and molars read larger than the teeth between them.
    const edge = Math.abs(t - 0.5) * 2;
    const r = 7 - edge * 3 + Math.sin(t * Math.PI * 5) * 1.2;
    return { x, y, r: Math.max(r, 3) };
  });

  return (
    <svg
      viewBox="0 0 1000 400"
      className={className}
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
      focusable="false"
    >
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="currentColor" />
      ))}
    </svg>
  );
}
