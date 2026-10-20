import type { ReactNode } from "react";
import { Parallax } from "@/components/motion/parallax";
import { ContentImage } from "@/components/visuals/brand-visual";
import { Reveal } from "@/components/motion/reveal";
import { EnterLines, EnterRise } from "@/components/motion/enter-lines";
import type { Img } from "@/lib/api/types";
import { cn } from "@/lib/cn";

/** Divide un título en 2 líneas equilibradas por cantidad de caracteres. */
function balance(title: string): string[] {
  const words = title.split(" ");
  if (words.length < 3) return [title];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (diff < bestDiff) [best, bestDiff] = [i, diff];
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

/** Cabecera de páginas internas: oscura, título en máscara y (opcional) imagen con parallax. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  image,
  children,
  compact,
}: {
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  image?: Img | null;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section data-theme="dark" className="grain relative isolate overflow-hidden bg-canvas text-fg">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute -left-[15%] -top-[30%] size-[60vw] rounded-full bg-cobalt/30 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--line)_1px,transparent_1px),linear-gradient(to_bottom,var(--line)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40 [mask-image:radial-gradient(ellipse_at_top_left,#000_20%,transparent_70%)]" />
      </div>
      <div className={cn("container-site pt-36 sm:pt-44", compact ? "pb-14 sm:pb-20" : "pb-20 sm:pb-28")}>
        {eyebrow && (
          <EnterRise>
            <p className="mb-6 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.24em] text-lime">
              <span className="h-px w-10 bg-lime" aria-hidden="true" />
              {eyebrow}
            </p>
          </EnterRise>
        )}
        <EnterLines
          label={title}
          lines={balance(title)}
          delay={0.05}
          className="max-w-6xl font-display text-display-xl font-extrabold tracking-[-0.05em] [font-stretch:110%]"
        />
        {subtitle && (
          <EnterRise delay={0.3}>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">{subtitle}</p>
          </EnterRise>
        )}
        {children && (
          <EnterRise delay={0.4} className="mt-10">
            {children}
          </EnterRise>
        )}
      </div>
      {image && (
        <div className="container-site pb-6">
          <Reveal y={60} blur={0} className="relative h-[52vh] min-h-72 overflow-hidden rounded-2xl sm:h-[68vh]">
            <Parallax offset={70} className="absolute inset-0">
              <div className="relative h-[125%] -translate-y-[10%]">
                <ContentImage image={image} priority sizes="100vw" />
              </div>
            </Parallax>
          </Reveal>
        </div>
      )}
    </section>
  );
}
