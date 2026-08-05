import { useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import {
  ORBIT_PITCH_SENS,
  ORBIT_YAW_SENS,
  type EngineConfig,
  statusLine,
} from "../engine/types";
import type { EngineSnapshot } from "../engine/useEngine";

type Props = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  cfg: EngineConfig;
  snap: EngineSnapshot;
  onOrbit: (yaw: number, pitch: number) => void;
  onReset: () => void;
};

export function Viewport({ canvasRef, cfg, snap, onOrbit, onReset }: Props) {
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

  const onPointerDown = (e: ReactPointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, yaw: cfg.yaw, pitch: cfg.pitch };
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    onOrbit(
      d.yaw - dx * ORBIT_YAW_SENS,
      Math.max(-0.35, Math.min(0.75, d.pitch + dy * ORBIT_PITCH_SENS)),
    );
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div className="ctp-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm text-fg-muted">
          <Sparkles className="size-4 shrink-0 text-[var(--color-lavender)]" />
          <span className="truncate font-mono text-xs tabular-nums md:text-sm">
            {snap.status === "loading" && "加载 WASM…"}
            {snap.status === "error" && (
              <span className="text-[var(--color-red)]">加载失败</span>
            )}
            {snap.status === "ready" &&
              statusLine(cfg, snap.samples, snap.passMs, snap.primCount)}
          </span>
        </div>
        <button
          type="button"
          disabled={snap.status !== "ready"}
          onClick={onReset}
          className="ctp-btn ctp-btn-ghost h-9 px-3 text-xs"
        >
          <RotateCcw className="size-3.5" />
          清空累加
        </button>
      </div>

      <div className="relative aspect-video w-full bg-[var(--color-crust)]">
        {snap.status === "error" ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-[var(--color-red)]">
            {snap.error}
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="h-full w-full cursor-grab touch-none object-contain active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        )}
        {snap.status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-base)_80%,transparent)] text-sm text-fg-muted">
            正在初始化渲染器…
          </div>
        )}
      </div>
      <p className="border-t border-border px-4 py-2.5 text-xs text-fg-subtle">
        拖拽环绕预览 · 下方 AOV 条可点进合成
      </p>
    </div>
  );
}
