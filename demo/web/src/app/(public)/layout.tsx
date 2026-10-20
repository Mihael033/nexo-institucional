import { MotionProvider } from "@/components/motion/motion-provider";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getSite } from "@/lib/api/public";
import type { SiteInfo } from "@/lib/api/types";
import { MaybeSuspense } from "@/components/layout/maybe-suspense";

/** Navegación mínima mientras llega GET /site (o si se renderiza a pedido). */
const SHELL_SITE: SiteInfo = {
  name: "Nexo Institucional",
  slogan: "Conectamos instituciones con soluciones",
  description: "",
  contact: { address: "", phone: "", whatsapp: "", email: "", hours: "" },
  social: [],
  nav: [
    { label: "Inicio", href: "/" },
    { label: "Nosotros", href: "/nosotros" },
    { label: "Servicios", href: "/servicios" },
    { label: "Catálogo", href: "/catalogo" },
    { label: "Noticias", href: "/noticias" },
    { label: "Contacto", href: "/contacto" },
  ],
};

async function Header() {
  return <SiteHeader site={await getSite()} />;
}

async function Footer() {
  return <SiteFooter site={await getSite()} />;
}

/** Layout del sitio público: cabecera flotante, scroll suave y pie de página. */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <MotionProvider>
      <a
        href="#contenido"
        className="fixed left-4 top-3 z-50 -translate-y-24 rounded-full bg-lime px-5 py-3 font-semibold text-ink shadow-float transition-transform focus:translate-y-0"
      >
        Saltar al contenido
      </a>
      <MaybeSuspense fallback={<SiteHeader site={SHELL_SITE} />}>
        <Header />
      </MaybeSuspense>
      <main id="contenido" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <MaybeSuspense fallback={null}>
        <Footer />
      </MaybeSuspense>
    </MotionProvider>
  );
}
