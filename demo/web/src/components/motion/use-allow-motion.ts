"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * true solo en el cliente y cuando el usuario NO pidió movimiento reducido.
 * En el servidor y durante la hidratación devuelve false, así el HTML coincide
 * (a diferencia de useReducedMotion, que difiere entre servidor y cliente).
 * Usar para efectos ligados al scroll/puntero que MotionConfig no desactiva.
 */
export function useAllowMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !window.matchMedia(QUERY).matches,
    () => false,
  );
}
