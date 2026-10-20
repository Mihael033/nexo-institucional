"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Diálogo modal (Radix): foco atrapado, Esc para cerrar, foco vuelve al disparador.
 * `Sheet` es el mismo primitivo como panel lateral (drawer).
 */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

function Overlay({ className }: { className?: string }) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-overlay backdrop-blur-[2px]",
        "data-[state=open]:animate-[overlay-in_200ms_ease-out] data-[state=closed]:animate-[overlay-out_150ms_ease-in]",
        className,
      )}
    />
  );
}

type ContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  title: ReactNode;
  description?: ReactNode;
  /** Oculta visualmente el título (sigue disponible para lectores de pantalla). */
  hideTitle?: boolean;
  footer?: ReactNode;
};

export function DialogContent({ className, title, description, hideTitle, footer, children, ...props }: ContentProps) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2",
          "grid-rows-[auto_1fr_auto] overflow-hidden rounded-xl border border-line bg-surface text-fg shadow-float",
          "data-[state=open]:animate-[dialog-in_320ms_var(--ease-out-expo)] data-[state=closed]:animate-[dialog-out_150ms_ease-in]",
          "focus-visible:outline-none",
          className,
        )}
        {...props}
      >
        <header className="flex items-start justify-between gap-4 p-5 pb-3 sm:p-6 sm:pb-3">
          <div className="grid gap-1">
            <DialogPrimitive.Title className={cn("font-display text-xl font-semibold", hideTitle && "sr-only")}>
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-sm text-muted">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            className="-mr-2 -mt-1 grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            aria-label="Cerrar"
          >
            <X className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </header>
        <div className="overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-3 border-t border-line p-4 sm:px-6">{footer}</footer>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

const sheetVariants = cva(
  "fixed z-50 flex flex-col bg-surface text-fg shadow-float focus-visible:outline-none",
  {
    variants: {
      side: {
        right:
          "inset-y-0 right-0 h-dvh w-[min(26rem,100vw-2.5rem)] border-l border-line data-[state=open]:animate-[sheet-in-right_420ms_var(--ease-out-expo)] data-[state=closed]:animate-[sheet-out-right_220ms_ease-in]",
        left: "inset-y-0 left-0 h-dvh w-[min(26rem,100vw-2.5rem)] border-r border-line data-[state=open]:animate-[sheet-in-left_420ms_var(--ease-out-expo)] data-[state=closed]:animate-[sheet-out-left_220ms_ease-in]",
        bottom:
          "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t border-line data-[state=open]:animate-[sheet-in-bottom_420ms_var(--ease-out-expo)] data-[state=closed]:animate-[sheet-out-bottom_220ms_ease-in]",
      },
    },
    defaultVariants: { side: "right" },
  },
);

type SheetProps = ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof sheetVariants> & { title: ReactNode; description?: ReactNode; footer?: ReactNode };

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({ className, side, title, description, footer, children, ...props }: SheetProps) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content className={cn(sheetVariants({ side }), className)} {...props}>
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div className="grid gap-0.5">
            <DialogPrimitive.Title className="font-display text-lg font-semibold">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-sm text-muted">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            aria-label="Cerrar"
          >
            <X className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain p-5">{children}</div>
        {footer && <footer className="flex gap-3 border-t border-line p-4">{footer}</footer>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
