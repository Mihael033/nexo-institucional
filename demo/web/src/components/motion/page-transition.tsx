import { ViewTransition, type ReactNode } from "react";

/**
 * Transición entre páginas con la View Transitions API (React <ViewTransition>):
 * la página saliente se desvanece hacia arriba y la nueva entra desde abajo.
 * La cabecera queda anclada (view-transition-name: site-header). Sin soporte del
 * navegador, o con movimiento reducido, el cambio es instantáneo.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
