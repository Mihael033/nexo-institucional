import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { ContactForm } from "@/components/contact/contact-form";
import { PageHero } from "@/components/layout/page-hero";
import { PageTransition } from "@/components/motion/page-transition";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { getPage, getSite } from "@/lib/api/public";
import { findBlock } from "@/lib/blocks";
import { ogImages } from "@/lib/site";
import { MaybeSuspense } from "@/components/layout/maybe-suspense";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("contacto");
  return {
    title: page?.seo.title ?? "Contacto",
    description: page?.seo.description,
    alternates: { canonical: "/contacto" },
    openGraph: { url: "/contacto", images: ogImages() },
  };
}

export default function ContactPage() {
  return (
    <MaybeSuspense fallback={<PageSkeleton />}>
      <ContactContent />
    </MaybeSuspense>
  );
}

async function ContactContent() {
  const [page, site] = await Promise.all([getPage("contacto"), getSite()]);
  const hero = findBlock(page, "hero");
  const info = findBlock(page, "contactInfo");
  const c = site.contact;

  const items = [
    { icon: MapPin, label: "Dirección", value: c.address, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}` },
    { icon: Phone, label: "Teléfono", value: c.phone, href: `tel:${c.phone.replace(/\s/g, "")}` },
    { icon: MessageCircle, label: "WhatsApp", value: c.whatsapp, href: `https://wa.me/${c.whatsapp.replace(/\D/g, "")}` },
    { icon: Mail, label: "Correo", value: c.email, href: `mailto:${c.email}` },
    { icon: Clock, label: "Horario", value: c.hours },
  ];

  return (
    <PageTransition>
      <PageHero
        compact
        eyebrow={hero?.eyebrow ?? "Contacto"}
        title={hero?.title ?? "Conversemos"}
        subtitle={hero?.subtitle}
      />
      <div data-theme="light" className="bg-canvas py-16 text-fg sm:py-24">
        <div className="container-site grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <aside className="grid content-start gap-8">
            <div>
              <h2 className="font-display text-display-md font-bold tracking-[-0.04em]">{info?.title ?? "Oficina central"}</h2>
              {info?.text && <p className="mt-4 max-w-md text-lg text-muted">{info.text}</p>}
            </div>
            <RevealGroup as="ul" className="grid gap-3">
              {items.map(({ icon: Icon, label, value, href }) => {
                const content = (
                  <>
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-primary transition-all duration-500 ease-spring group-hover:-rotate-6 group-hover:bg-primary group-hover:text-primary-fg">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="grid">
                      <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{label}</span>
                      <span className="font-medium">{value}</span>
                    </span>
                  </>
                );
                const cls =
                  "group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-[border-color,transform,box-shadow] duration-500 ease-out-expo";
                return (
                  <RevealItem as="li" key={label}>
                    {href ? (
                      <a
                        href={href}
                        className={`${cls} hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card`}
                        {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      >
                        {content}
                        {href.startsWith("http") && <span className="sr-only">(se abre en una pestaña nueva)</span>}
                      </a>
                    ) : (
                      <div className={cls}>{content}</div>
                    )}
                  </RevealItem>
                );
              })}
            </RevealGroup>
          </aside>

          <ContactForm />
        </div>
      </div>
    </PageTransition>
  );
}
