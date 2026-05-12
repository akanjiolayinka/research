// Decorative number rolls were dropped in the design pass; kept as a thin
// passthrough so existing imports still work, but values render statically now.
export default function AnimatedCounter({
  value,
  format = (n: number) => Math.round(n).toLocaleString(),
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  return <span>{format(value)}</span>;
}
