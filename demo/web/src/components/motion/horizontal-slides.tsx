"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Slides horizontales "anclados": la sección queda fija y el scroll vertical desplaza
 * los paneles de lado (desktop, con CSS scroll-driven: sin framer-motion). El JS solo mide
 * la distancia. En móvil, con movimiento reducido o sin soporte del navegador, es un
 * carrusel nativo con scroll-snap (deslizable, accesible por teclado).
 */
export function HorizontalSlides({
  slides,
  label,
  className,
}: {
  slides: ReactNode[];
  label: string;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const supported = CSS.supports("animation-timeline: view()");
    const update = () => setPinned(supported && wide.matches && !reduce.matches);
    update();
    wide.addEventListener("change", update);
    reduce.addEventListener("change", update);
    return () => {
      wide.removeEventListener("change", update);
      reduce.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !pinned) return;
    const measure = () => setDistance(Math.max(0, track.scrollWidth - window.innerWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [pinned, slides.length]);

  return (
    <section
      aria-label={label}
      data-pinned={pinned || undefined}
      className={cn("hslides relative", className)}
      style={pinned ? ({ height: `calc(100vh + ${distance}px)`, "--hslides-distance": distance } as CSSProperties) : undefined}
    >
      <div className={cn(pinned && "sticky top-0 flex h-screen flex-col justify-center overflow-hidden")}>
        <div
          ref={trackRef}
          className={cn(
            "hslides__track flex gap-5 px-[clamp(1rem,4vw,2.5rem)] sm:gap-6",
            !pinned &&
              "snap-x snap-mandatory overflow-x-auto overscroll-x-contain pb-6 [scrollbar-width:thin] [&>*]:snap-start",
            pinned && "w-max will-change-transform",
          )}
          role={pinned ? undefined : "list"}
          tabIndex={pinned ? undefined : 0}
          aria-label={pinned ? undefined : `${label} (deslice horizontalmente)`}
        >
          {slides.map((slide, i) => (
            <div key={i} role={pinned ? undefined : "listitem"} className="shrink-0">
              {slide}
            </div>
          ))}
        </div>
        {pinned && (
          <div className="container-site mt-8 flex items-center gap-4" aria-hidden="true">
            <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-line">
              <div className="hslides__bar h-full origin-left rounded-full bg-lime" />
            </div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Scroll</span>
          </div>
        )}
      </div>
    </section>
  );
}
