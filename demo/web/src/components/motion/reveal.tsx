import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

/**
 * Revelado al entrar en pantalla sin JS por elemento: el HTML sale visible y `RevealObserver`
 * (un único IntersectionObserver en el layout) oculta solo lo que está debajo del pliegue y lo
 * revela al llegar. Así el contenido nunca depende de la hidratación (LCP) y el CSS anima
 * fade + subida + desenfoque. Ver `src/app/motion.css`.
 */

type Tag = "div" | "li" | "section" | "article" | "span";

type RevealProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  delay?: number;
  /** Desplazamiento inicial en px. */
  y?: number;
  /** Desenfoque inicial (px): da sensación de "enfocar". */
  blur?: number;
  as?: Tag;
};

/** Aparece con fade + subida al entrar en el viewport (una sola vez). */
export function Reveal({ children, delay = 0, y = 32, blur = 6, as: Comp = "div", style, ...props }: RevealProps) {
  const vars = { "--reveal-delay": `${delay}s`, "--reveal-y": `${y}px`, "--reveal-blur": `${blur}px` } as CSSProperties;
  return (
    <Comp data-reveal="" style={{ ...vars, ...style }} {...props}>
      {children}
    </Comp>
  );
}

/** Contenedor que escalona la entrada de sus <RevealItem> (hijos directos). */
export function RevealGroup({
  children,
  stagger = 0.08,
  delay = 0,
  className,
  as: Comp = "div",
}: {
  children: ReactNode;
  stagger?: number;
  delay?: number;
  className?: string;
  as?: "div" | "ul" | "ol";
}) {
  const vars = { "--stagger": `${stagger}s`, "--group-delay": `${delay}s` } as CSSProperties;
  return (
    <Comp data-reveal-group="" className={className} style={vars}>
      {children}
    </Comp>
  );
}

export function RevealItem({
  children,
  className,
  as: Comp = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  return (
    <Comp data-reveal="" data-reveal-item="" className={className}>
      {children}
    </Comp>
  );
}
