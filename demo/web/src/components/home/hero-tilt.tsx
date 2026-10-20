"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Inclinación 3D de las tarjetas del hero según el puntero (solo mouse, sin movimiento reducido).
 * Escribe --rx/--ry; la suavidad es una transición CSS (`.hero-tilt` en motion.css).
 */
export function HeroTilt({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const area = el?.closest("section");
    if (!el || !area || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = area.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--rx", `${(-py * 16).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(px * 20).toFixed(2)}deg`);
    };
    area.addEventListener("pointermove", onMove, { passive: true });
    return () => area.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className={cn("hero-tilt", className)}>
      {children}
    </div>
  );
}
