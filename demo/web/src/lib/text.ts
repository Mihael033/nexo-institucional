/**
 * HTML simple → texto para WordReveal: lo que viene en <strong>/<em> se marca con *asteriscos*
 * (palabra por palabra) para resaltarlo con el acento.
 */
export function htmlToAccentText(html: string): string {
  return html
    .replace(/<(strong|em)>(.*?)<\/\1>/gi, (_, __, inner: string) =>
      inner
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => `*${w}*`)
        .join(" "),
    )
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
