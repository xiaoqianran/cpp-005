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
    <div className="space-y-3 rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-4">
      <div>
        <h3 className="text-sm font-semibold">相机动画</h3>
        <p className="text-xs text-fg-subtle">关键帧插值 · 播放预览 · 导出 PNG 序列</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={exporting}
          onClick={() => onPlay(!playing)}
          className="h-9 rounded-[var(--radius-sm)] bg-accent px-3 text-xs font-semibold text-accent-fg disabled:opacity-50"
        >
          {playing ? "暂停" : "播放"}
        </button>
        <button
          type="button"
          disabled={exporting}
          onClick={onCapture}
          className="h-9 rounded-[var(--radius-sm)] border border-border px-3 text-xs"
        >
          记录当前为关键帧
        </button>
        <button
          type="button"
          disabled={exporting}
          onClick={onReset}
          className="h-9 rounded-[var(--radius-sm)] border border-border px-3 text-xs"
        >
          默认轨迹
        </button>
        <button
          type="button"
          disabled={exporting}
          onClick={() => onExport(4)}
          className="h-9 rounded-[var(--radius-sm)] border border-border px-3 text-xs"
          title="约 4fps × 时长，每帧稍等采样后下载 PNG"
        >
          {exporting ? "导出中…" : "导出序列 (4fps)"}
        </button>
      </div>
      {exportProgress && (
        <p className="font-mono text-[11px] text-accent">{exportProgress}</p>
      )}
      <label className="block space-y-1">
        <span className="text-[11px] text-fg-subtle">
          时间 {time.toFixed(2)}s / {tl.duration.toFixed(1)}s · 关键帧 {tl.keys.length}
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
      <ul className="max-h-28 space-y-1 overflow-y-auto font-mono text-[10px] text-fg-muted">
        {tl.keys.map((k, i) => (
          <li key={i}>
            t={k.t.toFixed(1)} yaw={k.yaw.toFixed(2)} pitch={k.pitch.toFixed(2)} r=
            {k.radius.toFixed(1)}
          </li>
        ))}
      </ul>
      <p className="text-[10px] leading-relaxed text-fg-subtle">
        提示：播放时姿态在变，累积会重置，噪声偏大正常。导出序列会逐帧等待采样再下载，浏览器可能拦截多文件——请允许下载。
      </p>
    </div>
  );
}
