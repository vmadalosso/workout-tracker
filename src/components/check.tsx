"use client";

/** Só o quadradinho. Quem captura o toque é o botão ao redor. */
export function CheckBox({ checked, large = false }: { checked: boolean; large?: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-lg border leading-none font-bold transition-colors ${
        large ? "h-9 w-9 text-lg" : "h-7 w-7 text-sm"
      } ${
        checked
          ? "border-accent bg-accent text-accent-ink"
          : "border-line bg-transparent text-transparent"
      }`}
    >
      ✓
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
      className="-m-2 grid h-13 w-13 shrink-0 place-items-center rounded-xl p-2 active:bg-bg/40"
    >
      <CheckBox checked={checked} large />
    </button>
  );
}
