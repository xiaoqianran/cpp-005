import type { Timeline } from "../animation/timeline";

type Props = {
  tl: Timeline;
  time: number;
  playing: boolean;
  exporting: boolean;
  exportProgress: string;
  onPlay: (v: boolean) => void;
  onSeek: (t: number) => void;
  onCapture: () => void;
  onReset: () => void;
  onExport: (fps: number) => void;
};

export function AnimPanel({
  tl,
  time,
  playing,
  exporting,
  exportProgress,
  onPlay,
  onSeek,
  onCapture,
  onReset,
  onExport,
}: Props) {
  return (
    <div
      className="ctp-card space-y-4 p-4 md:p-5"
      style={{ borderTop: "3px solid var(--color-pink)" }}
    >
      <div>
        <p className="font-mono text-[10px] font-semibold tracking-widest text-[var(--color-pink)]">
          03 · ANIMATION
        </p>
        <h3 className="mt-1 text-base font-semibold">相机关键帧</h3>
        <p className="mt-0.5 text-xs text-fg-muted">播放预览 · 记录关键帧 · 导出 PNG 序列</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={exporting}
          onClick={() => onPlay(!playing)}
          className="ctp-btn ctp-btn-primary"
        >
          {playing ? "暂停" : "播放"}
        </button>
        <button
          type="button"
          disabled={exporting}
          onClick={onCapture}
          className="ctp-btn ctp-btn-ghost"
        >
          记录关键帧
        </button>
        <button
          type="button"
          disabled={exporting}
          onClick={onReset}
          className="ctp-btn ctp-btn-ghost"
        >
          默认轨迹
        </button>
        <button
          type="button"
          disabled={exporting}
          onClick={() => onExport(4)}
          className="ctp-btn ctp-btn-ghost"
        >
          {exporting ? "导出中…" : "导出序列 4fps"}
        </button>
      </div>

      {exportProgress && (
        <p className="font-mono text-[11px] text-[var(--color-pink)]">{exportProgress}</p>
      )}

      <label className="block space-y-2">
        <span className="text-[11px] text-fg-muted">
          时间{" "}
          <span className="font-mono text-[var(--color-lavender)]">{time.toFixed(2)}s</span> /{" "}
          {tl.duration.toFixed(1)}s · 关键帧 {tl.keys.length}
        </span>
        <input
          type="range"
          min={0}
          max={tl.duration}
          step={0.05}
          value={time}
          disabled={exporting}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full"
        />
      </label>

      <ul className="max-h-28 space-y-1 overflow-y-auto rounded-[var(--radius-md)] border border-border bg-crust/50 p-2 font-mono text-[10px] text-overlay1">
        {tl.keys.map((k, i) => (
          <li key={i}>
            t={k.t.toFixed(1)} yaw={k.yaw.toFixed(2)} pitch={k.pitch.toFixed(2)} r=
            {k.radius.toFixed(1)}
          </li>
        ))}
      </ul>
      <p className="text-[10px] leading-relaxed text-fg-subtle">
        播放时姿态变化会重置累积，噪声偏大正常。导出请允许浏览器多文件下载。
      </p>
    </div>
  );
}
