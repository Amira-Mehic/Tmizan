// ============================================================================
// ParticleBackground - animirana "prašina" čestica kao pozadina, obojena
// bojama trenutne teme. Reaguje na pomjeranje miša (čestice se razmiču/uvećaju).
//
// Dva režima (prop `fixed`):
//   - fixed=true  (podrazumijevano): pokriva CIJELI viewport - koristi se na
//     samostalnim stranicama bez sidebara (Home, Login, Register, Blog…).
//   - fixed=false: "contained" - puni SAMO najbližeg pozicioniranog roditelja
//     (parentElement), ne cijeli ekran. Koristi se unutar SidebarLayout-a da
//     čestice ostanu samo u unutrašnjem sadržaju, a ne preko sidebara/oglasa.
// ============================================================================

import { useEffect, useRef } from "react";

export default function ParticleBackground({ colors, className = "", fixed = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const palette = colors?.length ? colors : ["#ffffff"];
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let width = 0, height = 0, particles = [], rafId = null;
    const mouse = { x: null, y: null, radius: 130 };

    function initParticles() {
      const count = Math.min(140, Math.max(30, Math.floor((width * height) / 9000)));
      particles = Array.from({ length: count }, () => {
        const baseSize = Math.random() * 4 + 1.8;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          baseSize, size: baseSize,
          color: palette[Math.floor(Math.random() * palette.length)],
          vx: (Math.random() - 0.5) * 0.9,
          vy: (Math.random() - 0.5) * 0.9,
          alpha: Math.random() * 0.45 + 0.2,
        };
      });
    }

    function resize() {
      if (fixed) {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      } else {
        const rect = canvas.parentElement?.getBoundingClientRect();
        width = canvas.width = rect?.width || canvas.clientWidth || 0;
        height = canvas.height = rect?.height || canvas.clientHeight || 0;
      }
      initParticles();
    }

    function drawFrame() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    function tick() {
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        if (mouse.x != null) {
          const dx = mouse.x - p.x, dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius && dist > 0.01) {
            const force = (mouse.radius - dist) / mouse.radius;
            p.x -= (dx / dist) * force * 2.2;
            p.y -= (dy / dist) * force * 2.2;
            p.size = p.baseSize + force * 4;
          } else if (p.size > p.baseSize) {
            p.size -= 0.08;
          }
        }
      });
      drawFrame();
      rafId = requestAnimationFrame(tick);
    }

    // U "contained" (fixed=false) režimu mišev položaj se meri relativno na
    // canvas (koji puni svog roditelja), ne na cijeli prozor.
    function onMouseMove(e) {
      if (fixed) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      } else {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) { mouse.x = null; mouse.y = null; }
        else { mouse.x = x; mouse.y = y; }
      }
    }
    function onMouseLeave() { mouse.x = null; mouse.y = null; }
    function onVisibility() {
      if (document.hidden) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      } else if (!prefersReducedMotion && !rafId) {
        rafId = requestAnimationFrame(tick);
      }
    }

    resize();
    const ro = !fixed && window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro && canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("visibilitychange", onVisibility);

    if (prefersReducedMotion) {
      drawFrame(); // statičan jedan kadar - bez animacije
    } else {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [colors, fixed]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`${fixed ? "fixed" : "absolute"} inset-0 -z-10 pointer-events-none ${className}`}
    />
  );
}
