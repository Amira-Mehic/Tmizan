// ============================================================================
// Animacijski helperi: Reveal (fade + slide-up na ulasku u vidno polje) i
// Counter (broji od 0 do cilja). Poštuju prefers-reduced-motion.
// ============================================================================

import { useState, useRef, useEffect } from "react";

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Tag se koristi u JSX-u ispod (<Tag>); no-unused-vars ga ne prepoznaje jer
// eslint-plugin-react (jsx-uses-vars) nije instaliran u projektu.
// eslint-disable-next-line no-unused-vars
export function Reveal({ children, delay = 0, x = 0, y = 28, className = "", as: Tag = "div" }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);

  // Zavisi od ref.current (pravi DOM čvor, dostupan tek nakon mount-a) i
  // pretplaćuje se na IntersectionObserver - mora ostati u useEffect-u.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (prefersReduced()) { setVis(true); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? "none" : `translate(${x}px, ${y}px)`,
        transition: "opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1)",
        transitionDelay: `${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </Tag>
  );
}

export function Counter({ to = 0, suffix = "", duration = 1500, className = "" }) {
  const ref = useRef(null);
  const [n, setN] = useState(0);
  const done = useRef(false);

  // Zavisi od ref.current (pravi DOM čvor, dostupan tek nakon mount-a) i
  // pretplaćuje se na IntersectionObserver - mora ostati u useEffect-u.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (prefersReduced()) { setN(to); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        const start = performance.now();
        const ease = (p) => 1 - Math.pow(1 - p, 3); // easeOutCubic
        const tick = (t) => {
          const p = Math.min(1, (t - start) / duration);
          setN(Math.round(ease(p) * to));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, duration]);

  return <span ref={ref} className={className}>{n}{suffix}</span>;
}
