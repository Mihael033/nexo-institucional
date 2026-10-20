import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Cinta infinita (CSS puro). El contenido se duplica para el loop; la copia es aria-hidden.
 * Se pausa al pasar el mouse y se detiene con prefers-reduced-motion.
 */
export function Marquee({
  children,
  duration = 40,
  reverse,
  className,
  label,
}: {
  children: ReactNode;
  duration?: number;
  reverse?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "group relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]",
        className,
      )}
      role={label ? "region" : undefined}
      aria-label={label}
    >
      {[0, 1].map((copy) => (
        <div
          key={copy}
          aria-hidden={copy === 1 || undefined}
          style={{ "--marquee-duration": `${duration}s` } as CSSProperties}
          className={cn(
            "flex min-w-full shrink-0 animate-marquee items-center justify-around gap-[inherit] pr-[var(--gap,3rem)] group-hover:[animation-play-state:paused] motion-reduce:animate-none",
            reverse && "[animation-direction:reverse]",
          )}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
