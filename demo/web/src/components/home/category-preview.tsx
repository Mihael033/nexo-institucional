"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { CategoryThumb, type CategoryEntry } from "./category-thumb";

const QUERIES = ["(hover: hover) and (pointer: fine)", "(prefers-reduced-motion: reduce)"];

function subscribe(cb: () => void) {
  const mqs = QUERIES.map((q) => window.matchMedia(q));
  mqs.forEach((mq) => mq.addEventListener("change", cb));
  return () => mqs.forEach((mq) => mq.removeEventListener("change", cb));
}
/** Con mouse y sin movimiento reducido. false en el servidor y al hidratar (HTML idéntico). */
const canPreview = () => window.matchMedia(QUERIES[0]).matches && !window.matchMedia(QUERIES[1]).matches;

/**
 * Vista previa de la categoría que sigue al puntero (desktop, solo mouse). Escucha la lista
 * vecina: la fila señalada viene de `data-index`. Movimiento y cambios de imagen son CSS
 * (sin framer-motion): la imagen nueva sube por encima de la anterior.
 */
export function CategoryPreview({ categories }: { categories: CategoryEntry[] }) {
  const enabled = useSyncExternalStore(subscribe, canPreview, () => false);
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [shown, setShown] = useState<number | null>(null);
  const [previous, setPrevious] = useState<number | null>(null);
  const shownRef = useRef<number | null>(null);

  useEffect(() => {
    const root = ref.current?.parentElement;
    if (!enabled || !root) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !ref.current) return;
      const r = root.getBoundingClientRect();
      ref.current.style.setProperty("--px", `${e.clientX - r.left}px`);
      ref.current.style.setProperty("--py", `${e.clientY - r.top}px`);
      const row = (e.target as HTMLElement).closest<HTMLElement>("[data-index]");
      const index = row ? Number(row.dataset.index) : null;
      setActive(index);
      if (index !== null && index !== shownRef.current) {
        setPrevious(shownRef.current);
        shownRef.current = index;
        setShown(index);
      }
    };
    const hide = () => setActive(null);
    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", hide);
    root.addEventListener("focusin", hide);
    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", hide);
      root.removeEventListener("focusin", hide);
    };
  }, [enabled]);

  return (
    <div ref={ref} aria-hidden="true" className="category-preview pointer-events-none absolute left-0 top-0 z-10 hidden md:block">
      {enabled && (
        <div
          className={cn(
            "relative -ml-36 -mt-28 h-56 w-72 overflow-hidden rounded-2xl shadow-float ring-1 ring-white/10 transition-[opacity,scale,rotate] duration-[450ms] ease-out-expo",
            active === null ? "rotate-6 scale-[0.6] opacity-0" : "-rotate-4 scale-100 opacity-100",
          )}
        >
          {previous !== null && previous !== shown && (
            <div className="absolute inset-0">
              <CategoryThumb entry={categories[previous]} sizes="288px" />
            </div>
          )}
          {shown !== null && (
            <div
              key={categories[shown].slug}
              className="category-preview__slide absolute inset-0 z-[1]"
              onAnimationEnd={() => setPrevious(null)}
            >
              <CategoryThumb entry={categories[shown]} sizes="288px" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
