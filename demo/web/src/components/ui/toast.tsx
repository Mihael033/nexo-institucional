"use client";

import { Toast as ToastPrimitive } from "radix-ui";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ToastVariant = "success" | "error" | "info";
type ToastItem = { id: number; title: string; description?: string; variant: ToastVariant };
type ToastFn = (t: Omit<ToastItem, "id" | "variant"> & { variant?: ToastVariant }) => void;

const ToastContext = createContext<ToastFn | null>(null);

/** `const toast = useToast(); toast({ title: "Producto guardado", variant: "success" })` */
export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}

const ICON = { success: CheckCircle2, error: XCircle, info: Info };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback<ToastFn>((t) => {
    setItems((list) => [...list, { id: Date.now() + Math.random(), variant: "info", ...t }]);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000} label="Notificación">
        {children}
        {items.map((t) => {
          const Icon = ICON[t.variant];
          return (
            <ToastPrimitive.Root
              key={t.id}
              type={t.variant === "error" ? "foreground" : "background"}
              onOpenChange={(open) => !open && setItems((l) => l.filter((x) => x.id !== t.id))}
              className={cn(
                "grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-lg border border-line bg-surface p-4 text-fg shadow-float",
                "data-[state=open]:animate-[toast-in_320ms_var(--ease-out-expo)] data-[state=closed]:animate-[overlay-out_150ms_ease-in]",
                "data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=end]:animate-[sheet-out-right_150ms_ease-out]",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "mt-0.5 size-5",
                  t.variant === "success" && "text-success",
                  t.variant === "error" && "text-danger",
                  t.variant === "info" && "text-muted",
                )}
              />
              <div className="grid gap-0.5">
                <ToastPrimitive.Title className="text-sm font-semibold">{t.title}</ToastPrimitive.Title>
                {t.description && (
                  <ToastPrimitive.Description className="text-sm text-muted">{t.description}</ToastPrimitive.Description>
                )}
              </div>
              <ToastPrimitive.Close aria-label="Cerrar" className="rounded-full p-1 text-muted hover:bg-surface-2 hover:text-fg">
                <X className="size-4" aria-hidden="true" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[60] m-0 flex w-full max-w-sm list-none flex-col gap-2 p-4 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
