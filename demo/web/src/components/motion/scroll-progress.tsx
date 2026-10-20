/** Barra fina de progreso de lectura en el borde superior (CSS scroll-driven, sin JS). */
export function ScrollProgress({ className = "bg-lime" }: { className?: string }) {
  return <div aria-hidden="true" className={`scroll-progress fixed inset-x-0 top-0 z-50 h-[3px] origin-left ${className}`} />;
}
