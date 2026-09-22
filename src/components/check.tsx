"use client";

export function Check({
  checked,
  onToggle,
  label,
  large = false,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={`grid shrink-0 place-items-center rounded-lg border leading-none font-bold transition-colors ${
        large ? "h-9 w-9 text-lg" : "h-7 w-7 text-sm"
      } ${
        checked
          ? "border-accent bg-accent text-accent-ink"
          : "border-line bg-surface-2 text-transparent active:border-muted"
      }`}
    >
      ✓
    </button>
  );
}
