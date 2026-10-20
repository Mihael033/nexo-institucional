"use client";

import type Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { RevealObserver } from "./reveal-observer";

let lenis: Lenis | null = null;

/** Acceso al scroll suave (p. ej. para "volver arriba"). Null con movimiento reducido. */
export const getLenis = () => lenis;

/**
 * Movimiento global del sitio público, sin framer-motion (las animaciones son CSS: ver
 * `src/app/motion.css`). Las piezas que sí usan framer lo cargan por su cuenta con `MotionScope`.
 * - Scroll suave con Lenis, importado cuando el navegador queda libre y solo sin movimiento reducido.
 * - `RevealObserver`: un IntersectionObserver para todos los `[data-reveal]`.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    const start = async () => {
      if (mq.matches || lenis) return;
      const { default: LenisCtor } = await import("lenis");
      if (disposed || mq.matches || lenis) return;
      lenis = new LenisCtor({ autoRaf: true, lerp: 0.11, anchors: { offset: -96 } });
    };
    const stop = () => {
      lenis?.destroy();
      lenis = null;
    };
    const onChange = () => (mq.matches ? stop() : start());
    // Fuera del camino crítico: no compite con el LCP ni con la hidratación (TBT).
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => start(), { timeout: 3000 })
      : window.setTimeout(() => start(), 1500);
    mq.addEventListener("change", onChange);
    return () => {
      disposed = true;
      (window.cancelIdleCallback ?? window.clearTimeout)(idle);
      mq.removeEventListener("change", onChange);
      stop();
    };
  }, []);

  // Nueva página → arriba sin animación.
  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true, force: true });
  }, [pathname]);

  return (
    <>
      {children}
      <RevealObserver />
    </>
  );
}
