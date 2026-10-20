import { Skeleton } from "@/components/ui/skeleton";

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="grid gap-3 p-5">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="mt-4 h-6 w-1/3" />
      </div>
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <div className="container-site" aria-busy="true">
      <span className="sr-only" role="status">
        Cargando catálogo…
      </span>
      <div className="mb-14 flex gap-3">
        <Skeleton className="h-14 flex-1 rounded-full" />
        <Skeleton className="hidden h-14 w-56 rounded-full sm:block" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[17.5rem_1fr]">
        <div className="hidden gap-4 lg:grid lg:content-start">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-6" style={{ width: `${60 + ((i * 17) % 40)}%` }} />
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div data-theme="light" className="bg-canvas pb-24 pt-32 sm:pt-36" aria-busy="true">
      <span className="sr-only" role="status">
        Cargando producto…
      </span>
      <div className="container-site">
        <Skeleton className="h-4 w-72" />
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <Skeleton className="aspect-[4/3] rounded-2xl" />
          <div className="grid content-start gap-5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-14 w-4/5" />
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
