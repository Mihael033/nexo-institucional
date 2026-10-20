import { describe, expect, it } from "vitest";
import { mockProducts } from "@/lib/api/mock/products";
import { computeFacets, filterProducts, normalize, paginate, queryProducts, sortProducts } from "./query";

describe("normalize", () => {
  it("ignora mayúsculas y acentos", () => {
    expect(normalize("  Vehículos ")).toBe("vehiculos");
  });
});

describe("filterProducts", () => {
  it("busca en nombre, marca y descripción sin acentos", () => {
    const byName = filterProducts(mockProducts, { q: "router" });
    expect(byName.map((p) => p.slug)).toContain("router-wi-fi-7");
    expect(filterProducts(mockProducts, { q: "vehiculo" }).length).toBeGreaterThan(0);
    expect(filterProducts(mockProducts, { q: "illimani" }).every((p) => p.brand === "Illimani")).toBe(true);
    expect(filterProducts(mockProducts, { q: "zzz-no-existe" })).toHaveLength(0);
  });

  it("varias categorías se combinan con OR", () => {
    const res = filterProducts(mockProducts, { category: ["vehiculos", "herramientas"] });
    expect(res).toHaveLength(12);
    expect(new Set(res.map((p) => p.category.slug))).toEqual(new Set(["vehiculos", "herramientas"]));
  });

  it("marca (OR, sin distinguir mayúsculas), estado y disponibilidad", () => {
    const brands = filterProducts(mockProducts, { brand: ["chaco", "ANDES"] });
    expect(brands.every((p) => ["Chaco", "Andes"].includes(p.brand))).toBe(true);
    expect(filterProducts(mockProducts, { condition: "used" }).every((p) => p.condition === "used")).toBe(true);
    expect(filterProducts(mockProducts, { available: true }).every((p) => p.isAvailable)).toBe(true);
    expect(filterProducts(mockProducts, { featured: true }).every((p) => p.isFeatured)).toBe(true);
  });

  it("rango de precio inclusivo en Bs", () => {
    const res = filterProducts(mockProducts, { minPrice: 444, maxPrice: 1176 });
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((p) => p.priceBs >= 444 && p.priceBs <= 1176)).toBe(true);
    expect(res.map((p) => p.priceBs)).toEqual(expect.arrayContaining([444, 1176]));
  });

  it("atributos: misma clave OR, claves distintas AND", () => {
    const or = filterProducts(mockProducts, { attr: ["ubicacion:La Paz", "ubicacion:Sucre"] });
    expect(or.every((p) => ["La Paz", "Sucre"].includes(p.attributes.find((a) => a.key === "ubicacion")!.value))).toBe(true);
    const and = filterProducts(mockProducts, { attr: ["ubicacion:La Paz", "garantiaMeses:12"] });
    expect(
      and.every(
        (p) =>
          p.attributes.find((a) => a.key === "ubicacion")?.value === "La Paz" &&
          p.attributes.find((a) => a.key === "garantiaMeses")?.value === "12",
      ),
    ).toBe(true);
    expect(and.length).toBeLessThanOrEqual(or.length);
  });
});

describe("sortProducts", () => {
  it("precio ascendente y descendente", () => {
    const asc = sortProducts(mockProducts, { sort: "price_asc" }).map((p) => p.priceBs);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = sortProducts(mockProducts, { sort: "price_desc" }).map((p) => p.priceBs);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
  });

  it("más nuevos primero por defecto; relevancia sin q vuelve a newest", () => {
    const def = sortProducts(mockProducts, {});
    expect(Date.parse(def[0].createdAt)).toBeGreaterThanOrEqual(Date.parse(def[1].createdAt));
    expect(sortProducts(mockProducts, { sort: "relevance" }).map((p) => p.id)).toEqual(def.map((p) => p.id));
  });

  it("relevancia prioriza coincidencias en el nombre", () => {
    const res = sortProducts(filterProducts(mockProducts, { q: "toyota" }), { q: "toyota", sort: "relevance" });
    expect(res[0].name.toLowerCase()).toContain("toyota");
  });

  it("por nombre en español", () => {
    const names = sortProducts(mockProducts, { sort: "name_asc" }).map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "es")));
  });
});

describe("paginate / queryProducts", () => {
  it("calcula páginas y devuelve vacío fuera de rango (no es error)", () => {
    const p1 = paginate(mockProducts, 1, 9);
    expect(p1).toMatchObject({ page: 1, pageSize: 9, totalItems: 30, totalPages: 4 });
    expect(p1.items).toHaveLength(9);
    expect(paginate(mockProducts, 4, 9).items).toHaveLength(3);
    expect(paginate(mockProducts, 99, 9).items).toHaveLength(0);
  });

  it("limita pageSize a 100 y page mínimo 1", () => {
    expect(paginate(mockProducts, 0, 500)).toMatchObject({ page: 1, pageSize: 100 });
  });

  it("combina filtro + orden + página", () => {
    const res = queryProducts(mockProducts, { category: ["vehiculos"], sort: "price_asc", page: 1, pageSize: 2 });
    expect(res.totalItems).toBe(6);
    expect(res.items).toHaveLength(2);
    expect(res.items[0].priceBs).toBeLessThanOrEqual(res.items[1].priceBs);
  });
});

describe("computeFacets", () => {
  it("cuenta categorías, marcas, estados, disponibilidad, precio y atributos", () => {
    const f = computeFacets(mockProducts);
    expect(f.categories.reduce((s, c) => s + c.count, 0)).toBe(30);
    expect(f.brands.reduce((s, b) => s + b.count, 0)).toBe(30);
    expect(f.conditions.map((c) => c.label)).toEqual(["Nuevo", "Usado"]);
    expect(f.availability.available + f.availability.unavailable).toBe(30);
    expect(f.price.min).toBeLessThan(f.price.max);
    expect(f.attributes.map((a) => a.key).sort()).toEqual(["garantiaMeses", "ubicacion"]);
    expect(f.attributes.find((a) => a.key === "ubicacion")!.values.map((v) => v.value)).toContain("Santa Cruz de la Sierra");
  });
});
