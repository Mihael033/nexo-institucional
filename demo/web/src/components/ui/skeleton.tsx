import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Placeholder con brillo; decorativo (el contenedor anuncia la carga con aria-busy o un texto sr-only). */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--surface-2)_0%,var(--line)_50%,var(--surface-2)_100%)] bg-[length:200%_100%]",
        className,
      )}
      {...props}
    />
  );
}
