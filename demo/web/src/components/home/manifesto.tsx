import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Counter } from "@/components/motion/counter";
import { Parallax } from "@/components/motion/parallax";
import { Reveal } from "@/components/motion/reveal";
import { WordReveal } from "@/components/motion/word-reveal";
import { BrandVisual } from "@/components/visuals/brand-visual";
import type { BlockDataMap } from "@/lib/api/types";
import { htmlToAccentText } from "@/lib/text";

type Stat = BlockDataMap["stats"]["items"][number];

/** "Quiénes somos" de la home: el texto (bloque richText del CMS) se enciende con el scroll + collage en parallax. */
export function Manifesto({ data, stat }: { data: BlockDataMap["richText"]; stat?: Stat }) {
  return (
    <section id="manifiesto" aria-labelledby="manifiesto-title" className="relative bg-paper py-24 text-ink sm:py-36">
      <div className="container-site grid gap-16 lg:grid-cols-[1.35fr_1fr] lg:gap-20">
        <div>
          <Reveal>
            <h2 id="manifiesto-title" className="mb-10 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.24em] text-ink/70">
              <span className="h-px w-10 bg-ink/40" aria-hidden="true" />
              {data.title ?? "Quiénes somos"}
            </h2>
          </Reveal>
          <WordReveal
            text={htmlToAccentText(data.html)}
            accentClassName="text-cobalt"
            className="font-display text-[clamp(1.85rem,3.6vw,3.4rem)] font-semibold leading-[1.08] tracking-[-0.035em]"
          />
          <Reveal delay={0.1} className="mt-12">
            <Link
              href="/nosotros"
              className="group inline-flex items-center gap-3 rounded-full bg-ink py-2 pl-6 pr-2 font-medium text-paper transition-colors hover:bg-cobalt"
            >
              Conozca nuestra historia
              <span className="grid size-9 place-items-center rounded-full bg-lime text-ink transition-transform duration-500 ease-spring group-hover:rotate-45">
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
          </Reveal>
        </div>

        <div className="relative grid h-[30rem] grid-cols-2 gap-4 sm:h-[38rem]">
          <Parallax offset={40} className="row-span-2 overflow-hidden rounded-2xl">
            <div className="relative h-[115%] -translate-y-[7%]">
              <BrandVisual label="Centro de distribución y depósito central" className="absolute inset-0" />
            </div>
          </Parallax>
          <Parallax offset={-50} className="overflow-hidden rounded-2xl">
            <div className="relative h-[130%] -translate-y-[12%]">
              <BrandVisual label="Entrega en ruta" caption={false} className="absolute inset-0" />
            </div>
          </Parallax>
          <Parallax offset={-90} className="overflow-hidden rounded-2xl bg-cobalt p-5 text-white">
            {/* @container: la cifra se mide por el ancho de la tarjeta (no del viewport) y nunca se corta. */}
            <div className="@container flex h-full flex-col justify-between">
              {stat ? (
                <>
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/85">{stat.label}</span>
                  <span className="font-display text-[clamp(1.75rem,26cqw,4.5rem)] font-black leading-none tracking-[-0.06em]">
                    <Counter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                  </span>
                </>
              ) : (
                <span className="font-display text-4xl font-black">Nexo</span>
              )}
            </div>
          </Parallax>
        </div>
      </div>
    </section>
  );
}
