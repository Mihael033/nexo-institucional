import { describe, expect, it } from "vitest";
import { positionToPrice, priceToPosition, roundNice, SLIDER_STEPS } from "./price-scale";
import { countActiveFilters, parseCatalogParams, serializeCatalogParams, sortForSearch, toApiQuery } from "./url";

describe("parseCatalogParams", () => {
  it("lee listas por coma, attr repetido, números y booleanos", () => {
    const q = parseCatalogParams({
      q: " router ",
      category: "vehiculos,herramientas",
      brand: ["Chaco", "Andes"],
      condition: "used",
      available: "true",
      minPrice: "1250.50",
      maxPrice: "90000",
      attr: ["ubicacion:La Paz", "garantiaMeses:12"],
      sort: "price_desc",
      page: "3",
    });
    expect(q).toEqual({
      q: "router",
      category: ["vehiculos", "herramientas"],
      brand: ["Chaco", "Andes"],
      condition: "used",
      available: true,
      minPrice: 1250.5,
      maxPrice: 90000,
      attr: ["ubicacion:La Paz", "garantiaMeses:12"],
      sort: "price_desc",
      page: 3,
    });
  });

  it("descarta valores inválidos", () => {
    const q = parseCatalogParams({ condition: "roto", sort: "xyz", page: "-2", minPrice: "abc", attr: "sinvalor", available: "si" });
    expect(q).toMatchObject({ condition: undefined, sort: undefined, page: undefined, minPrice: undefined, available: undefined, attr: [] });
  });

  it("acepta URLSearchParams", () => {
    const q = parseCatalogParams(new URLSearchParams("attr=ubicacion:Sucre&attr=ubicacion:Tarija&page=2"));
    expect(q.attr).toEqual(["ubicacion:Sucre", "ubicacion:Tarija"]);
    expect(q.page).toBe(2);
  });
});

describe("serializeCatalogParams", () => {
  it("ida y vuelta estable; omite página 1", () => {
    const query = { q: "silla", category: ["mobiliario-de-oficina"], attr: ["ubicacion:La Paz"], page: 1, sort: "price_asc" as const };
    const sp = serializeCatalogParams(query);
    expect(sp.toString()).toBe("q=silla&category=mobiliario-de-oficina&attr=ubicacion%3ALa+Paz&sort=price_asc");
    expect(parseCatalogParams(sp)).toMatchObject({ q: "silla", category: ["mobiliario-de-oficina"], attr: ["ubicacion:La Paz"], sort: "price_asc" });
  });
});

describe("toApiQuery / countActiveFilters", () => {
  it("une listas con coma para la API", () => {
    expect(toApiQuery({ category: ["a", "b"], brand: ["X"], attr: ["k:v"] })).toMatchObject({ category: "a,b", brand: "X", attr: ["k:v"] });
  });
  it("cuenta filtros activos (precio cuenta como uno)", () => {
    expect(countActiveFilters({ q: "x", category: ["a", "b"], minPrice: 1, maxPrice: 2, available: true })).toBe(5);
    expect(countActiveFilters({})).toBe(0);
  });
});

describe("escala de precio logarítmica", () => {
  it("extremos y monotonía", () => {
    expect(positionToPrice(0, 261, 259000)).toBe(260);
    expect(positionToPrice(SLIDER_STEPS, 261, 259000)).toBe(260000);
    expect(positionToPrice(500, 261, 259000)).toBeLessThan(positionToPrice(600, 261, 259000));
  });
  it("posición ↔ precio aproximadamente inversas", () => {
    const pos = priceToPosition(5000, 261, 259000);
    expect(Math.abs(positionToPrice(pos, 261, 259000) - 5000) / 5000).toBeLessThan(0.05);
  });
  it("redondeo a 2 cifras significativas", () => {
    expect(roundNice(1234)).toBe(1200);
    expect(roundNice(48750)).toBe(49000);
    expect(roundNice(87)).toBe(87);
  });
});

describe("sortForSearch", () => {
  it("con texto: relevancia solo si no hay orden manual", () => {
    expect(sortForSearch("silla", undefined)).toBe("relevance");
    expect(sortForSearch("silla", "price_asc")).toBe("price_asc");
  });
  it("sin texto: relevancia vuelve al predeterminado, el resto se mantiene", () => {
    expect(sortForSearch(undefined, "relevance")).toBeUndefined();
    expect(sortForSearch(undefined, "oldest")).toBe("oldest");
  });
});
