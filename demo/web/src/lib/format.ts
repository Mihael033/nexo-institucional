/** Formatos es-BO centralizados (moneda, números, fechas). */

export const LOCALE = "es-BO";
export const TIME_ZONE = "America/La_Paz";

const money = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

/** 1250 → "Bs 1.250,00" */
export function formatBs(value: number): string {
  return `Bs ${money.format(value)}`;
}

/** 1250 → "1.250" */
export function formatNumber(value: number): string {
  return integer.format(value);
}

/** 259000 → "Bs 259 mil" · 1250 → "Bs 1.250" (chips y rangos, sin centavos). */
export function formatCompactBs(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `Bs ${m.toLocaleString(LOCALE, { maximumFractionDigits: m >= 10 ? 0 : 1 })} M`;
  }
  if (value >= 100_000) return `Bs ${integer.format(Math.round(value / 1_000))} mil`;
  return `Bs ${integer.format(Math.round(value))}`;
}

const dateLong = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric", timeZone: TIME_ZONE });
const dateShort = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TIME_ZONE });
const dateTime = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

/** "2 de octubre de 2026" */
export const formatDate = (iso: string) => dateLong.format(new Date(iso));
/** "02/10/2026" */
export const formatDateShort = (iso: string) => dateShort.format(new Date(iso));
/** "02/10/2026, 10:00" */
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

export const CONDITION_LABEL = { new: "Nuevo", used: "Usado" } as const;
