import { cn } from "@/lib/cn";

/**
 * Marca Nexo: una "N" trazada como grafo de cuatro nodos conectados.
 * El nodo de acento (lima) es el punto de encuentro: institución ↔ solución.
 */
export function LogoMark({ className, accent = true }: { className?: string; accent?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden="true" focusable="false">
      <path
        d="M9 31V9l22 22V9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="31" r="4" fill="currentColor" />
      <circle cx="9" cy="9" r="4" fill="currentColor" />
      <circle cx="31" cy="31" r="4" fill="currentColor" />
      <circle cx="31" cy="9" r="4.6" className={accent ? "fill-lime stroke-ink" : "fill-current"} strokeWidth="1.5" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={cn("grid leading-none", compact && "sr-only")}>
        <span className="font-display text-[1.35rem] font-extrabold tracking-[-0.04em] [font-stretch:115%]">nexo</span>{" "}
        <span className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-[0.28em] opacity-70">institucional</span>
      </span>
    </span>
  );
}
