import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Constellation } from "@/components/motion/constellation";
import { Magnetic } from "@/components/motion/magnetic";
import { SplitLines } from "@/components/motion/split-text";
import { Reveal } from "@/components/motion/reveal";
import type { BlockDataMap } from "@/lib/api/types";

/** Bloque `cta`: cierre de página oscuro con la red de nodos y botón magnético gigante. */
export function CtaBlock({ data }: { data: BlockDataMap["cta"] }) {
  const words = data.title.split(" ");
  const half = Math.ceil(words.length / 2);
  return (
    <section data-theme="dark" className="grain relative isolate overflow-hidden bg-canvas py-28 text-fg sm:py-40">
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-70">
        <Constellation density={0.6} className="absolute inset-0" />
        <div className="absolute left-1/2 top-1/2 size-[60vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cobalt/30 blur-[140px]" />
      </div>
      <div className="container-site flex flex-col items-center text-center">
        <SplitLines
          as="h2"
          inView
          label={data.title}
          lines={[words.slice(0, half).join(" "), words.slice(half).join(" ")]}
          className="max-w-5xl font-display text-display-xl font-extrabold tracking-[-0.05em] [font-stretch:110%]"
        />
        <Reveal delay={0.2}>
          <p className="mx-auto mt-8 max-w-xl text-lg text-muted sm:text-xl">{data.text}</p>
        </Reveal>
        <Reveal delay={0.3} className="mt-12">
          <Magnetic strength={0.4}>
            <Link
              href={data.button.href}
              className="group relative grid size-44 place-items-center rounded-full bg-lime text-center font-display text-lg font-bold text-ink shadow-glow transition-transform duration-500 ease-spring hover:scale-105 sm:size-52"
            >
              <span className="flex max-w-[9rem] flex-col items-center gap-2 leading-tight">
                {data.button.label}
                <ArrowUpRight className="size-6 transition-transform duration-500 ease-spring group-hover:rotate-45" aria-hidden="true" />
              </span>
            </Link>
          </Magnetic>
        </Reveal>
      </div>
    </section>
  );
}
