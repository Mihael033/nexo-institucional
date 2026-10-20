"use client";

import { useEffect, useRef } from "react";
import { formatNumber } from "@/lib/format";

const ease = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * Número que cuenta desde 0 al entrar en pantalla. El valor final está en el HTML
 * (SSR y lectores de pantalla); la animación solo reescribe el texto visible.
 * Sin framer-motion: un IntersectionObserver y requestAnimationFrame.
 */
export function Counter({
  value,
  prefix = "",
  suffix = "",
  duration = 2.2,
  className,
}: {
  value: number;
  prefix?: string | null;
  suffix?: string | null;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = `${prefix ?? ""}${formatNumber(value)}${suffix ?? ""}`;

  useEffect(() => {
    const root = ref.current;
    const el = root?.lastElementChild;
    if (!root || !el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const render = (v: number) => (el.textContent = `${prefix ?? ""}${formatNumber(Math.round(v))}${suffix ?? ""}`);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / (duration * 1000));
          render(value * ease(t));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        render(0);
        raf = requestAnimationFrame(tick);
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(root);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, prefix, suffix, duration]);

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{final}</span>
      <span aria-hidden="true" className="tabular-nums">
        {final}
      </span>
    </span>
  );
}
