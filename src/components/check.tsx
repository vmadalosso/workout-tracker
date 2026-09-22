"use client";

import { Check } from "lucide-react";

/** Só o quadradinho. Quem captura o toque é o botão ao redor. */
export function CheckBox({ checked, large = false }: { checked: boolean; large?: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-lg border transition-colors duration-150 ${
        large ? "h-9 w-9" : "h-7 w-7"
      } ${checked ? "border-accent bg-accent" : "border-control bg-transparent"}`}
    >
      <Check
        strokeWidth={3.5}
        className={`text-accent-ink transition-transform duration-150 ${
          large ? "h-5 w-5" : "h-4 w-4"
        } ${checked ? "scale-100" : "scale-0"}`}
      />
    </span>
  );
}

/** Checkbox solto, para o cabeçalho do card. */
export function CheckButton({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className="active:bg-bg/40 -m-2 grid h-13 w-13 shrink-0 place-items-center rounded-xl p-2 transition-colors"
    >
      <CheckBox checked={checked} large />
    </button>
  );
}
