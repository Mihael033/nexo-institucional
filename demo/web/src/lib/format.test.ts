import { describe, expect, it } from "vitest";
import { formatBs, formatCompactBs, formatDate } from "./format";

describe("formatBs (es-BO)", () => {
  it("punto de miles, coma decimal y dos decimales", () => {
    expect(formatBs(1250)).toBe("Bs 1.250,00");
    expect(formatBs(0)).toBe("Bs 0,00");
    expect(formatBs(259000)).toBe("Bs 259.000,00");
  });
  it("redondea a centavos", () => {
    expect(formatBs(99.999)).toBe("Bs 100,00");
    expect(formatBs(12.5)).toBe("Bs 12,50");
  });
  it("formato compacto", () => {
    expect(formatCompactBs(259000)).toBe("Bs 259 mil");
    expect(formatCompactBs(1250)).toBe("Bs 1.250");
    expect(formatCompactBs(2_500_000)).toBe("Bs 2,5 M");
  });
});

describe("formatDate", () => {
  it("fecha larga en español, zona La Paz", () => {
    expect(formatDate("2026-10-02T13:00:00Z")).toBe("2 de octubre de 2026");
  });
});
