import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Tabla de datos: el contenedor hace scroll horizontal en pantallas chicas. */
export function Table({ className, caption, children, ...props }: ComponentProps<"table"> & { caption?: string }) {
  return (
    <div className="relative w-full overflow-x-auto rounded-lg border border-line bg-surface">
      <table className={cn("w-full caption-bottom border-collapse text-sm", className)} {...props}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function THead({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("bg-surface-2/60 [&_tr]:border-b [&_tr]:border-line", className)} {...props} />;
}

export function TBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TR({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      className={cn("border-b border-line transition-colors hover:bg-surface-2/50 data-[selected=true]:bg-info-soft", className)}
      {...props}
    />
  );
}

export function TH({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn("h-11 whitespace-nowrap px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted", className)}
      {...props}
    />
  );
}

export function TD({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 align-middle", className)} {...props} />;
}
