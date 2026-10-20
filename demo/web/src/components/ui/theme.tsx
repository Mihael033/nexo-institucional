"use client";

import { Moon, Sun } from "lucide-react";
import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Tema claro/oscuro con alcance (no toca <html>): el sitio público queda intacto
 * y el panel admin envuelve su árbol en <ThemeScope>. Preferencia en localStorage
 * (`nexo-theme`), con `prefers-color-scheme` como valor inicial.
 */

export type Theme = "light" | "dark";
const KEY = "nexo-theme";
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", cb);
  };
}

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void } | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeScope>");
  return ctx;
}

/** Script anti-parpadeo: aplica el tema guardado antes de hidratar. */
const noFlash = `(()=>{try{var t=localStorage.getItem("${KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.getElementById("nexo-theme-scope").dataset.theme=t}catch(e){}})()`;

export function ThemeScope({ children, className }: { children: ReactNode; className?: string }) {
  const theme = useSyncExternalStore<Theme>(subscribe, read, () => "light");
  const setTheme = useCallback((t: Theme) => {
    try {
      localStorage.setItem(KEY, t);
    } catch {}
    listeners.forEach((l) => l());
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div
        id="nexo-theme-scope"
        data-theme={theme}
        suppressHydrationWarning
        className={cn("min-h-dvh bg-canvas text-fg", className)}
      >
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={next === "dark" ? "Activar modo oscuro" : "Activar modo claro"}
      className={cn(
        "relative grid size-10 place-items-center overflow-hidden rounded-full border border-line text-fg transition-colors hover:bg-surface-2",
        className,
      )}
    >
      <Sun aria-hidden="true" className="size-[1.15rem] transition-transform duration-500 ease-spring dark:-translate-y-8 dark:rotate-90" />
      <Moon aria-hidden="true" className="absolute size-[1.15rem] translate-y-8 -rotate-90 transition-transform duration-500 ease-spring dark:translate-y-0 dark:rotate-0" />
    </button>
  );
}
