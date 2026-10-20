import Image from "next/image";
import { LogoMark } from "@/components/ui/logo";
import { cn } from "@/lib/cn";
import { isPlaceholderImage, sceneFor } from "@/lib/visuals";

/**
 * Composición de marca para imágenes del CMS sin foto real (portadas de noticias, hero de
 * páginas, galerías): tema, patrón e ícono se eligen de forma determinista a partir del texto
 * alternativo, así cada imagen es distinta pero coherente con lo que describe.
 */
export function BrandVisual({ label, className, caption = true }: { label: string; className?: string; caption?: boolean }) {
  const { theme, icon: Icon, seed } = sceneFor(label);
  const pattern = seed % 3;
  const rot = (seed % 7) * 8 - 24;

  return (
    <div
      aria-hidden="true"
      className={cn("@container relative isolate size-full overflow-hidden select-none", className)}
      style={{ background: theme.bg, color: theme.fg }}
    >
      {pattern === 0 && (
        // Anillos concéntricos desde una esquina
        <div className="absolute -right-[20cqw] -top-[30cqw] size-[90cqw]">
          {[1, 0.78, 0.56, 0.34].map((s) => (
            <div
              key={s}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[0.25cqw]"
              style={{ width: `${s * 100}%`, height: `${s * 100}%`, borderColor: `${theme.accent}66` }}
            />
          ))}
        </div>
      )}
      {pattern === 1 && (
        // Franjas diagonales
        <div
          className="absolute -inset-[20cqw] opacity-20"
          style={{
            transform: `rotate(${rot}deg)`,
            backgroundImage: `repeating-linear-gradient(90deg, currentColor 0 0.4cqw, transparent 0.4cqw 6cqw)`,
          }}
        />
      )}
      {pattern === 2 && (
        // Grilla con desvanecido
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
            backgroundSize: "7cqw 7cqw",
            maskImage: "radial-gradient(circle at 70% 40%, #000 20%, transparent 75%)",
          }}
        />
      )}

      <div
        className="absolute left-[58%] top-[44%] size-[44cqw] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[6cqw]"
        style={{ background: `${theme.accent}55` }}
      />

      {Icon ? (
        <Icon
          strokeWidth={1}
          className="absolute left-[58%] top-[44%] size-[30cqw] -translate-x-1/2 -translate-y-1/2"
          style={{ rotate: `${rot / 4}deg`, filter: "drop-shadow(0 2cqw 4cqw rgb(0 0 0 / 0.25))" }}
        />
      ) : (
        <LogoMark className="absolute left-[58%] top-[44%] size-[28cqw] -translate-x-1/2 -translate-y-1/2" accent={false} />
      )}

      {caption && (
        <p className="absolute bottom-[5cqw] left-[5cqw] hidden max-w-[70cqw] font-mono text-[2.6cqw] uppercase leading-snug tracking-[0.16em] opacity-85 @[16rem]:block">
          {label}
        </p>
      )}
    </div>
  );
}

/** Imagen del CMS: real → next/image; placeholder del seed → BrandVisual (llena un contenedor `relative`). */
export function ContentImage({
  image,
  sizes,
  priority,
  className,
  caption,
}: {
  image: { url: string; alt: string };
  sizes: string;
  priority?: boolean;
  className?: string;
  caption?: boolean;
}) {
  if (!isPlaceholderImage(image.url)) {
    return <Image src={image.url} alt={image.alt} fill sizes={sizes} priority={priority} className={cn("object-cover", className)} />;
  }
  return (
    <>
      <span className="sr-only">{image.alt}</span>
      <BrandVisual label={image.alt} caption={caption} className={cn("absolute inset-0", className)} />
    </>
  );
}
