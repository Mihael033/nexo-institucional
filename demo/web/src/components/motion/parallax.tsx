import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Desplaza el contenido verticalmente a otra velocidad que el scroll (profundidad). CSS puro. */
export function Parallax({
  children,
  offset = 80,
  className,
}: {
  children: ReactNode;
  /** Recorrido total en px (positivo: el contenido va más lento que el scroll). */
  offset?: number;
  className?: string;
}) {
  return (
    <div className={cn("parallax-frame", className)}>
      <div className="parallax-layer h-full w-full" style={{ "--parallax": `${offset}px` } as CSSProperties}>
        {children}
      </div>
    </div>
  );
}
