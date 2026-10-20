import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * HTML del CMS (richText y noticias). El contrato restringe a p h2 h3 ul ol li strong em a blockquote;
 * igual lo sanitizamos en el servidor antes de renderizar (defensa en profundidad contra XSS).
 */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "h2", "h3", "ul", "ol", "li", "strong", "em", "a", "blockquote", "br"],
    allowedAttributes: { a: ["href", "title", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        // Externos: pestaña nueva con noopener. Internos: sin target/rel (nunca un _blank sin noopener).
        const { href, title } = attribs;
        const base: Record<string, string> = { ...(href ? { href } : {}), ...(title ? { title } : {}) };
        const external = /^https?:\/\//.test(href ?? "");
        return { tagName, attribs: external ? { ...base, target: "_blank", rel: "noopener noreferrer" } : base };
      },
    },
  });
}
