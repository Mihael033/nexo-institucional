"use client";

import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, ViewTransition, type KeyboardEvent, type PointerEvent } from "react";
import { ProductImage } from "@/components/visuals/product-visual";
import type { Img, ProductSummary } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { MotionScope } from "@/components/motion/motion-scope";

/**
 * Galería del detalle: imagen grande con transición direccional, zoom que sigue al
 * puntero, gesto de deslizar en táctil, flechas de teclado y miniaturas.
 * La primera imagen comparte nombre de transición con la tarjeta del catálogo.
 */
function GalleryInner({
  images,
  product,
}: {
  images: Img[];
  product: Pick<ProductSummary, "id" | "slug" | "name" | "category">;
}) {
  const { slug, name } = product;
  const [[index, dir], setState] = useState<[number, number]>([0, 0]);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const reduce = useReducedMotion();
  const total = images.length;
  const go = (next: number) => setState([(next + total) % total, next > index ? 1 : -1]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") go(index + 1);
    if (e.key === "ArrowLeft") go(index - 1);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  const current = images[index];
  const img = (
    <div
      className="absolute inset-0 transition-transform duration-300 ease-out"
      style={zoom ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
    >
      <ProductImage image={current} product={product} variant={index} priority={index === 0} sizes="(min-width: 1024px) 55vw, 100vw" />
    </div>
  );

  return (
    <div className="grid gap-4" role="region" aria-roledescription="galería" aria-label={`Imágenes de ${name}`}>
      <div
        className="group relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-2xl bg-surface-2 outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
        tabIndex={0}
        onKeyDown={onKey}
        onPointerMove={onMove}
        onPointerLeave={() => setZoom(null)}
        aria-label={`Imagen ${index + 1} de ${total}. Use las flechas para navegar.`}
      >
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <m.div
            key={index}
            custom={dir}
            className="absolute inset-0"
            variants={{
              enter: (d: number) => ({ x: d >= 0 ? "100%" : "-100%", scale: 1.1 }),
              center: { x: 0, scale: 1 },
              exit: (d: number) => ({ x: d >= 0 ? "-35%" : "35%", opacity: 0.4 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
            drag={total > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(index + 1);
              else if (info.offset.x > 60) go(index - 1);
            }}
          >
            {index === 0 ? (
              <ViewTransition name={`product-${slug}`} share="morph" default="none">
                {img}
              </ViewTransition>
            ) : (
              img
            )}
          </m.div>
        </AnimatePresence>

        {total > 1 && (
          <>
            <div className="pointer-events-none absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              {[
                { label: "Imagen anterior", icon: ChevronLeft, to: index - 1 },
                { label: "Imagen siguiente", icon: ChevronRight, to: index + 1 },
              ].map(({ label, icon: Icon, to }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  onClick={() => go(to)}
                  className="pointer-events-auto grid size-11 place-items-center rounded-full bg-paper/90 text-ink shadow-float backdrop-blur transition-transform hover:scale-110 active:scale-95"
                >
                  <Icon className="size-5" aria-hidden="true" />
                </button>
              ))}
            </div>
            <p className="absolute left-4 top-4 rounded-full bg-ink/70 px-3 py-1 font-mono text-xs text-paper backdrop-blur" aria-hidden="true">
              {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </p>
          </>
        )}
      </div>

      {total > 1 && (
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-5" aria-label="Miniaturas">
          {images.map((im, i) => (
            <li key={im.url}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Ver imagen ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-xl transition-all duration-500 ease-out-expo",
                  i === index ? "ring-2 ring-primary ring-offset-2 ring-offset-canvas" : "opacity-60 hover:opacity-100",
                )}
              >
                <ProductImage image={im} product={product} variant={i} decorative sizes="120px" />
                {i === index && (
                  <m.span layoutId="thumb-active" className="absolute inset-x-0 bottom-0 h-1 bg-primary" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Con su propio contexto de framer-motion (el resto del sitio anima con CSS). */
export function Gallery(props: { images: Img[]; product: Pick<ProductSummary, "id" | "slug" | "name" | "category"> }) {
  return (
    <MotionScope>
      <GalleryInner {...props} />
    </MotionScope>
  );
}
