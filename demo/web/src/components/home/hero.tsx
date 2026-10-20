import { ArrowDown, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Constellation } from "@/components/motion/constellation";
import { Magnetic } from "@/components/motion/magnetic";
import { EnterLines, EnterRise } from "@/components/motion/enter-lines";
import { ProductImage } from "@/components/visuals/product-visual";
import type { BlockDataMap, ProductSummary } from "@/lib/api/types";
import { formatBs } from "@/lib/format";
import { HeroTilt } from "./hero-tilt";

type HeroData = BlockDataMap["hero"];

/** Divide el título en 3 líneas y pone la última palabra en serif itálica (acento). */
function titleLines(title: string) {
  const words = title.split(" ");
  const last = words.pop() ?? "";
  const [first, second, ...rest] = words;
  return [
    first,
    second,
    <span key="last">
      {rest.join(" ")} <em className="font-serif font-normal italic tracking-[-0.02em] text-lime">{last}</em>
    </span>,
  ].filter(Boolean);
}

/**
 * Hero de la portada, renderizado en el servidor (sin framer-motion):
 * - entrada en CSS desde el primer paint (no retrasa el LCP);
 * - al hacer scroll se "aleja" (escala, redondea, el contenido se desvanece) con CSS scroll-driven;
 * - las tarjetas se inclinan con el puntero (`HeroTilt`, la única parte con JS).
 */
export function Hero({ data, products }: { data: HeroData; products: ProductSummary[] }) {
  const cards = products.slice(0, 3);

  return (
    <section data-theme="dark" className="relative bg-paper">
      <div className="hero-recede grain relative isolate flex min-h-[100svh] origin-top flex-col overflow-hidden bg-canvas text-fg">
        {/* Fondo: brillos + red de nodos */}
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="absolute -left-[10%] top-[8%] size-[48vw] rounded-full bg-cobalt/35 blur-[120px] motion-safe:animate-[float_18s_ease-in-out_infinite]" />
          <div className="absolute -right-[8%] bottom-[-10%] size-[38vw] rounded-full bg-lime/15 blur-[120px] motion-safe:animate-[float_22s_ease-in-out_infinite_reverse]" />
          <Constellation className="absolute inset-0" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--canvas)_95%)]" />
        </div>

        <div className="hero-drift container-site relative flex flex-1 flex-col justify-center pb-28 pt-32 sm:pt-36">
          {data.eyebrow && (
            <EnterRise
              as="p"
              delay={0.05}
              className="mb-7 inline-flex w-fit items-center gap-2.5 rounded-full border border-line-strong bg-ink/40 py-1.5 pl-2 pr-4 font-mono text-[0.72rem] uppercase tracking-[0.2em] text-fg/85 backdrop-blur"
            >
              <span className="relative flex size-2.5">
                <span className="absolute inset-0 rounded-full bg-lime motion-safe:animate-ping" />
                <span className="relative size-2.5 rounded-full bg-lime" />
              </span>
              {data.eyebrow}
            </EnterRise>
          )}

          <EnterLines
            label={data.title}
            lines={titleLines(data.title)}
            delay={0.1}
            stagger={0.1}
            className="font-display text-[clamp(3.1rem,0.9rem+7.6vw,9rem)] font-extrabold leading-[0.9] tracking-[-0.055em] [font-stretch:112%]"
          />

          <div className="mt-10 grid max-w-xl gap-8">
            <EnterRise as="p" delay={0.45} className="text-lg leading-relaxed text-muted sm:text-xl">
              {data.subtitle}
            </EnterRise>
            <EnterRise delay={0.65} className="flex flex-wrap items-center gap-3">
              {data.primaryCta && (
                <Magnetic>
                  <Link
                    href={data.primaryCta.href}
                    className="group inline-flex h-14 items-center gap-3 rounded-full bg-lime pl-7 pr-2 text-base font-semibold text-ink transition-shadow hover:shadow-glow"
                  >
                    {data.primaryCta.label}
                    <span className="grid size-10 place-items-center rounded-full bg-ink text-lime transition-transform duration-500 ease-spring group-hover:rotate-45">
                      <ArrowUpRight className="size-5" aria-hidden="true" />
                    </span>
                  </Link>
                </Magnetic>
              )}
              {data.secondaryCta && (
                <Link
                  href={data.secondaryCta.href}
                  className="inline-flex h-14 items-center rounded-full border border-line-strong px-7 font-medium text-fg transition-colors hover:border-fg hover:bg-white/5"
                >
                  {data.secondaryCta.label}
                </Link>
              )}
            </EnterRise>
          </div>

          {/* Tarjetas flotantes de productos destacados */}
          {cards.length > 0 && (
            <HeroTilt className="pointer-events-none absolute bottom-[12%] right-[3%] hidden h-[24rem] w-[25rem] xl:block 2xl:right-[6%] 2xl:h-[27rem] 2xl:w-[29rem]">
              {cards.map((p, i) => (
                <div
                  key={p.id}
                  className="hero-card absolute w-[14.5rem] overflow-hidden rounded-2xl border border-white/10 bg-ink-2/90 p-2 shadow-float backdrop-blur 2xl:w-[16.5rem]"
                  style={
                    {
                      left: ["0%", "38%", "14%"][i],
                      top: ["8%", "0%", "42%"][i],
                      zIndex: [1, 2, 3][i],
                      rotate: `${[-9, 4, -2][i]}deg`,
                      "--d": `${0.6 + i * 0.15}s`,
                    } as CSSProperties
                  }
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                    <ProductImage image={p.thumbnail} product={p} decorative sizes="280px" priority={i === 0} />
                  </div>
                  <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-3">
                    <span className="truncate text-sm font-medium">{p.name}</span>
                    <span className="shrink-0 font-mono text-xs text-lime">{formatBs(p.priceBs)}</span>
                  </div>
                </div>
              ))}
              <div className="hero-badge absolute -right-4 top-[-6%] z-10 grid size-28 place-items-center rounded-full bg-lime text-ink shadow-glow">
                <svg viewBox="0 0 100 100" className="absolute inset-0 motion-safe:animate-spin-slow">
                  <defs>
                    <path id="hero-badge" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" />
                  </defs>
                  <text className="fill-ink font-mono text-[10.5px] uppercase tracking-[0.24em]">
                    <textPath href="#hero-badge">Garantía · Soporte local ·</textPath>
                  </text>
                </svg>
                <span className="font-display text-2xl font-black">Bs</span>
              </div>
            </HeroTilt>
          )}
        </div>

        <a
          href="#manifiesto"
          className="hero-hint group absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.25em] text-muted hover:text-fg"
        >
          Descubrir
          <span className="grid size-10 place-items-center rounded-full border border-line-strong transition-colors group-hover:border-lime group-hover:text-lime">
            <ArrowDown className="size-4 motion-safe:animate-bounce" aria-hidden="true" />
          </span>
        </a>
      </div>
    </section>
  );
}
