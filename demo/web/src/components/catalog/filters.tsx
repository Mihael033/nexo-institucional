"use client";

import { Slider } from "radix-ui";
import { useId, useState, type ReactNode } from "react";
import { Checkbox, Switch } from "@/components/ui/checkbox";
import type { ProductCondition, ProductFacets } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatCompactBs } from "@/lib/format";
import { positionToPrice, priceToPosition, SLIDER_STEPS } from "@/lib/catalog/price-scale";
import { useCatalog } from "./catalog-provider";

/** Panel de filtros (sidebar en desktop, contenido del Sheet en móvil). */
export function FilterPanel({ facets }: { facets: ProductFacets }) {
  const { query, update } = useCatalog();
  const toggle = (list: string[] | undefined, value: string) =>
    list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value];


  return (
    <div className="grid gap-8">
      <Group title="Categoría">
        {facets.categories.map((c) => (
          <CheckRow
            key={c.slug}
            label={c.name}
            count={c.count}
            checked={!!query.category?.includes(c.slug)}
            onChange={() => update({ category: toggle(query.category, c.slug) })}
          />
        ))}
      </Group>

      <Group title="Precio">
        <PriceRange
          key={`${query.minPrice ?? ""}-${query.maxPrice ?? ""}`}
          bounds={facets.price}
          value={[query.minPrice, query.maxPrice]}
          onCommit={(min, max) =>
            update({
              minPrice: min <= facets.price.min ? undefined : min,
              maxPrice: max >= facets.price.max ? undefined : max,
            })
          }
        />
      </Group>

      <Group title="Disponibilidad">
        <SwitchRow
          label="Solo con stock"
          hint={`${facets.availability.available} disponibles`}
          checked={!!query.available}
          onChange={(v) => update({ available: v || undefined })}
        />
      </Group>

      <Group title="Estado">
        <Segmented
          label="Estado del producto"
          value={query.condition ?? "all"}
          options={[
            { value: "all", label: "Todos" },
            ...facets.conditions.map((c) => ({ value: c.value, label: `${c.label} (${c.count})` })),
          ]}
          onChange={(v) => update({ condition: v === "all" ? undefined : (v as ProductCondition) })}
        />
      </Group>

      <Group title="Marca">
        <div className="flex flex-wrap gap-2">
          {facets.brands.map((b) => {
            const on = !!query.brand?.includes(b.value);
            return (
              <button
                key={b.value}
                type="button"
                aria-pressed={on}
                onClick={() => update({ brand: toggle(query.brand, b.value) })}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm transition-all duration-300 active:scale-95",
                  on ? "border-fg bg-fg text-canvas" : "border-line-strong hover:border-fg",
                )}
              >
                {b.value} <span className={cn("tabular-nums", on ? "opacity-70" : "text-muted")}>{b.count}</span>
              </button>
            );
          })}
        </div>
      </Group>

      {/* Atributos dinámicos de GET /products/facets: pocos valores → chips; si no, lista con casillas. */}
      {facets.attributes.map((attr) => {
        const chips = attr.values.length <= 6 && attr.values.every((v) => v.value.length <= 12);
        return (
          <Group key={attr.key} title={attr.label}>
            {chips ? (
              <div className="flex flex-wrap gap-2">
                {attr.values.map((v) => {
                  const token = `${attr.key}:${v.value}`;
                  const on = !!query.attr?.includes(token);
                  return (
                    <button
                      key={token}
                      type="button"
                      aria-pressed={on}
                      onClick={() => update({ attr: toggle(query.attr, token) })}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-sm transition-all duration-300 active:scale-95",
                        on ? "border-fg bg-fg text-canvas" : "border-line-strong hover:border-fg",
                      )}
                    >
                      {attrValueLabel(attr.key, v.value)}{" "}
                      <span className={cn("tabular-nums", on ? "opacity-70" : "text-muted")}>{v.count}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              attr.values.map((v) => {
                const token = `${attr.key}:${v.value}`;
                return (
                  <CheckRow
                    key={token}
                    label={attrValueLabel(attr.key, v.value)}
                    count={v.count}
                    checked={!!query.attr?.includes(token)}
                    onChange={() => update({ attr: toggle(query.attr, token) })}
                  />
                );
              })
            )}
          </Group>
        );
      })}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <fieldset aria-labelledby={id} className="grid gap-3">
      <legend id={id} className="mb-1 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-muted">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function CheckRow({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
}) {
  const id = useId();
  return (
    <div className="group flex items-center gap-3">
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <label htmlFor={id} className="flex flex-1 cursor-pointer items-center justify-between gap-2 py-0.5 text-[0.95rem]">
        <span className="transition-transform duration-300 group-hover:translate-x-0.5">{label}</span>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs tabular-nums text-muted">{count}</span>
      </label>
    </div>
  );
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="grid cursor-pointer">
        <span className="text-[0.95rem]">{label}</span>
        <span className="text-xs text-muted">{hint}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-flow-col rounded-full bg-surface-2 p-1">
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "relative cursor-pointer rounded-full px-2 py-2 text-center text-sm transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ring",
            value === o.value ? "bg-surface font-medium text-fg shadow-card" : "text-muted hover:text-fg",
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function PriceRange({
  bounds,
  value,
  onCommit,
}: {
  bounds: { min: number; max: number };
  value: [number | undefined, number | undefined];
  onCommit: (min: number, max: number) => void;
}) {
  const [pos, setPos] = useState<[number, number]>([
    value[0] === undefined ? 0 : priceToPosition(value[0], bounds.min, bounds.max),
    value[1] === undefined ? SLIDER_STEPS : priceToPosition(value[1], bounds.min, bounds.max),
  ]);
  const min = pos[0] === 0 ? bounds.min : positionToPrice(pos[0], bounds.min, bounds.max);
  const max = pos[1] === SLIDER_STEPS ? bounds.max : positionToPrice(pos[1], bounds.min, bounds.max);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="rounded-md border border-line px-2.5 py-1.5 tabular-nums">{formatCompactBs(min)}</span>
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        <span className="rounded-md border border-line px-2.5 py-1.5 tabular-nums">{formatCompactBs(max)}</span>
      </div>
      <Slider.Root
        className="relative flex h-6 touch-none select-none items-center"
        min={0}
        max={SLIDER_STEPS}
        step={1}
        minStepsBetweenThumbs={20}
        value={pos}
        onValueChange={(v) => setPos([v[0], v[1]])}
        onValueCommit={(v) =>
          onCommit(
            v[0] === 0 ? bounds.min : positionToPrice(v[0], bounds.min, bounds.max),
            v[1] === SLIDER_STEPS ? bounds.max : positionToPrice(v[1], bounds.min, bounds.max),
          )
        }
      >
        <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-surface-2">
          <Slider.Range className="absolute h-full rounded-full bg-primary" />
        </Slider.Track>
        {[0, 1].map((i) => (
          <Slider.Thumb
            key={i}
            aria-label={i === 0 ? "Precio mínimo" : "Precio máximo"}
            aria-valuetext={formatCompactBs(i === 0 ? min : max)}
            className="block size-6 rounded-full border-2 border-primary bg-surface shadow-card transition-transform duration-200 hover:scale-110 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30 active:scale-95"
          />
        ))}
      </Slider.Root>
      <p className="text-xs text-muted">Escala logarítmica: más precisión en los precios bajos.</p>
    </div>
  );
}

/** Etiqueta legible de un valor de atributo (p. ej. garantía en meses). */
export function attrValueLabel(key: string, value: string): string {
  return key === "garantiaMeses" ? `${value} meses` : value;
}
