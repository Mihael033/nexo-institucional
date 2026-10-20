"use client";

import { ArrowUp } from "lucide-react";
import { getLenis } from "@/components/motion/motion-provider";

export function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => {
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(0, { duration: 1.6 });
        else window.scrollTo({ top: 0 });
        document.getElementById("contenido")?.focus({ preventScroll: true });
      }}
      className="group inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-fg/85 transition-colors hover:border-lime hover:text-lime"
    >
      Volver arriba
      <ArrowUp className="size-3.5 transition-transform group-hover:-translate-y-0.5" aria-hidden="true" />
    </button>
  );
}
