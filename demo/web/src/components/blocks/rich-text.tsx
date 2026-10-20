import { Reveal } from "@/components/motion/reveal";
import type { BlockDataMap } from "@/lib/api/types";
import { sanitizeRichText } from "@/lib/sanitize";

/** Bloque `richText`: título fijo a la izquierda y texto con tipografía editorial. */
export function RichText({ data }: { data: BlockDataMap["richText"] }) {
  return (
    <section data-theme="light" className="bg-canvas py-20 text-fg sm:py-28">
      <div className="container-site grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-20">
        {data.title && (
          <Reveal className="lg:sticky lg:top-32 lg:self-start">
            <h2 className="font-display text-display-md font-bold tracking-[-0.04em]">{data.title}</h2>
          </Reveal>
        )}
        <Reveal delay={0.1} className={data.title ? undefined : "lg:col-start-2"}>
          <div className="prose-nexo" dangerouslySetInnerHTML={{ __html: sanitizeRichText(data.html) }} />
        </Reveal>
      </div>
    </section>
  );
}
