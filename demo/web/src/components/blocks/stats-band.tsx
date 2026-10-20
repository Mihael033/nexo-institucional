import { Counter } from "@/components/motion/counter";
import { Marquee } from "@/components/motion/marquee";
import { Reveal } from "@/components/motion/reveal";
import { LogoMark } from "@/components/ui/logo";
import type { BlockDataMap } from "@/lib/api/types";

const CITIES = ["La Paz", "Santa Cruz de la Sierra", "Cochabamba", "El Alto", "Sucre", "Tarija", "Oruro", "Potosí", "Trinidad", "Cobija"];

/** Bloque `stats`: banda lima con contadores animados y cinta de ciudades. */
export function StatsBand({ data }: { data: BlockDataMap["stats"] }) {
  return (
    <section aria-labelledby={data.title ? "stats-title" : undefined} className="overflow-hidden bg-lime text-ink">
      <div className="container-site py-20 sm:py-28">
        {data.title && (
          <Reveal>
            <h2 id="stats-title" className="mb-14 max-w-xl font-display text-display-md font-bold tracking-[-0.04em]">
              {data.title}
            </h2>
          </Reveal>
        )}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
          {data.items.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="grid gap-3 border-t-2 border-ink pt-5">
              <dt className="order-2 max-w-[16ch] text-base font-medium text-ink/75">{s.label}</dt>
              <dd className="order-1 font-display text-[clamp(2.6rem,4.6vw,4.75rem)] font-black leading-none tracking-[-0.05em] whitespace-nowrap">
                <Counter value={s.value} prefix={s.prefix} suffix={s.suffix} />
              </dd>
            </Reveal>
          ))}
        </dl>
      </div>
      <div className="border-y-2 border-ink bg-ink py-5 text-lime">
        <Marquee duration={38} label="Ciudades con cobertura" className="[--gap:2.5rem] gap-10">
          {CITIES.map((c) => (
            <span key={c} className="flex items-center gap-10 whitespace-nowrap font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {c}
              <LogoMark className="size-6 text-lime" accent={false} />
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
