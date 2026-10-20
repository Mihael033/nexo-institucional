import { describe, expect, it } from "vitest";
import { htmlToAccentText } from "./text";

describe("htmlToAccentText", () => {
  it("quita etiquetas y marca palabras en strong/em", () => {
    expect(htmlToAccentText("<p>Somos <strong>simples y rápidos</strong>, con <em>soporte</em>.</p>")).toBe(
      "Somos *simples* *y* *rápidos*, con *soporte*.",
    );
  });
  it("decodifica entidades básicas y colapsa espacios", () => {
    expect(htmlToAccentText("<p>A&nbsp;&amp;&nbsp;B</p>\n<p>C</p>")).toBe("A & B C");
  });
});
