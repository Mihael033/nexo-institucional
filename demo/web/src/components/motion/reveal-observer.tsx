"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Un único IntersectionObserver para todos los `[data-reveal]` de la página.
 * - Lo que ya está en pantalla al cargar queda como está (nunca se oculta: LCP y contraste).
 * - Lo que está debajo pasa a `pending` (oculto por CSS) y a `in` al entrar en el viewport.
 * - Se vuelve a ejecutar en cada navegación (contenido nuevo).
 * Con prefers-reduced-motion el CSS no oculta nada, así que no hace falta observar.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-reveal", "in");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    // Tras el primer frame: el layout ya está estable y no competimos con el LCP.
    const raf = requestAnimationFrame(() => {
      const fold = window.innerHeight * 0.9;
      document.querySelectorAll<HTMLElement>('[data-reveal=""]').forEach((el) => {
        if (el.getBoundingClientRect().top < fold) {
          el.setAttribute("data-reveal", "shown");
        } else {
          el.setAttribute("data-reveal", "pending");
          io.observe(el);
        }
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [pathname]);

  return null;
}
