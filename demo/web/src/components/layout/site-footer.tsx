import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/ui/logo";
import type { SiteInfo } from "@/lib/api/types";
import { BackToTop } from "./back-to-top";

const SOCIAL_LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  x: "X",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
};

export function SiteFooter({ site }: { site: SiteInfo }) {
  return (
    <footer data-theme="dark" className="grain relative overflow-hidden bg-canvas pt-20 text-fg sm:pt-28">
      <div className="container-site">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="grid content-start gap-6">
            <p className="max-w-sm font-display text-display-md font-bold tracking-[-0.04em]">
              {site.slogan}
              <span className="text-lime">.</span>
            </p>
            <Link
              href="/contacto"
              className="group inline-flex w-fit items-center gap-3 rounded-full border border-line-strong py-2 pl-5 pr-2 font-medium transition-colors hover:border-lime hover:text-lime"
            >
              Iniciar una conversación
              <span className="grid size-9 place-items-center rounded-full bg-lime text-ink transition-transform duration-500 ease-spring group-hover:rotate-45">
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
          </div>

          <nav aria-label="Pie de página">
            <h2 className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-muted">Navegación</h2>
            <ul className="grid gap-3">
              {site.nav.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="link-underline text-fg/85 hover:text-fg">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-muted">Contacto</h2>
            <address className="grid gap-4 not-italic text-fg/85">
              <span className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden="true" />
                {site.contact.address}
              </span>
              <a href={`tel:${site.contact.phone.replace(/\s/g, "")}`} className="flex gap-3 hover:text-fg">
                <Phone className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden="true" />
                {site.contact.phone}
              </a>
              <a href={`mailto:${site.contact.email}`} className="flex gap-3 hover:text-fg">
                <Mail className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden="true" />
                {site.contact.email}
              </a>
              <span className="text-sm text-muted">{site.contact.hours}</span>
            </address>
          </div>

          <div>
            <h2 className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-muted">Redes</h2>
            <ul className="grid gap-3">
              {site.social.map((s) => (
                <li key={s.network}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 text-fg/85 hover:text-fg"
                  >
                    {SOCIAL_LABEL[s.network] ?? s.network}
                    <ArrowUpRight
                      className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                    <span className="sr-only">(se abre en una pestaña nueva)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Marca gigante: se recorta en el borde inferior */}
      <div className="container-site relative mt-16 sm:mt-24" aria-hidden="true">
        <div className="flex items-end gap-[2vw]">
          <LogoMark className="size-[16vw] max-h-56 max-w-56 shrink-0 text-fg" />
          <span className="translate-y-[18%] select-none font-display text-[clamp(5rem,24vw,22rem)] font-black leading-[0.75] tracking-[-0.06em] text-transparent [-webkit-text-stroke:1.5px_var(--line-strong)] [font-stretch:125%]">
            nexo
          </span>
        </div>
      </div>

      <div className="relative border-t border-line bg-canvas">
        <div className="container-site flex flex-col gap-3 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © 2026 {site.name}. Demostración: empresa ficticia.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/admin" className="hover:text-fg">
              Acceso administración
            </Link>
            <BackToTop />
          </div>
        </div>
      </div>
    </footer>
  );
}
