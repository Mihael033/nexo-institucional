import type { CSSProperties } from "react";
import type { BlockDataMap } from "@/lib/api/types";
import { cn } from "@/lib/cn";

/**
 * Bloque `timeline`: la línea se "dibuja" con el scroll (CSS scroll-driven) y cada hito entra
 * desde su lado al revelarse, con el punto que "salta". Sin JS propio (ver `motion.css`).
 * Si los años son pasos ("01", "02"…) se muestra como proceso.
 */
export function Timeline({ data }: { data: BlockDataMap["timeline"] }) {
  const steps = data.items.every((i) => /^\d{1,2}$/.test(i.year));

  return (
    <section data-theme="dark" className="bg-canvas py-24 text-fg sm:py-32">
      <div className="container-site">
        {data.title && (
          <h2 className="mb-16 font-display text-display-lg font-extrabold tracking-[-0.045em] sm:mb-24">{data.title}</h2>
        )}
        <ol className="timeline-track relative grid gap-14 sm:gap-20">
          <span aria-hidden="true" className="absolute bottom-0 left-[1.15rem] top-0 w-px bg-line md:left-1/2" />
          <span
            aria-hidden="true"
            className="timeline-line absolute bottom-0 left-[1.15rem] top-0 w-px origin-top bg-lime md:left-1/2"
          />
          {data.items.map((item, i) => {
            const right = i % 2 === 1;
            return (
              <li
                key={`${item.year}-${item.title}`}
                data-reveal=""
                style={{ "--reveal-x": right ? "40px" : "-40px", "--reveal-y": "0px", "--reveal-blur": "0px" } as CSSProperties}
                className="relative grid pl-14 md:grid-cols-2 md:pl-0"
              >
                <span
                  aria-hidden="true"
                  className="timeline-dot absolute left-[1.15rem] top-2 z-10 grid size-5 -translate-x-1/2 place-items-center rounded-full bg-lime shadow-glow md:left-1/2"
                >
                  <span className="size-2 rounded-full bg-ink" />
                </span>
                <div className={cn("md:px-14", right ? "md:col-start-2" : "md:text-right")}>
                  <p
                    className={cn(
                      "font-display font-black leading-none tracking-[-0.06em] text-transparent [-webkit-text-stroke:1.5px_var(--muted)]",
                      steps ? "text-6xl sm:text-7xl" : "text-6xl sm:text-8xl",
                    )}
                  >
                    {item.year}
                  </p>
                  <h3 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">{item.title}</h3>
                  <p className={cn("mt-3 max-w-md text-lg text-muted", !right && "md:ml-auto")}>{item.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
