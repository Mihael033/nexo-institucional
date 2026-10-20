import Image from "next/image";
import { createElement, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { isPlaceholderImage, productIcon, productTheme, textOn, type VisualTheme } from "@/lib/visuals";

/**
 * Ilustración de producto generada con el design system (sin fotos): gradiente de la categoría,
 * grilla, red de nodos y el ícono del tipo de producto. Escala con container queries (cqw),
 * así sirve igual para una miniatura de 56 px que para la galería del detalle.
 * Decorativa: el nombre accesible lo da la tarjeta o la galería que la contiene.
 *
 * Variantes (para la galería): 0 = producto, 1 = primer plano con nombre, 2 = ficha técnica.
 */
export function ProductVisual({
  name,
  categorySlug,
  categoryName,
  code,
  variant = 0,
  className,
}: {
  name: string;
  categorySlug: string;
  categoryName?: string;
  /** Texto chico de esquina, p. ej. el id ("Nº 07"). */
  code?: string | number;
  variant?: number;
  className?: string;
}) {
  const theme = productTheme(categorySlug);
  // createElement: el ícono sale de un mapa estático (no es un componente creado en el render).
  const icon = productIcon(name, categorySlug);
  const v = ((variant % 3) + 3) % 3;

  return (
    <div
      aria-hidden="true"
      className={cn("@container relative isolate size-full overflow-hidden select-none", className)}
      style={{ background: theme.bg, color: theme.fg }}
    >
      <Grid dense={v === 2} />

      {v === 0 && (
        <>
          <Rings theme={theme} />
          <Nodes theme={theme} className="absolute right-[6cqw] top-[6cqw] w-[24cqw]" />
          {createElement(icon, {
            strokeWidth: 1.15,
            className: "absolute left-1/2 top-1/2 size-[32cqw] -translate-x-1/2 -translate-y-1/2",
            style: { filter: "drop-shadow(0 2.5cqw 4cqw rgb(0 0 0 / 0.28))" },
          })}
        </>
      )}

      {v === 1 && (
        <>
          {createElement(icon, {
            strokeWidth: 0.8,
            className: "absolute -bottom-[22cqw] -right-[14cqw] size-[86cqw] opacity-90",
            style: { filter: "drop-shadow(0 3cqw 6cqw rgb(0 0 0 / 0.25))" },
          })}
          <p className="absolute left-[6cqw] top-[6cqw] max-w-[62cqw] font-display text-[8.5cqw] font-extrabold leading-[0.95] tracking-[-0.04em]">
            {name}
          </p>
          <span className="absolute left-[6cqw] top-[calc(6cqw+20cqw)] h-[0.8cqw] w-[14cqw] rounded-full" style={{ background: theme.accent }} />
        </>
      )}

      {v === 2 && (
        <>
          <div
            className="absolute left-1/2 top-[46%] grid size-[46cqw] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[3cqw] border-[0.35cqw] border-dashed"
            style={{ borderColor: theme.accent }}
          >
            {createElement(icon, { strokeWidth: 1, className: "size-[30cqw]" })}
          </div>
          {/* Cota horizontal */}
          <div className="absolute bottom-[17cqw] left-1/2 flex w-[46cqw] -translate-x-1/2 items-center gap-[1.5cqw] font-mono text-[2.8cqw]">
            <span className="h-[2.4cqw] w-[0.3cqw] bg-current" />
            <span className="h-[0.3cqw] flex-1 bg-current opacity-60" />
            <span className="px-[1cqw]">FICHA</span>
            <span className="h-[0.3cqw] flex-1 bg-current opacity-60" />
            <span className="h-[2.4cqw] w-[0.3cqw] bg-current" />
          </div>
          <span
            className="absolute right-[6cqw] top-[6cqw] rounded-full px-[2.4cqw] py-[1cqw] font-mono text-[2.8cqw] uppercase tracking-[0.18em]"
            style={{ background: theme.accent, color: textOn(theme.accent) }}
          >
            Garantía local
          </span>
        </>
      )}

      {/* Rótulos de esquina: se ocultan en tamaños muy chicos */}
      {categoryName && v !== 1 && (
        <span className="absolute bottom-[5cqw] left-[5.5cqw] hidden font-mono text-[3cqw] uppercase tracking-[0.2em] opacity-80 @[12rem]:block">
          {categoryName}
        </span>
      )}
      {code !== undefined && (
        <span className="absolute bottom-[5cqw] right-[5.5cqw] hidden font-mono text-[3cqw] tabular-nums opacity-80 @[12rem]:block">
          Nº {String(code).padStart(2, "0")}
        </span>
      )}
    </div>
  );
}

function Grid({ dense }: { dense?: boolean }) {
  return (
    <div
      className="absolute inset-0"
      style={
        {
          opacity: dense ? 0.22 : 0.14,
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: dense ? "5cqw 5cqw" : "9cqw 9cqw",
          maskImage: "radial-gradient(circle at 50% 50%, #000 25%, transparent 78%)",
        } as CSSProperties
      }
    />
  );
}

function Rings({ theme }: { theme: VisualTheme }) {
  return (
    <>
      <div
        className="absolute left-1/2 top-1/2 size-[66cqw] -translate-x-1/2 -translate-y-1/2 rounded-full border-[0.3cqw]"
        style={{ borderColor: `${theme.accent}55` }}
      />
      <div
        className="absolute left-1/2 top-1/2 size-[48cqw] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: `radial-gradient(circle, ${theme.accent}40 0%, transparent 70%)` }}
      />
    </>
  );
}

/** Mini red de nodos (la "N" de Nexo desarmada): firma visual de la marca. */
function Nodes({ theme, className }: { theme: VisualTheme; className?: string }) {
  const pts: [number, number][] = [
    [8, 30],
    [30, 8],
    [52, 26],
    [74, 10],
    [92, 34],
    [64, 52],
    [36, 48],
  ];
  const links = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [2, 5],
    [5, 4],
    [0, 6],
    [6, 2],
    [6, 5],
  ];
  return (
    <svg viewBox="0 0 100 60" className={className} fill="none">
      {links.map(([a, b]) => (
        <line key={`${a}-${b}`} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} stroke="currentColor" strokeOpacity="0.45" strokeWidth="0.8" />
      ))}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 3 ? 4 : 2.4} fill={i === 3 ? theme.accent : "currentColor"} />
      ))}
    </svg>
  );
}

type ImgSource = { url: string; alt: string };

/**
 * Imagen de producto: si la URL es real, `next/image`; si es un placeholder del seed (picsum),
 * la ilustración generada. Llenar el contenedor (que debe ser `relative` con tamaño).
 */
export function ProductImage({
  image,
  product,
  variant = 0,
  sizes,
  priority,
  decorative,
  className,
}: {
  image: ImgSource;
  product: { id?: number; name: string; category: { slug: string; name: string } };
  variant?: number;
  sizes: string;
  priority?: boolean;
  /** true cuando el contexto ya nombra el producto (tarjetas): sin texto alternativo duplicado. */
  decorative?: boolean;
  className?: string;
}) {
  if (!isPlaceholderImage(image.url)) {
    return <Image src={image.url} alt={decorative ? "" : image.alt} fill sizes={sizes} priority={priority} className={cn("object-cover", className)} />;
  }
  return (
    <>
      {!decorative && <span className="sr-only">{image.alt}</span>}
      <ProductVisual
        name={product.name}
        categorySlug={product.category.slug}
        categoryName={product.category.name}
        code={product.id}
        variant={variant}
        className={cn("absolute inset-0", className)}
      />
    </>
  );
}
