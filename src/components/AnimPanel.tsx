import type { Timeline } from "../animation/timeline";

type Props = {
  tl: Timeline;
  time: number;
  playing: boolean;
  onPlay: (v: boolean) => void;
  onSeek: (t: number) => void;
  onCapture: () => void;
  onReset: () => void;
};

export function AnimPanel({ tl, time, playing, onPlay, onSeek, onCapture, onReset }: Props) {
  return (
    <div className="space-y-3 rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-4">
      <div>
        <h3 className="text-sm font-semibold">相机动画</h3>
        <p className="text-xs text-fg-subtle">关键帧插值 yaw / pitch / radius · 教学级摄影表</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onPlay(!playing)}
          className="h-9 rounded-[var(--radius-sm)] bg-accent px-3 text-xs font-semibold text-accent-fg"
        >
          {playing ? "暂停" : "播放"}
        </button>
        <button
          type="button"
          onClick={onCapture}
          className="h-9 rounded-[var(--radius-sm)] border border-border px-3 text-xs"
        >
          记录当前为关键帧
        </button>
        <button
          type="button"
          onClick={onReset}
          className="h-9 rounded-[var(--radius-sm)] border border-border px-3 text-xs"
        >
          默认轨迹
        </button>
      </div>
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
    </div>
  );
}
