import raw from "@/data/productos.json";
import type { Category, ProductDetail } from "../types";

/**
 * Seed de demo: los mismos 30 productos que usa la API (teste-modelos/_comum/productos.json),
 * convertidos al formato del contrato. Los IDs de categoría siguen el orden de aparición.
 */

type RawProduct = (typeof raw)[number];

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "equipos-de-red": "Conectividad confiable para oficinas, campus y sedes regionales.",
  "mobiliario-de-oficina": "Espacios de trabajo ergonómicos y durables para equipos públicos y privados.",
  herramientas: "Equipamiento profesional para mantenimiento, obras y servicios generales.",
  electrodomesticos: "Confort y eficiencia energética para oficinas, comedores y salas de espera.",
  vehiculos: "Flota liviana y pesada para logística, inspección y atención en territorio.",
};

const ATTRIBUTE_LABELS: Record<string, string> = {
  garantiaMeses: "Garantía (meses)",
  ubicacion: "Ubicación",
};

const categoryIds = new Map<string, number>();
for (const p of raw) if (!categoryIds.has(p.categoria.slug)) categoryIds.set(p.categoria.slug, categoryIds.size + 1);

function toDetail(p: RawProduct): ProductDetail {
  const images = p.imagenes.map((url, i) => ({ url, alt: `${p.nombre}, imagen ${i + 1} de ${p.imagenes.length}` }));
  return {
    id: p.id,
    slug: p.slug,
    name: p.nombre,
    brand: p.marca,
    category: { id: categoryIds.get(p.categoria.slug)!, slug: p.categoria.slug, name: p.categoria.nombre },
    priceBs: p.precioBs,
    isAvailable: p.disponible,
    condition: p.estado === "Usado" ? "used" : "new",
    isFeatured: p.destacado,
    thumbnail: images[0],
    createdAt: p.creadoEn,
    description: p.descripcion,
    images,
    attributes: Object.entries(p.atributos).map(([key, value]) => ({
      key,
      label: ATTRIBUTE_LABELS[key] ?? key,
      value: String(value),
    })),
    related: [],
    updatedAt: p.creadoEn,
  };
}

export const mockProducts: readonly ProductDetail[] = raw.map(toDetail);

export const mockCategories: readonly Category[] = [...categoryIds]
  .map(([slug, id]) => {
    const sample = raw.find((p) => p.categoria.slug === slug)!;
    return {
      id,
      slug,
      name: sample.categoria.nombre,
      description: CATEGORY_DESCRIPTIONS[slug] ?? null,
      productCount: raw.filter((p) => p.categoria.slug === slug).length,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, "es"));
