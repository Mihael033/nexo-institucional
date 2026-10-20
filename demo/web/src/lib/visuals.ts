import {
  AirVent,
  Building2,
  Archive,
  Armchair,
  Cable,
  Car,
  CarFront,
  Bike,
  Bus,
  Disc3,
  Drill,
  Droplets,
  Fan,
  FileCheck,
  Flame,
  Gauge,
  HardHat,
  LampDesk,
  Library,
  type LucideIcon,
  Microwave,
  Network,
  Newspaper,
  Package,
  Plug,
  Presentation,
  RadioTower,
  Refrigerator,
  Router,
  Server,
  ShieldCheck,
  Sofa,
  Tractor,
  Truck,
  Users,
  Warehouse,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";
import { normalize } from "@/lib/catalog/query";

/**
 * Visuales propios en lugar de fotos: el seed usa imágenes aleatorias de picsum.photos que no
 * corresponden al producto (un cuatriciclo con caballos). Esas URLs se tratan como "sin imagen"
 * y se dibuja una ilustración del design system. Una imagen real (cargada en el panel) se muestra tal cual.
 */
export function isPlaceholderImage(url: string | null | undefined): boolean {
  if (!url) return true;
  try {
    const host = new URL(url).hostname;
    return host === "picsum.photos" || host.endsWith(".picsum.photos");
  } catch {
    return true;
  }
}

export type VisualTheme = {
  /** Fondo (gradiente) */
  bg: string;
  /** Color del ícono y textos */
  fg: string;
  /** Acento (nodos, anillos) */
  accent: string;
};

const THEMES = {
  cobalt: { bg: "radial-gradient(120% 90% at 20% 10%, #6f86ff 0%, #2340f0 45%, #0f1a6b 100%)", fg: "#ffffff", accent: "#d4ff3a" },
  paper: { bg: "radial-gradient(120% 90% at 20% 10%, #ffffff 0%, #f4f2ec 40%, #ddd6c4 100%)", fg: "#0b0d12", accent: "#2340f0" },
  ember: { bg: "radial-gradient(120% 90% at 20% 10%, #ffb199 0%, #ff5a36 45%, #a8290f 100%)", fg: "#0b0d12", accent: "#fff4e0" },
  lime: { bg: "radial-gradient(120% 90% at 20% 10%, #f3ffc4 0%, #d4ff3a 45%, #8db812 100%)", fg: "#0b0d12", accent: "#2340f0" },
  ink: { bg: "radial-gradient(120% 90% at 20% 10%, #2a3142 0%, #12151d 50%, #07080c 100%)", fg: "#f2f1ec", accent: "#d4ff3a" },
} satisfies Record<string, VisualTheme>;

export type ThemeName = keyof typeof THEMES;

const CATEGORY_THEME: Record<string, ThemeName> = {
  "equipos-de-red": "cobalt",
  "mobiliario-de-oficina": "paper",
  herramientas: "ember",
  electrodomesticos: "lime",
  vehiculos: "ink",
};

const CATEGORY_ICON: Record<string, LucideIcon> = {
  "equipos-de-red": Network,
  "mobiliario-de-oficina": Armchair,
  herramientas: Wrench,
  electrodomesticos: Plug,
  vehiculos: Truck,
};

/** Palabra clave en el nombre (normalizado, sin acentos) → ícono. El orden importa. */
const PRODUCT_ICONS: [RegExp, LucideIcon][] = [
  [/router/, Router],
  [/switch/, Network],
  [/access point|wifi|wi-fi/, Wifi],
  [/onu|gpon|antena|radio/, RadioTower],
  [/rack|servidor/, Server],
  [/cable|utp/, Cable],
  [/escritorio/, LampDesk],
  [/silla/, Armchair],
  [/archivero|archivo/, Archive],
  [/mesa/, Presentation],
  [/estante|biblioteca/, Library],
  [/sofa/, Sofa],
  [/taladro/, Drill],
  [/amoladora|sierra|disco/, Disc3],
  [/llave/, Wrench],
  [/escalera|casco/, HardHat],
  [/generador/, Zap],
  [/compresor/, Gauge],
  [/aire acondicionado|split/, AirVent],
  [/heladera|refrigerador/, Refrigerator],
  [/microondas/, Microwave],
  [/termo|calefon/, Flame],
  [/ventilador/, Fan],
  [/purificador|agua/, Droplets],
  [/moto/, Bike],
  [/cuatriciclo|tractor/, Tractor],
  [/furgon|minibus|bus/, Bus],
  [/camion/, Truck],
  [/hilux|camioneta|pickup/, CarFront],
  [/vitz|auto|sedan/, Car],
];

export function productTheme(categorySlug: string): VisualTheme {
  return THEMES[CATEGORY_THEME[categorySlug] ?? "ink"];
}

export function productIcon(name: string, categorySlug: string): LucideIcon {
  const n = normalize(name);
  return PRODUCT_ICONS.find(([re]) => re.test(n))?.[1] ?? CATEGORY_ICON[categorySlug] ?? Package;
}

export function categoryIcon(categorySlug: string): LucideIcon {
  return CATEGORY_ICON[categorySlug] ?? Package;
}

/* --------------------------------------------- Visuales de marca (sin producto) */

const SCENE_ICONS: [RegExp, LucideIcon][] = [
  [/deposito|almacen|distribucion|logistic/, Warehouse],
  [/camion|reparto|entrega|ruta/, Truck],
  [/tecnico|rack|red|configur/, Server],
  [/reunion|cliente|equipo|personas|asesor/, Users],
  [/licitacion|documento|compra|contratacion|guia/, FileCheck],
  [/mantenimiento|soporte|servicio/, Wrench],
  [/oficinas|sede|edificio/, Building2],
  [/mobiliario|ergonomic|silla/, Armchair],
  [/garantia|seguridad/, ShieldCheck],
  [/noticia|prensa/, Newspaper],
];

const SCENE_THEMES: ThemeName[] = ["cobalt", "ink", "lime", "paper", "ember"];

/** Hash estable (FNV-1a) para elegir tema y composición de forma determinista. */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function sceneFor(text: string): { theme: VisualTheme; icon: LucideIcon | null; seed: number } {
  const n = normalize(text);
  const seed = hashString(n);
  return {
    theme: THEMES[SCENE_THEMES[seed % SCENE_THEMES.length]],
    icon: SCENE_ICONS.find(([re]) => re.test(n))?.[1] ?? null,
    seed,
  };
}

/** Color de texto legible sobre un fondo hex (#rrggbb): tinta sobre claros, blanco sobre oscuros. */
export function textOn(hex: string): "#0b0d12" | "#ffffff" {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Contraste contra tinta (#0b0d12, L≈0.004) vs contra blanco (L=1): elige el mayor.
  return (luminance + 0.05) / 0.054 >= 1.05 / (luminance + 0.05) ? "#0b0d12" : "#ffffff";
}
