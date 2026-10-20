import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { HorizontalSlides } from "@/components/motion/horizontal-slides";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import type { BlockDataMap } from "@/lib/api/types";
import { cn } from "@/lib/cn";

/** Paletas de cada slide (contrastes AA verificados con su texto). */
const SKINS = [
  { card: "bg-cobalt text-white", icon: "bg-white text-cobalt", muted: "text-white/80", line: "border-white/25" },
  { card: "bg-lime text-ink", icon: "bg-ink text-lime", muted: "text-ink/75", line: "border-ink/20" },
  { card: "bg-paper text-ink", icon: "bg-cobalt text-white", muted: "text-ink/70", line: "border-ink/15" },
  { card: "bg-ink-3 text-paper border border-white/10", icon: "bg-lime text-ink", muted: "text-paper/70", line: "border-white/15" },
];

const SLIDE = "h-[min(34rem,72vh)] w-[min(86vw,32rem)] lg:w-[min(46vw,40rem)]";

/** Bloque `features` como slides horizontales anclados al scroll. */
export function FeaturesSlides({ data, eyebrow = "Servicios" }: { data: BlockDataMap["features"]; eyebrow?: string }) {
  const total = data.items.length;

  const intro = (
    <div key="intro" className={cn(SLIDE, "flex flex-col justify-between py-4 lg:w-[min(40vw,34rem)]")}>
      <div>
        <p className="mb-6 font-mono text-xs uppercase tracking-[0.24em] text-lime">{eyebrow}</p>
        {data.title && (
          <h2 className="font-display text-display-lg font-extrabold tracking-[-0.045em] [font-stretch:108%]">{data.title}</h2>
        )}
      </div>
      {data.subtitle && <p className="max-w-md text-lg leading-relaxed text-muted">{data.subtitle}</p>}
    </div>
  );

  const slides = data.items.map((item, i) => {
    const skin = SKINS[i % SKINS.length];
    return (
      <article
        key={item.title}
        className={cn(
          SLIDE,
          skin.card,
          "group relative flex flex-col overflow-hidden rounded-2xl p-7 shadow-float sm:p-10",
        )}
      >
        <DynamicIcon
          name={item.icon}
          strokeWidth={0.6}
          className="pointer-events-none absolute -bottom-16 -right-16 size-80 opacity-[0.13] transition-transform duration-[1.4s] ease-out-expo group-hover:-rotate-12 group-hover:scale-110"
        />
        <div className="flex items-center justify-between">
          <span className={cn("grid size-14 place-items-center rounded-2xl", skin.icon)}>
            <DynamicIcon name={item.icon} className="size-6" />
          </span>
          <span className="font-mono text-sm tabular-nums">
            {String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>
        <div className="mt-auto grid gap-4">
          <h3 className="font-display text-[clamp(2rem,3.4vw,3.25rem)] font-bold leading-[0.95] tracking-[-0.04em]">
            {item.title}
          </h3>
          <p className={cn("max-w-sm text-lg leading-relaxed", skin.muted)}>{item.text}</p>
          {item.href && (
            <Link
              href={item.href}
              className={cn(
                "mt-2 inline-flex w-fit items-center gap-2 border-b pb-1 font-medium transition-[gap] duration-300 hover:gap-3",
                skin.line,
              )}
            >
              Saber más<span className="sr-only"> sobre {item.title}</span>
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </article>
    );
  });

  return (
    <div data-theme="dark" className="bg-canvas py-20 text-fg lg:py-0">
      <HorizontalSlides label={data.title ?? eyebrow} slides={[intro, ...slides]} />
    </div>
  );
}
