import type { ReactNode } from "react";

export function Panel({
  title,
  icon,
  children,
  accent,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <div className="ctp-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
        <span style={{ color: accent || "var(--color-lavender)" }}>{icon}</span>
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center justify-between text-xs text-fg-muted">
        <span>{label}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}

export function Toggle({
  label,
  on,
  testId,
  onToggle,
}: {
  label: string;
  on: boolean;
  testId?: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onToggle}
      className={`flex h-11 w-full items-center justify-between rounded-[var(--radius-md)] border px-3 text-sm transition ${
        on
          ? "border-[color:var(--color-mauve)] bg-[color-mix(in_srgb,var(--color-mauve)_14%,transparent)] text-fg"
          : "border-border bg-base/40 text-fg-muted hover:border-border-strong"
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
          on
            ? "bg-[var(--color-mauve)] text-[var(--color-crust)]"
            : "bg-surface0 text-fg-subtle"
        }`}
      >
        {on ? "ON" : "OFF"}
      </span>
    </button>
  );
}
