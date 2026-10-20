"use client";

import { LazyMotion, MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/** Las features de animación (~30 KB) se descargan después del primer render. */
const loadFeatures = () => import("./motion-features").then((mod) => mod.default);

/**
 * Contexto de framer-motion solo donde hace falta (animaciones de layout del catálogo,
 * galería del producto, formulario de contacto). El resto del sitio anima con CSS, así
 * framer no entra en el JS inicial de la portada. Respeta `prefers-reduced-motion`.
 */
export function MotionScope({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
