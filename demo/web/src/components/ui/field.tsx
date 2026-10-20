import type { ComponentProps, ReactNode } from "react";
import { Label as LabelPrimitive } from "radix-ui";
import { cn } from "@/lib/cn";

const control = [
  "w-full rounded-md border border-line-strong bg-surface px-3.5 text-fg placeholder:text-muted",
  "transition-[border-color,box-shadow] duration-150",
  "hover:border-fg/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/20",
].join(" ");

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input data-slot="input" className={cn(control, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(control, "min-h-32 py-3 leading-relaxed", className)} {...props} />;
}

/** Select nativo estilizado: accesible y cómodo en móvil sin JS extra. */
export function NativeSelect({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select data-slot="select" className={cn(control, "h-11 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
      >
        <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn("text-sm font-medium text-fg", className)} {...props} />;
}

/** Props accesibles para un control dentro de <Field>: id, aria-invalid y aria-describedby. */
export function fieldA11y(id: string, opts: { error?: string; hint?: string | boolean } = {}) {
  const describedBy = [opts.hint && !opts.error && `${id}-hint`, opts.error && `${id}-error`]
    .filter(Boolean)
    .join(" ");
  return {
    id,
    "aria-invalid": opts.error ? true : undefined,
    "aria-describedby": describedBy || undefined,
  } as const;
}

type FieldProps = {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Etiqueta + control + ayuda + error.
 * Uso: `<Field id="email" label="Correo" error={err}><Input {...fieldA11y("email", { error: err })} /></Field>`
 */
export function Field({ id, label, error, hint, required, className, children }: FieldProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-sm font-medium text-danger">
          <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7v6M12 16.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
