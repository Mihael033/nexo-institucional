import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** [1, "gap", 4, 5, 6, "gap", 12] */
export function pageWindow(current: number, total: number, around = 1): (number | "gap")[] {
  if (total <= 0) return [];
  const pages = new Set([1, total]);
  for (let p = current - around; p <= current + around; p++) if (p >= 1 && p <= total) pages.add(p);
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

type Nav = {
  /** Navegación por enlaces (SEO, botón atrás). */
  hrefFor?: (page: number) => string;
  /** Alternativa sin URL (p. ej. tablas del panel). */
  onPageChange?: (page: number) => void;
};

type Props = Nav & {
  page: number;
  totalPages: number;
  className?: string;
  label?: string;
};

const itemClass =
  "grid h-10 min-w-10 place-items-center rounded-full px-3 text-sm font-medium tabular-nums transition-colors";

function PageItem({
  to,
  total,
  current,
  label,
  hrefFor,
  onPageChange,
  children,
}: Nav & { to: number; total: number; current: boolean; label?: string; children: ReactNode }) {
  const disabled = to < 1 || to > total;
  const cls = cn(
    itemClass,
    current ? "bg-fg text-canvas" : "text-fg hover:bg-surface-2",
    disabled && "pointer-events-none opacity-40",
  );
  if (disabled)
    return (
      <span className={cls} aria-hidden="true">
        {children}
      </span>
    );
  if (hrefFor)
    return (
      <Link
        href={hrefFor(to)}
        scroll={false}
        className={cls}
        aria-label={label}
        aria-current={current ? "page" : undefined}
        onClick={
          onPageChange
            ? (e) => {
                // Con ambos: enlace real (rastreable, abrir en pestaña) pero navegación controlada.
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                onPageChange(to);
              }
            : undefined
        }
      >
        {children}
      </Link>
    );
  return (
    <button
      type="button"
      onClick={() => onPageChange?.(to)}
      className={cls}
      aria-label={label}
      aria-current={current ? "page" : undefined}
    >
      {children}
    </button>
  );
}

export function Pagination({ page, totalPages, hrefFor, onPageChange, className, label = "Paginación" }: Props) {
  if (totalPages <= 1) return null;
  const nav = { hrefFor, onPageChange, total: totalPages };

  return (
    <nav aria-label={label} className={cn("flex items-center justify-center gap-1", className)}>
      <PageItem {...nav} to={page - 1} current={false} label="Página anterior">
        <ChevronLeft className="size-4" aria-hidden="true" />
      </PageItem>
      {pageWindow(page, totalPages).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-muted" aria-hidden="true">
            …
          </span>
        ) : (
          <PageItem key={p} {...nav} to={p} current={p === page}>
            <span className="sr-only">Página </span>
            {p}
          </PageItem>
        ),
      )}
      <PageItem {...nav} to={page + 1} current={false} label="Página siguiente">
        <ChevronRight className="size-4" aria-hidden="true" />
      </PageItem>
    </nav>
  );
}
