import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Titular "persiana" en CSS puro (sin JS): para títulos above-the-fold, anima desde el
 * primer paint y no retrasa el LCP. Para títulos que animan al entrar en pantalla, usar SplitLines.
 */
export function EnterLines({
  lines,
  label,
  className,
  delay = 0,
  stagger = 0.1,
  as: Tag = "h1",
}: {
  lines: ReactNode[];
  label: string;
  className?: string;
  delay?: number;
  stagger?: number;
  as?: "h1" | "h2" | "p";
}) {
  return (
    <Tag className={className}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="block">
        {lines.map((line, i) => (
          <span key={i} className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
            <span className="enter-line" style={{ "--d": `${delay + i * stagger}s` } as CSSProperties}>
              {line}
            </span>
          </span>
        ))}
      </span>
    </Tag>
  );
}

/** Aparición suave en CSS (opacidad parcial + subida): visible desde el primer paint. */
export function EnterRise({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "p";
}) {
  return (
    <Tag className={cn("enter-rise", className)} style={{ "--d": `${delay}s` } as CSSProperties}>
      {children}
    </Tag>
  );
}
