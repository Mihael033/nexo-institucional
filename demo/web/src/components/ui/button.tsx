import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium",
    "transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out-expo",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:size-[1.1em] [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg hover:bg-primary-hover shadow-[0_10px_28px_-14px_var(--primary)]",
        secondary: "bg-surface-2 text-fg hover:bg-line",
        outline: "border border-line-strong bg-transparent text-fg hover:border-fg hover:bg-surface-2",
        ghost: "bg-transparent text-fg hover:bg-surface-2",
        accent: "bg-lime text-ink hover:bg-[#e3ff7a] hover:shadow-glow",
        inverse: "bg-fg text-canvas hover:opacity-90",
        danger: "bg-danger text-white hover:brightness-110 dark:text-ink",
        link: "rounded-none text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg active:scale-100",
      },
      size: {
        sm: "h-9 rounded-full px-4 text-sm",
        md: "h-11 rounded-full px-5 text-[0.95rem]",
        lg: "h-14 rounded-full px-7 text-base",
        icon: "size-11 rounded-full",
        "icon-sm": "size-9 rounded-full",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Renderiza el hijo (p. ej. `<Link>`) con los estilos del botón. */
    asChild?: boolean;
    loading?: boolean;
  };

export function Button({ className, variant, size, asChild, loading, disabled, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && !asChild ? (
        <>
          <Spinner className="absolute" />
          <span className="invisible inline-flex items-center gap-2">{children}</span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
}
