import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

/**
 * Párrafo cuyas palabras se "encienden" a medida que se hace scroll (CSS scroll-driven,
 * sin JS). Cada palabra pasa del gris (contraste AA) a su color final. Las palabras
 * marcadas con *asteriscos* se resaltan con el acento. Sin soporte o con movimiento
 * reducido, el texto queda en su color final.
 */
export function WordReveal({
  text,
  className,
  accentClassName = "text-lime",
}: {
  text: string;
  className?: string;
  accentClassName?: string;
}) {
  const words = text.split(" ");
  const plain = text.replace(/\*/g, "");

  return (
    <p className={cn("word-reveal flex flex-wrap", className)}>
      <span className="sr-only">{plain}</span>
      {words.map((raw, i) => {
        const accent = raw.startsWith("*");
        const word = raw.replace(/\*/g, "");
        const vars = { "--p": i / words.length, "--s": 1 / words.length } as CSSProperties;
        return (
          <span key={i} aria-hidden="true" className="mr-[0.25em] inline-block">
            <span
              style={vars}
              className={cn("word-reveal__w inline-block", accent && ["font-serif font-normal italic tracking-normal", accentClassName])}
            >
              {word}
            </span>
          </span>
        );
      })}
    </p>
  );
}
