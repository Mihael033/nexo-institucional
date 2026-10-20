"use client";

import { Checkbox as CheckboxPrimitive, Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer grid size-5 shrink-0 place-items-center rounded-[0.4rem] border border-line-strong bg-surface",
        "transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-fg",
        "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-fg",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25 disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true">
          {props.checked === "indeterminate" ? (
            <path d="M6 12h12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          ) : (
            <path
              d="m5 12.5 4.5 4.5L19 7.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-line-strong bg-surface-2 transition-colors",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25 disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-4.5 translate-x-0.5 rounded-full bg-fg shadow transition-transform duration-300 ease-spring data-[state=checked]:translate-x-[1.3rem] data-[state=checked]:bg-primary-fg" />
    </SwitchPrimitive.Root>
  );
}
