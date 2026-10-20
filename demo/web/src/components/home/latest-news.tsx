import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { NewsCard } from "@/components/news/news-card";
import type { NewsSummary } from "@/lib/api/types";

export function LatestNews({ news }: { news: NewsSummary[] }) {
  if (!news.length) return null;
  const [first, ...rest] = news;
  return (
    <section data-theme="light" aria-labelledby="noticias-title" className="bg-canvas py-24 text-fg sm:py-32">
      <div className="container-site">
        <div className="mb-12 flex items-end justify-between gap-6">
          <h2 id="noticias-title" className="font-display text-display-md font-bold tracking-[-0.04em]">
            Últimas noticias
          </h2>
          <Link href="/noticias" className="group inline-flex items-center gap-2 font-medium">
            <span className="link-underline">Todas las noticias</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
        <RevealGroup className="grid gap-x-8 gap-y-14 lg:grid-cols-[1.5fr_1fr]">
          <RevealItem>
            <NewsCard news={first} large />
          </RevealItem>
          <div className="grid gap-14">
            {rest.map((n) => (
              <RevealItem key={n.id}>
                <NewsCard news={n} />
              </RevealItem>
            ))}
          </div>
        </RevealGroup>
      </div>
    </section>
  );
}
