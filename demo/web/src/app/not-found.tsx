import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/ui/logo";

/** 404 global (también lo usan /catalogo/[slug] y /noticias/[slug] con notFound()). */
export default function NotFound() {
  return (
    <main
      data-theme="dark"
      className="grain relative isolate grid min-h-dvh place-items-center overflow-hidden bg-canvas px-6 text-center text-fg"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 size-[70vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cobalt/25 blur-[140px]" />
      </div>
      <div className="grid justify-items-center gap-8">
        <div className="relative" aria-hidden="true">
          <span className="font-display text-[clamp(8rem,30vw,20rem)] font-black leading-none tracking-[-0.08em] text-transparent [-webkit-text-stroke:2px_var(--line-strong)]">
            404
          </span>
          <LogoMark className="absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 text-fg motion-safe:animate-[float_8s_ease-in-out_infinite]" />
        </div>
        <div className="grid gap-3">
          <h1 className="font-display text-display-md font-bold tracking-[-0.04em]">Esta conexión no existe</h1>
          <p className="mx-auto max-w-md text-lg text-muted">
            La página que busca fue movida, eliminada o el enlace está incompleto.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-lime px-6 font-semibold text-ink transition-shadow hover:shadow-glow"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Ir al inicio
          </Link>
          <Link
            href="/catalogo"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-line-strong px-6 font-medium hover:border-fg"
          >
            <Search className="size-4" aria-hidden="true" />
            Buscar en el catálogo
          </Link>
        </div>
      </div>
    </main>
  );
}
