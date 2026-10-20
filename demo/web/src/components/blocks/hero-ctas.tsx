import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Cta } from "@/lib/api/types";

/** Botones del bloque `hero` en páginas internas (primario lima + secundario contorno). */
export function HeroCtas({ primary, secondary }: { primary: Cta | null; secondary: Cta | null }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {primary && (
        <Link
          href={primary.href}
          className="group inline-flex h-13 items-center gap-3 rounded-full bg-lime pl-6 pr-2 font-semibold text-ink transition-shadow hover:shadow-glow"
        >
          {primary.label}
          <span className="grid size-9 place-items-center rounded-full bg-ink text-lime transition-transform duration-500 ease-spring group-hover:rotate-45">
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </span>
        </Link>
      )}
      {secondary && (
        <Link
          href={secondary.href}
          className="inline-flex h-13 items-center rounded-full border border-line-strong px-6 font-medium text-fg transition-colors hover:border-fg hover:bg-white/5"
        >
          {secondary.label}
        </Link>
      )}
    </div>
  );
}
