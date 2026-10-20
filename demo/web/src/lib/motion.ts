import type { Transition, Variants } from "framer-motion";

/** Curvas y resortes compartidos: el mismo "pulso" en todo el sitio (ver tokens --ease-*). */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT_QUART = [0.76, 0, 0.24, 1] as const;

export const SPRING: Transition = { type: "spring", stiffness: 380, damping: 32, mass: 0.8 };
export const SPRING_SOFT: Transition = { type: "spring", stiffness: 140, damping: 22 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT_EXPO } },
};

export const stagger = (each = 0.08, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: each, delayChildren: delay } },
});
