"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Atrae suavemente su contenido hacia el puntero (solo con mouse). El rebote es una
 * transición CSS sobre variables (sin framer-motion); con movimiento reducido no se mueve.
 * Envoltorio inline: no cambia la semántica del hijo (enlace o botón).
 */
export function Magnetic({ children, strength = 0.35, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  const onMove = (e: PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${(e.clientX - (r.left + r.width / 2)) * strength}px`);
    el.style.setProperty("--my", `${(e.clientY - (r.top + r.height / 2)) * strength}px`);
  };
  const reset = () => {
    ref.current?.style.setProperty("--mx", "0px");
    ref.current?.style.setProperty("--my", "0px");
  };

  return (
    <span ref={ref} onPointerMove={onMove} onPointerLeave={reset} className={cn("magnetic", className)}>
      {children}
    </span>
  );
}
