"use client";

import { useEffect, useRef, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────

interface CountUpProps {
  /** Target value (0–1000) */
  value: number;
  /** Animation duration in ms (default 320) */
  duration?: number;
  /** Whether to animate (false = snap immediately) */
  animate?: boolean;
  className?: string;
}

// ─── Helpers ────────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);

    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return reduced;
}

// Ease-out cubic for smooth deceleration
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ─── Component ──────────────────────────────────────────────────

/**
 * Animated count-up from 0 to `value` over `duration` ms.
 *
 * Respects `prefers-reduced-motion: reduce` — if set, snaps instantly.
 * Uses requestAnimationFrame for smooth 60fps animation.
 */
export function CountUp({
  value,
  duration = 320,
  animate = true,
  className,
}: CountUpProps) {
  const prefersReduced = usePrefersReducedMotion();
  const shouldAnimate = animate && !prefersReduced && duration > 0;

  const [display, setDisplay] = useState(shouldAnimate ? 0 : value);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    // Cancel any in-flight animation
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!shouldAnimate) {
      setDisplay(value);
      return;
    }

    startRef.current = null;

    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;

      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const current = Math.round(easedProgress * value);

      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, duration, shouldAnimate]);

  return (
    <span className={className} data-testid="count-up-value">
      {display}
    </span>
  );
}

export default CountUp;
