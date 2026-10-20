"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

type Node = { x: number; y: number; vx: number; vy: number; r: number; hub: boolean; phase: number };
type Pulse = { a: number; b: number; t: number; speed: number };

const LINK = 150; // distancia máxima para unir nodos (px CSS)
const MOUSE_LINK = 220;

/**
 * Red de nodos en canvas: la metáfora visual de "Nexo". Los nodos derivan, se conectan
 * cuando están cerca, el puntero crea enlaces nuevos y "paquetes" de luz viajan por la red.
 * Decorativo (aria-hidden). Se pausa fuera de pantalla y con la pestaña oculta;
 * con prefers-reduced-motion dibuja un único cuadro estático.
 */
export function Constellation({ className, density = 1 }: { className?: string; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let nodes: Node[] = [];
    let pulses: Pulse[] = [];
    let raf = 0;
    let visible = true;
    let started = false;
    const mouse = { x: -9999, y: -9999, active: false };

    const seed = () => {
      const count = Math.min(120, Math.round(((w * h) / 13000) * density));
      nodes = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.4 + 0.8,
        hub: i % 11 === 0,
        phase: Math.random() * Math.PI * 2,
      }));
      pulses = [];
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduce) draw(0);
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h);

      // Enlaces entre nodos
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > LINK * LINK) continue;
          const alpha = 1 - Math.sqrt(d2) / LINK;
          ctx.strokeStyle = `rgba(242,241,236,${alpha * 0.16})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          // De vez en cuando nace un paquete de luz en un enlace corto
          if (!reduce && pulses.length < 14 && Math.random() < 0.00035) {
            pulses.push({ a: i, b: j, t: 0, speed: 0.006 + Math.random() * 0.01 });
          }
        }
      }

      // Enlaces al puntero
      if (mouse.active) {
        for (const n of nodes) {
          const dx = n.x - mouse.x;
          const dy = n.y - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d > MOUSE_LINK) continue;
          const alpha = 1 - d / MOUSE_LINK;
          ctx.strokeStyle = `rgba(212,255,58,${alpha * 0.55})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }

      // Paquetes viajando
      pulses = pulses.filter((p) => {
        p.t += p.speed;
        const a = nodes[p.a];
        const b = nodes[p.b];
        if (!a || !b || p.t >= 1) return false;
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 10);
        g.addColorStop(0, "rgba(212,255,58,0.95)");
        g.addColorStop(1, "rgba(212,255,58,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });

      // Nodos
      for (const n of nodes) {
        if (n.hub) {
          const pulse = reduce ? 0.5 : (Math.sin(time / 700 + n.phase) + 1) / 2;
          ctx.fillStyle = `rgba(212,255,58,${0.12 + pulse * 0.18})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 6 + pulse * 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#d4ff3a";
          ctx.beginPath();
          ctx.arc(n.x, n.y, 2.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "rgba(242,241,236,0.55)";
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const step = (time: number) => {
      for (const n of nodes) {
        // Atracción suave hacia el puntero
        if (mouse.active) {
          const dx = mouse.x - n.x;
          const dy = mouse.y - n.y;
          const d = Math.hypot(dx, dy);
          if (d < MOUSE_LINK && d > 1) {
            n.vx += (dx / d) * 0.012;
            n.vy += (dy / d) * 0.012;
          }
        }
        n.vx *= 0.992;
        n.vy *= 0.992;
        const speed = Math.hypot(n.vx, n.vy);
        if (speed < 0.08) {
          n.vx += (Math.random() - 0.5) * 0.02;
          n.vy += (Math.random() - 0.5) * 0.02;
        }
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = w + 20;
        if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        if (n.y > h + 20) n.y = -20;
      }
      draw(time);
      raf = requestAnimationFrame(step);
    };

    const play = () => {
      cancelAnimationFrame(raf);
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(step);
    };

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = e.pointerType === "mouse" && mouse.y >= 0 && mouse.y <= rect.height;
    };
    const onLeave = () => (mouse.active = false);

    const ro = new ResizeObserver(() => started && resize());
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (started) play();
    });
    io.observe(canvas);
    const onVisibility = () => started && play();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    // Arranca cuando el navegador está libre: no compite con la carga ni la hidratación (mejor LCP/TBT).
    const begin = () => {
      started = true;
      resize();
      play();
    };
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(begin, { timeout: 2000 })
      : window.setTimeout(begin, 1200);

    return () => {
      if (!started) (window.cancelIdleCallback ?? window.clearTimeout)(idle);
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [density]);

  return <canvas ref={ref} aria-hidden="true" className={cn("pointer-events-none block h-full w-full", className)} />;
}
