import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { RayTracerApi } from "../engine/wasm";

export function AovStrip({
  apiRef,
  samples,
  onPick,
}: {
  apiRef: RefObject<RayTracerApi | null>;
  samples: number;
  onPick?: (aov: 0 | 1 | 2) => void;
}) {
  const bRef = useRef<HTMLCanvasElement>(null);
  const nRef = useRef<HTMLCanvasElement>(null);
  const dRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const api = apiRef.current;
    if (!api || api.width() <= 0) return;
    const w = api.width();
    const h = api.height();
    const paint = (canvas: HTMLCanvasElement | null, data: Uint8ClampedArray) => {
      if (!canvas || data.length < w * h * 4) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.putImageData(new ImageData(new Uint8ClampedArray(data), w, h), 0, 0);
    };
    try {
      paint(bRef.current, api.rgba());
      paint(nRef.current, api.aovNormal());
      paint(dRef.current, api.aovDepth());
    } catch {
      /* */
    }
  }, [apiRef, samples]);

  const cell = (
    label: string,
    sub: string,
    ref: RefObject<HTMLCanvasElement | null>,
    aov: 0 | 1 | 2,
    accent: string,
  ) => (
    <button
      type="button"
      onClick={() => onPick?.(aov)}
      className="group flex min-w-0 flex-1 flex-col gap-1.5 rounded-[var(--radius-lg)] border border-border bg-mantle p-2.5 text-left transition hover:border-[var(--color-surface2)]"
      style={{ boxShadow: "inset 0 0 0 1px transparent" }}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[11px] font-semibold text-fg">{label}</span>
        <span className="font-mono text-[9px]" style={{ color: accent }}>
          {sub}
        </span>
      </div>
      <div className="aspect-video overflow-hidden rounded-[var(--radius-sm)] bg-crust ring-1 ring-border">
        <canvas ref={ref} className="h-full w-full object-contain" />
      </div>
    </button>
  );

  return (
    <div className="space-y-1.5">
      <p className="px-0.5 font-mono text-[10px] tracking-wide text-overlay1">
        AOV 预览 · 点击送入合成
      </p>
      <div className="grid grid-cols-3 gap-2">
        {cell("Beauty", "美", bRef, 0, "var(--color-green)")}
        {cell("Normal", "法", nRef, 1, "var(--color-blue)")}
        {cell("Depth", "深", dRef, 2, "var(--color-peach)")}
      </div>
    </div>
  );
}
