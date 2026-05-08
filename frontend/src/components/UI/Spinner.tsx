import clsx from "clsx";

export default function Spinner({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={clsx("inline-block", className)}
      style={{ width: size, height: size }}
      aria-label="Loading"
    >
      <svg viewBox="0 0 24 24" className="h-full w-full animate-spin">
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M12 3 a9 9 0 0 1 9 9"
          stroke="#6366F1"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </span>
  );
}
