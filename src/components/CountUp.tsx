"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 (or its previous value) to `value` over ~700ms
 * with an ease-out curve. Respects prefers-reduced-motion by jumping.
 */
export function CountUp({ value, suffix = "", className = "" }: { value: number; suffix?: string; className?: string }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = reduce ? 1 : Math.min(1, (t - start) / 700);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(a + (value - a) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={`tnum ${className}`}>{shown}{suffix}</span>;
}
