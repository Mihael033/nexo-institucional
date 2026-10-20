import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";
import { ContentImage } from "@/components/visuals/brand-visual";
import type { NewsSummary } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

export function NewsCard({ news, large, className }: { news: NewsSummary; large?: boolean; className?: string }) {
  return (
    <article className={cn("group relative flex h-full flex-col", className)}>
      <div className={cn("relative overflow-hidden rounded-xl bg-surface-2", large ? "aspect-[16/10]" : "aspect-[4/3]")}>
        <ViewTransition name={`news-${news.slug}`} share="morph" default="none">
          <div className="absolute inset-0 transition-transform duration-[1.4s] ease-out-expo group-hover:scale-105">
            <ContentImage
              image={news.coverImage}
              caption={false}
              sizes={large ? "(min-width:1024px) 60vw, 92vw" : "(min-width:1024px) 30vw, 92vw"}
            />
          </div>
        </ViewTransition>
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <span
          aria-hidden="true"
          className="absolute right-4 top-4 grid size-11 -rotate-45 scale-75 place-items-center rounded-full bg-lime text-ink opacity-0 transition-all duration-500 ease-spring group-hover:rotate-0 group-hover:scale-100 group-hover:opacity-100"
        >
          <ArrowUpRight className="size-5" />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 pt-5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-muted">
          <time dateTime={news.publishedAt}>{formatDate(news.publishedAt)}</time>
          {news.tags.slice(0, 2).map((t) => (
            <span key={t} className="before:mr-3 before:content-['·']">
              {t}
            </span>
          ))}
        </p>
        <h3
          className={cn(
            "font-display font-semibold leading-tight tracking-[-0.03em]",
            large ? "text-[clamp(1.6rem,3vw,2.6rem)]" : "text-xl",
          )}
        >
          <Link
            href={`/noticias/${news.slug}`}
            className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_2px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 ease-out-expo after:absolute after:inset-0 group-hover:bg-[length:100%_2px] focus-visible:outline-none after:focus-visible:rounded-xl after:focus-visible:outline-3 after:focus-visible:outline-offset-4 after:focus-visible:outline-ring"
          >
            {news.title}
          </Link>
        </h3>
        <p className="text-muted">{news.excerpt}</p>
      </div>
    </article>
  );
}
