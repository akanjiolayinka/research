import { animate, useMotionValue, useTransform, motion } from "framer-motion";
import { useEffect } from "react";

export default function AnimatedCounter({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  duration = 1.2,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const motionVal = useMotionValue(0);
  const display = useTransform(motionVal, (n) => format(n));

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration,
      ease: "easeOut",
    });
    return controls.stop;
  }, [value, duration, motionVal]);

  return <motion.span>{display}</motion.span>;
}
