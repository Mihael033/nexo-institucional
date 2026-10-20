"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Logo } from "@/components/ui/logo";
import type { SiteInfo } from "@/lib/api/types";
import { cn } from "@/lib/cn";

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

// useLayoutEffect avisa en el servidor; en el cliente mide antes de pintar.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Cabecera flotante: cápsula oscura que se compacta al hacer scroll, se esconde al bajar
 * y reaparece al subir. El indicador de la sección activa se desliza entre enlaces.
 * Sin framer-motion: estados por atributos y transiciones CSS (`.site-header`, `.nav-pill`).
 * Es visible desde el primer paint (nada empieza con opacidad 0).
 */
export function SiteHeader({ site }: { site: SiteInfo }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    let prev = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 24);
        if (y > 480 && y > prev + 2) setHidden(true);
        else if (y < prev - 2 || y <= 480) setHidden(false);
        prev = y;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const nav = site.nav.filter((n) => n.href !== "/contacto");
  const active = nav.find((n) => isActive(pathname, n.href))?.href ?? null;
  const indicator = hovered ?? active;

  return (
    <header
      data-theme="dark"
      data-hidden={(hidden && !open) || undefined}
      style={{ viewTransitionName: "site-header" }}
      className="site-header fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4"
    >
      <div
        className={cn(
          "mx-auto flex h-16 max-w-(--container-site) items-center justify-between gap-4 rounded-full pl-4 pr-2 text-fg sm:pl-5",
          "border transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500",
          scrolled
            ? "border-white/10 bg-ink/75 shadow-float backdrop-blur-xl backdrop-saturate-150"
            : "border-white/5 bg-ink/80 backdrop-blur-md",
        )}
      >
        <Link href="/" title="Ir al inicio" className="rounded-full">
          <Logo />
        </Link>

        <DesktopNav nav={nav} pathname={pathname} active={active} indicator={indicator} onHover={setHovered} />

        <div className="flex items-center gap-2">
          <Link
            href="/contacto"
            className="group hidden h-12 items-center gap-2 rounded-full bg-lime pl-5 pr-2 text-[0.95rem] font-semibold text-ink transition-shadow hover:shadow-glow sm:inline-flex"
          >
            Solicitar cotización
            <span className="grid size-8 place-items-center rounded-full bg-ink text-lime transition-transform duration-500 ease-spring group-hover:rotate-45">
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </span>
          </Link>
          <MobileMenu site={site} open={open} onOpenChange={setOpen} pathname={pathname} />
        </div>
      </div>
    </header>
  );
}

