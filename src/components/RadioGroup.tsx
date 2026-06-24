"use client";

import { useRef, type ReactNode, type KeyboardEvent } from "react";

// Accessible single-select chooser built on the WAI-ARIA radiogroup pattern:
// only the selected option is in the tab order (roving tabindex), and arrow
// keys move both focus AND selection within the group. Home/End jump to the
// ends. Wraps around. Visuals are left entirely to the caller via render props,
// so the same keyboard behaviour backs both the methodology list and the level
// bar on the landing page.
export interface RadioGroupOption<T extends string> {
  id: T;
  // Spoken label for the option (falls back to the rendered text node).
  ariaLabel?: string;
  // Native tooltip text.
  title?: string;
  // Visual content of the radio button.
  content: ReactNode;
  // Per-state class names for the button element.
  className: string;
}

export function RadioGroup<T extends string>({
  ariaLabel,
  value,
  onChange,
  options,
  orientation = "vertical",
  className,
}: {
  ariaLabel: string;
  value: T;
  onChange: (id: T) => void;
  options: RadioGroupOption<T>[];
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function move(to: number) {
    const i = (to + options.length) % options.length;
    onChange(options[i].id);
    refs.current[i]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    const prev = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
    switch (e.key) {
      case next:
        e.preventDefault();
        move(index + 1);
        break;
      case prev:
        e.preventDefault();
        move(index - 1);
        break;
      case "Home":
        e.preventDefault();
        move(0);
        break;
      case "End":
        e.preventDefault();
        move(options.length - 1);
        break;
    }
  }

  return (
    <div role="radiogroup" aria-label={ariaLabel} className={className}>
      {options.map((opt, i) => {
        const selected = opt.id === value;
        return (
          <button
            key={opt.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={opt.ariaLabel}
            title={opt.title}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={opt.className}
          >
            {opt.content}
          </button>
        );
      })}
    </div>
  );
}
