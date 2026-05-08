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
        <defs>
          <linearGradient id="spinner-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="3"
          fill="none"
        />
        <path
          d="M12 3 a9 9 0 0 1 9 9"
          stroke="url(#spinner-grad)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </span>
  );
}
