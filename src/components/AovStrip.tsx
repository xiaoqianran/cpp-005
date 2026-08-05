import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { RayTracerApi } from "../engine/wasm";

/** 底部 AOV 缩略条：beauty / normal / depth */
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
      /* ignore */
    }
  }, [apiRef, samples]);

  const cell = (
    label: string,
    ref: RefObject<HTMLCanvasElement | null>,
    aov: 0 | 1 | 2,
  ) => (
    <button
      type="button"
      onClick={() => onPick?.(aov)}
      className="group flex min-w-0 flex-1 flex-col gap-1 rounded-[var(--radius-md)] border border-border bg-bg p-2 text-left hover:border-border-strong"
    >
      <span className="text-[10px] font-medium text-fg-muted group-hover:text-fg">{label}</span>
      <div className="aspect-video overflow-hidden rounded-[var(--radius-sm)] bg-black/40">
        <canvas ref={ref} className="h-full w-full object-contain" />
      </div>
    </button>
  );

  return (
    <div className="grid grid-cols-3 gap-2">
      {cell("Beauty", bRef, 0)}
      {cell("Normal", nRef, 1)}
      {cell("Depth", dRef, 2)}
    </div>
  );
}
