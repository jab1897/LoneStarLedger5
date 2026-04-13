import React from "react";

/** Detect whether the user prefers reduced motion. */
function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * AnimatedValue — counts from 0 up to a target numeric value over `duration` ms
 * using requestAnimationFrame and an ease-out curve. Renders the current value
 * through a caller-provided `format` function so it composes with any of our
 * formatters (USD, signed %, ints, etc).
 *
 * If the user prefers reduced motion, or if the target is not a finite number,
 * the final value is rendered immediately.
 *
 * Props:
 *   value     — target numeric value (may be NaN / null; in which case we render "—")
 *   format    — function(n) => string; defaults to locale integer
 *   duration  — ms, default 800
 *   startFrom — default 0
 *   className — optional
 */
export default function AnimatedValue({
  value,
  format = (n) => new Intl.NumberFormat("en-US").format(Math.round(n)),
  duration = 800,
  startFrom = 0,
  className,
}) {
  const target = Number.isFinite(value) ? value : null;
  const [display, setDisplay] = React.useState(() =>
    target === null ? null : prefersReducedMotion() ? target : startFrom
  );

  React.useEffect(() => {
    if (target === null) {
      setDisplay(null);
      return undefined;
    }
    if (prefersReducedMotion() || duration <= 0) {
      setDisplay(target);
      return undefined;
    }

    let rafId = null;
    const start = performance.now();
    const from = startFrom;
    const to = target;
    // ease-out cubic
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = ease(t);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setDisplay(to);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [target, duration, startFrom]);

  if (display === null) {
    return <span className={className}>—</span>;
  }
  return <span className={className}>{format(display)}</span>;
}
