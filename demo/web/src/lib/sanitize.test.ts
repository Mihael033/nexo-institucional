import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { sanitizeRichText } = await import("./sanitize");

describe("sanitizeRichText", () => {
  it("mantiene las etiquetas permitidas", () => {
    const html = "<p>Hola <strong>mundo</strong> <em>!</em></p><ul><li>a</li></ul><blockquote>c</blockquote>";
    expect(sanitizeRichText(html)).toBe(html);
  });

  it("elimina scripts, manejadores y estilos", () => {
    const out = sanitizeRichText('<p onclick="x()">ok</p><script>alert(1)</script><img src=x onerror=alert(1)><p style="color:red">t</p>');
    expect(out).toBe("<p>ok</p><p>t</p>");
  });

  it("bloquea javascript: en enlaces y abre externos en pestaña nueva", () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(sanitizeRichText('<a href="https://nexo.com.bo">x</a>')).toBe(
      '<a href="https://nexo.com.bo" target="_blank" rel="noopener noreferrer">x</a>',
    );
  });
});

describe("enlaces internos", () => {
  it("quita target/rel de enlaces internos (sin _blank sin noopener)", () => {
    expect(sanitizeRichText('<a href="/contacto" target="_blank" rel="opener">x</a>')).toBe('<a href="/contacto">x</a>');
  });
});
