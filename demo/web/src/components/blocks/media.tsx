import { Parallax } from "@/components/motion/parallax";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { ContentImage } from "@/components/visuals/brand-visual";
import type { BlockDataMap } from "@/lib/api/types";
import { cn } from "@/lib/cn";

/** Bloque `image`: imagen a todo el ancho con parallax y pie de foto. */
export function ImageBlock({ data }: { data: BlockDataMap["image"] }) {
  return (
    <section className="bg-canvas py-10 text-fg">
      <figure className="container-site">
        <Reveal y={50} blur={0} className="relative h-[60vh] min-h-72 overflow-hidden rounded-2xl">
          <Parallax offset={60} className="absolute inset-0">
            <div className="relative h-[125%] -translate-y-[10%]">
              <ContentImage image={data.image} sizes="100vw" />
            </div>
          </Parallax>
        </Reveal>
        {data.caption && <figcaption className="mt-4 text-sm text-muted">{data.caption}</figcaption>}
      </figure>
    </section>
  );
}

const SPANS = ["sm:col-span-7 sm:row-span-2", "sm:col-span-5", "sm:col-span-5", "sm:col-span-12 lg:col-span-6", "sm:col-span-12 lg:col-span-6"];

/** Bloque `gallery`: mosaico asimétrico con zoom suave al pasar el mouse. */
export function GalleryBlock({ data }: { data: BlockDataMap["gallery"] }) {
  return (
    <section data-theme="light" className="bg-canvas py-20 text-fg sm:py-28">
      <div className="container-site">
        {data.title && (
          <h2 className="mb-12 font-display text-display-md font-bold tracking-[-0.04em]">{data.title}</h2>
        )}
        <RevealGroup as="ul" className="grid auto-rows-[16rem] gap-4 sm:grid-cols-12 sm:auto-rows-[15rem]">
          {data.images.map((img, i) => (
            <RevealItem as="li" key={img.url} className={cn("group relative overflow-hidden rounded-2xl", SPANS[i % SPANS.length])}>
              <ContentImage image={img} caption={false} sizes="(min-width: 640px) 50vw, 100vw" className="transition-transform duration-[1.4s] ease-out-expo group-hover:scale-105" />
              <span aria-hidden="true" className="absolute inset-x-3 bottom-3 translate-y-2 rounded-lg bg-ink/70 px-3 py-2 text-sm text-paper opacity-0 backdrop-blur transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                {img.alt}
              </span>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
