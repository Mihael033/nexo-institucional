import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto de página: cabecera oscura + bloques. Se ve solo si los datos se resuelven a pedido. */
export function PageSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        Cargando…
      </span>
      <div data-theme="dark" className={tall ? "min-h-[100svh] bg-canvas pt-44" : "bg-canvas pb-24 pt-44"}>
        <div className="container-site grid gap-5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-[clamp(3rem,8vw,7rem)] w-4/5" />
          <Skeleton className="h-[clamp(3rem,8vw,7rem)] w-3/5" />
          <Skeleton className="mt-4 h-5 w-full max-w-xl" />
        </div>
      </div>
      {!tall && (
        <div data-theme="light" className="bg-canvas py-20">
          <div className="container-site grid gap-5 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
