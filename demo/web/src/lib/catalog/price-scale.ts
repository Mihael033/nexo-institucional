/**
 * Escala logarítmica para el slider de precio: los productos van de Bs 261 a Bs 259.000,
 * con una escala lineal casi todo el recorrido quedaría en los precios altos.
 */
export const SLIDER_STEPS = 1000;

export function positionToPrice(pos: number, min: number, max: number): number {
  if (min <= 0 || max <= min) return Math.round(min + (max - min) * (pos / SLIDER_STEPS));
  const value = min * Math.pow(max / min, pos / SLIDER_STEPS);
  return roundNice(value);
}

export function priceToPosition(price: number, min: number, max: number): number {
  if (max <= min) return price > min ? SLIDER_STEPS : 0;
  if (min <= 0 || max <= min) return Math.round(((price - min) / (max - min)) * SLIDER_STEPS);
  const clamped = Math.min(Math.max(price, min), max);
  return Math.round((Math.log(clamped / min) / Math.log(max / min)) * SLIDER_STEPS);
}

/** Redondea a 2 cifras significativas (1.234 → 1.200; 48.750 → 49.000). */
export function roundNice(value: number): number {
  if (value < 100) return Math.round(value);
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)) - 1);
  return Math.round(value / magnitude) * magnitude;
}
