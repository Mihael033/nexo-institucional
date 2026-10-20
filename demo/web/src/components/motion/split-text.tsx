import { Fragment, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Titular que entra línea por línea desde una máscara (efecto "persiana"), en CSS.
 * `label` es el texto completo (sr-only); las líneas animadas son aria-hidden.
 * - inView: anima al entrar en pantalla (lo dispara `RevealObserver`).
 * - sin inView: anima desde el primer paint (`enter-line`, como el hero).
 */
export function SplitLines({
  lines,
  label,
  className,
  lineClassName,
  delay = 0,
  stagger = 0.09,
  inView = false,
  as: Tag = "h1",
}: {
  lines: ReactNode[];
  label: string;
  className?: string;
  lineClassName?: string;
  delay?: number;
  stagger?: number;
  /** true → anima al entrar en pantalla; false → al montar. */
  inView?: boolean;
  as?: "h1" | "h2" | "h3" | "p";
}) {
  const vars = { "--reveal-delay": `${delay}s`, "--stagger": `${stagger}s` } as CSSProperties;
  return (
    <Tag className={className}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className={cn("block", inView && "split-lines")} data-reveal={inView ? "" : undefined} style={vars}>
        {lines.map((line, i) => (
          <span key={i} className={cn("-mb-[0.12em] block overflow-hidden pb-[0.12em]", lineClassName)}>
            <span
              className={inView ? "split-line" : "enter-line"}
              style={inView ? ({ "--line": i } as CSSProperties) : ({ "--d": `${delay + i * stagger}s` } as CSSProperties)}
            >
              {line}
            </span>
          </span>
        ))}
      </span>
    </Tag>
  );
}

/** Palabras que suben una a una al montar (para párrafos cortos o subtítulos). CSS, sin opacidad 0. */
export function SplitWords({
  text,
  className,
  delay = 0,
  stagger = 0.025,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}): ReactNode {
  const words = text.split(" ");
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <Fragment key={i}>
            <span className="enter-rise inline-block" style={{ "--d": `${delay + i * stagger}s` } as CSSProperties}>
              {w}
            </span>
            {i < words.length - 1 && " "}
          </Fragment>
        ))}
      </span>
    </span>
  );
}