function DesktopNav({
  nav,
  pathname,
  active,
  indicator,
  onHover,
}: {
  nav: SiteInfo["nav"];
  pathname: string;
  active: string | null;
  indicator: string | null;
  onHover: (href: string | null) => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);

  // Mide el enlace señalado y mueve la píldora (también al cambiar el tamaño de la ventana).
  useIsoLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const link = indicator ? list.querySelector<HTMLElement>(`a[data-href="${CSS.escape(indicator)}"]`) : null;
      if (!link) return setPill(null);
      // offsetLeft es relativo al <li> (posicionado): se suma hasta llegar a la lista, que es
      // donde vive la píldora. Offsets y no getBoundingClientRect: no los afectan transformaciones.
      let x = 0;
      for (let el: HTMLElement | null = link; el && el !== list; el = el.offsetParent as HTMLElement | null) x += el.offsetLeft;
      setPill({ x, w: link.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [indicator, pathname]);

  const pillStyle: CSSProperties = pill
    ? ({ "--pill-x": `${pill.x}px`, "--pill-w": `${pill.w}px`, "--pill-o": 1 } as CSSProperties)
    : ({ "--pill-o": 0 } as CSSProperties);

  return (
    <nav aria-label="Principal" className="hidden lg:block">
      <ul
        ref={listRef}
        data-pill-ready={pill ? "" : undefined}
        className="nav-list relative flex items-center gap-1"
        onMouseLeave={() => onHover(null)}
      >
        <span
          aria-hidden="true"
          style={pillStyle}
          className={cn("nav-pill absolute inset-y-0 left-0 rounded-full", indicator === active ? "bg-lime" : "bg-paper")}
        />
        {nav.map((item) => {
          const current = isActive(pathname, item.href);
          return (
            <li key={item.href} className="relative">
              <Link
                href={item.href}
                data-href={item.href}
                aria-current={current ? "page" : undefined}
                onMouseEnter={() => onHover(item.href)}
                onFocus={() => onHover(item.href)}
                onBlur={() => onHover(null)}
                className={cn(
                  "relative z-10 block rounded-full px-4 py-2 text-[0.92rem] font-medium transition-colors duration-300",
                  indicator === item.href ? "text-ink" : "text-fg/80 hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MobileMenu({
  site,
  open,
  onOpenChange,
  pathname,
}: {
  site: SiteInfo;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pathname: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Trigger
        className="relative grid size-12 place-items-center rounded-full bg-paper text-ink lg:hidden"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
      >
        <span aria-hidden="true" className="relative block h-3 w-5">
          <span
            className={cn(
              "absolute left-0 top-0 h-0.5 w-5 rounded bg-current transition-transform duration-500 ease-spring",
              open && "translate-y-[5px] rotate-45",
            )}
          />
          <span
            className={cn(
              "absolute bottom-0 left-0 h-0.5 w-5 rounded bg-current transition-transform duration-500 ease-spring",
              open && "-translate-y-[5px] -rotate-45",
            )}
          />
        </span>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        {/* Radix espera la animación de cierre (data-state="closed") antes de desmontar. */}
        <DialogPrimitive.Content
          data-theme="dark"
          aria-describedby={undefined}
          className="mobile-menu fixed inset-0 z-30 flex flex-col overflow-y-auto bg-ink px-6 pb-8 pt-28 text-fg lg:hidden"
        >
          <DialogPrimitive.Title className="sr-only">Menú</DialogPrimitive.Title>
          {/* Cierre dentro del diálogo (el foco queda atrapado aquí), encima del botón de la cabecera. */}
          <DialogPrimitive.Close
            aria-label="Cerrar menú"
            className="fixed right-5 top-5 z-50 grid size-12 place-items-center rounded-full bg-paper text-ink sm:right-7 sm:top-6"
          >
            <span aria-hidden="true" className="relative block h-3 w-5">
              <span className="absolute left-0 top-0 h-0.5 w-5 translate-y-[5px] rotate-45 rounded bg-current" />
              <span className="absolute bottom-0 left-0 h-0.5 w-5 -translate-y-[5px] -rotate-45 rounded bg-current" />
            </span>
          </DialogPrimitive.Close>
          <nav aria-label="Menú móvil">
            <ul className="grid gap-1">
              {site.nav.map((item, i) => (
                <li key={item.href} className="overflow-hidden">
                  <div className="mobile-menu__item" style={{ "--i": i } as CSSProperties}>
                    <Link
                      href={item.href}
                      onClick={() => onOpenChange(false)}
                      aria-current={isActive(pathname, item.href) ? "page" : undefined}
                      className="group flex items-baseline gap-4 py-1 font-display text-[clamp(2.4rem,11vw,4rem)] font-extrabold leading-[1.05] tracking-[-0.04em] [font-stretch:110%] aria-[current=page]:text-lime"
                    >
                      <span className="font-mono text-xs font-normal tracking-normal text-muted">0{i + 1}</span>
                      {item.label}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </nav>
          {site.contact.email && (
            <div className="mobile-menu__foot mt-auto grid gap-1 border-t border-line pt-6 text-sm text-muted">
              <a href={`mailto:${site.contact.email}`} className="text-fg hover:text-lime">
                {site.contact.email}
              </a>
              <a href={`tel:${site.contact.phone.replace(/\s/g, "")}`} className="hover:text-fg">
                {site.contact.phone}
              </a>
              <span>{site.contact.hours}</span>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
