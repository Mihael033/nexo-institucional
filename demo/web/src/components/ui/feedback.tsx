import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------- Alert */

const alertVariants = cva("flex gap-3 rounded-md border p-4 text-sm [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0", {
  variants: {
    variant: {
      info: "border-line bg-info-soft text-fg",
      success: "border-success/30 bg-success-soft text-success",
      warning: "border-warning/30 bg-warning-soft text-warning",
      danger: "border-danger/30 bg-danger-soft text-danger",
    },
  },
  defaultVariants: { variant: "info" },
});

const ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle };

type AlertProps = Omit<ComponentProps<"div">, "title"> & VariantProps<typeof alertVariants> & { title?: ReactNode };

/** Mensaje en línea. Para errores usar `role="alert"`; para éxito, `role="status"`. */
export function Alert({ className, variant = "info", title, children, ...props }: AlertProps) {
  const Icon = ICONS[variant ?? "info"];
  return (
    <div className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon aria-hidden="true" />
      <div className="grid gap-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-fg/85">{children}</div>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- EmptyState */

type EmptyProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-2 grid size-14 place-items-center rounded-2xl bg-surface-2 text-fg [&_svg]:size-6" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="font-display text-xl font-semibold">{title}</p>
      {description && <p className="max-w-md text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
