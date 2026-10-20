import { Archive, Bike, Car, Network, Package, Router, Tractor, Truck } from "lucide-react";
import { describe, expect, it } from "vitest";
import { hashString, isPlaceholderImage, productIcon, productTheme, sceneFor, textOn } from "./visuals";

describe("isPlaceholderImage", () => {
  it("picsum (con o sin subdominio) y URLs vacías o inválidas son placeholder", () => {
    expect(isPlaceholderImage("https://picsum.photos/seed/prod1-1/800/600")).toBe(true);
    expect(isPlaceholderImage("https://fastly.picsum.photos/id/1/800/600.jpg")).toBe(true);
    expect(isPlaceholderImage("")).toBe(true);
    expect(isPlaceholderImage("no-es-url")).toBe(true);
  });
  it("una imagen real se respeta", () => {
    expect(isPlaceholderImage("http://localhost:5080/uploads/router.webp")).toBe(false);
  });
});

describe("productIcon", () => {
  it("elige el ícono por palabra clave del nombre (sin acentos)", () => {
    expect(productIcon("Router Wi-Fi 7", "equipos-de-red")).toBe(Router);
    expect(productIcon("Camión Isuzu NPR", "vehiculos")).toBe(Truck);
    expect(productIcon("Cuatriciclo 250cc", "vehiculos")).toBe(Tractor);
    expect(productIcon("Moto Honda CG 160", "vehiculos")).toBe(Bike);
    expect(productIcon("Toyota Vitz 2015", "vehiculos")).toBe(Car);
    expect(productIcon("Archivero metálico", "mobiliario-de-oficina")).toBe(Archive);
  });
  it("cae al ícono de la categoría y luego a uno genérico", () => {
    expect(productIcon("Equipo nuevo", "equipos-de-red")).toBe(Network);
    expect(productIcon("Algo", "categoria-nueva")).toBe(Package);
  });
});

describe("temas", () => {
  it("cada categoría tiene su tema y las desconocidas usan el oscuro", () => {
    expect(productTheme("electrodomesticos").bg).toContain("#d4ff3a");
    expect(productTheme("xyz").fg).toBe("#f2f1ec");
  });
  it("escenas deterministas", () => {
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(sceneFor("Depósito central con productos").icon).not.toBeNull();
    expect(sceneFor("Texto cualquiera")).toEqual(sceneFor("Texto cualquiera"));
  });
});

describe("textOn", () => {
  it("tinta sobre acentos claros, blanco sobre oscuros (selo legible en todos los temas)", () => {
    expect(textOn("#fff4e0")).toBe("#0b0d12");
    expect(textOn("#d4ff3a")).toBe("#0b0d12");
    expect(textOn("#2340f0")).toBe("#ffffff");
  });
});
