"use client";

import type { PointerEvent, ReactNode } from "react";

/**
 * Lista cuyas tarjetas (`li`) reciben --mx/--my con la posición del puntero: un solo
 * manejador para toda la lista (delegación), el resto es CSS.
 */
export function PointerGlowList({ children, className }: { children: ReactNode; className?: string }) {
  const onMove = (e: PointerEvent<HTMLUListElement>) => {
    const li = (e.target as HTMLElement).closest("li");
    if (!li || !e.currentTarget.contains(li)) return;
    const r = li.getBoundingClientRect();
    li.style.setProperty("--mx", `${e.clientX - r.left}px`);
    li.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <ul className={className} onPointerMove={onMove}>
      {children}
    </ul>
  );
}
