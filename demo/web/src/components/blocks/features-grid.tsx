import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { PointerGlowList } from "@/components/motion/pointer-glow";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import type { BlockDataMap } from "@/lib/api/types";

/**
 * Bloque `features` en grilla: cada tarjeta tiene un foco de luz que sigue al puntero.
 * Renderizado en el servidor; la entrada es CSS (`data-reveal`) y el foco usa un solo manejador.
 */
export function FeaturesGrid({ data }: { data: BlockDataMap["features"] }) {
  return (
    <section data-theme="dark" className="bg-canvas py-24 text-fg sm:py-32">
      <div className="container-site">
        {(data.title || data.subtitle) && (
          <div className="mb-14 grid gap-6 lg:grid-cols-2 lg:items-end">
            {data.title && (
              <h2 className="font-display text-display-lg font-extrabold tracking-[-0.045em]">{data.title}</h2>
            )}
            {data.subtitle && <p className="max-w-lg text-lg text-muted lg:justify-self-end">{data.subtitle}</p>}
          </div>
        )}
        <PointerGlowList className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item, i) => (
            <li
              key={item.title}
              data-reveal=""
              style={{ "--reveal-delay": `${(i % 3) * 0.08}s`, "--reveal-y": "30px", "--reveal-blur": "0px" } as CSSProperties}
              className="group relative isolate flex min-h-80 flex-col bg-canvas p-8 sm:p-10"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgb(212 255 58 / 0.13), transparent 60%)",
                }}
              />
              <div className="flex items-start justify-between">
                <span className="grid size-14 place-items-center rounded-2xl border border-line-strong text-lime transition-all duration-500 ease-spring group-hover:-rotate-6 group-hover:scale-110 group-hover:border-lime group-hover:bg-lime group-hover:text-ink">
                  <DynamicIcon name={item.icon} className="size-6" />
                </span>
                <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="mt-auto pt-12 font-display text-2xl font-bold tracking-tight">{item.title}</h3>
              <p className="mt-3 text-muted">{item.text}</p>
              {item.href && (
                <Link
                  href={item.href}
                  className="mt-5 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-fg after:absolute after:inset-0 hover:text-lime"
                >
                  Ver más<span className="sr-only"> sobre {item.title}</span>
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              )}
            </li>
          ))}
        </PointerGlowList>
      </div>
    </section>
  );
}
