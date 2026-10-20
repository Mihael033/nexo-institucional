import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/site";

type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Ruta de navegación">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.label,
            ...(c.href ? { item: `${SITE_URL}${c.href}` } : {}),
          })),
        }}
      />
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {c.href ? (
              <Link href={c.href} className="link-underline hover:text-fg">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-fg">
                {c.label}
              </span>
            )}
            {i < items.length - 1 && <ChevronRight className="size-3.5" aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}
