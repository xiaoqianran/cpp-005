import { useMemo, useState } from "react";
import {
  defaultGraph,
  NODE_META,
  type CompGraph,
  type CompNode,
} from "../compositor/types";
import {
  presetBloomOnly,
  presetDepthAov,
  presetFilmic,
  presetFlat,
  presetNormalAov,
} from "../compositor/presets";

type Props = {
  graph: CompGraph;
  onChange: (g: CompGraph) => void;
  enabled: boolean;
  onEnabled: (v: boolean) => void;
  onExportPng?: () => void;
};

export function CompositorPanel({ graph, onChange, enabled, onEnabled, onExportPng }: Props) {
  const [sel, setSel] = useState(graph.nodes[0]?.id ?? "in");
  const node = graph.nodes.find((n) => n.id === sel);
  const meta = node ? NODE_META[node.type] : null;

  const update = (id: string, fn: (n: CompNode) => CompNode) => {
    onChange({
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === id ? fn(n) : n)),
    });
  };

  const summary = useMemo(
    () => graph.nodes.map((n) => NODE_META[n.type].label).join(" → "),
    [graph],
  );

  const presets: { label: string; run: () => CompGraph }[] = [
    { label: "默认链路", run: defaultGraph },
    { label: "电影感", run: presetFilmic },
    { label: "强辉光", run: presetBloomOnly },
    { label: "原片", run: presetFlat },
    { label: "AOV 法线", run: presetNormalAov },
    { label: "AOV 深度", run: presetDepthAov },
  ];

  return (
    <div
      className="ctp-card space-y-4 p-4 md:p-5"
      style={{ borderTop: "3px solid var(--color-sky)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-widest text-[var(--color-sky)]">
            01 · COMPOSITOR
          </p>
          <h3 className="mt-1 text-base font-semibold text-fg">合成节点图</h3>
          <p className="mt-0.5 text-xs text-fg-muted">预设切换 · 点节点调参 · 导出 PNG</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="ctp-chip cursor-pointer border border-border bg-base text-xs text-fg-muted">
            <input type="checkbox" checked={enabled} onChange={(e) => onEnabled(e.target.checked)} />
            启用合成
          </label>
          {onExportPng && (
            <button type="button" onClick={onExportPng} className="ctp-btn ctp-btn-ghost h-8 px-3 text-xs">
              导出 PNG
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              const g = p.run();
              onChange(g);
              setSel(g.nodes[0]?.id ?? "in");
            }}
            className="rounded-full border border-border bg-base/50 px-2.5 py-1 text-[11px] text-fg-muted transition hover:border-[var(--color-sky)] hover:text-[var(--color-sky)]"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border bg-crust/60 p-3">
        <div className="flex min-w-max items-center gap-2">
          {graph.nodes.map((n, i) => (
            <div key={n.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSel(n.id)}
                className={`min-w-[5rem] rounded-[var(--radius-sm)] border px-2.5 py-2 text-center text-[11px] transition ${
                  sel === n.id
                    ? "border-[var(--color-sky)] bg-[color-mix(in_srgb,var(--color-sky)_14%,transparent)] font-semibold text-fg"
                    : "border-border bg-mantle text-fg-muted hover:border-surface1"
                }`}
              >
                <div>{NODE_META[n.type].label}</div>
                <div className="mt-0.5 font-mono text-[9px] text-overlay0">{n.id}</div>
              </button>
              {i < graph.nodes.length - 1 && (
                <span className="text-[var(--color-overlay0)]" aria-hidden>
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="font-mono text-[10px] text-overlay1">{summary}</p>

      {node && meta && (
        <div className="space-y-3 border-t border-border pt-3">
          <p className="text-xs font-semibold text-fg">
            参数 · <span className="text-[var(--color-sky)]">{meta.label}</span>
          </p>
          {meta.params.length === 0 && (
            <p className="text-[11px] text-fg-subtle">此节点无参</p>
          )}
          {meta.params.map((p) => (
            <label key={p.key} className="block space-y-1.5">
              <span className="text-[11px] text-fg-muted">
                {p.label}{" "}
                <span className="font-mono text-[var(--color-lavender)]">
                  {(node.params[p.key] ?? 0).toFixed(2)}
                </span>
              </span>
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={node.params[p.key] ?? 0}
                onChange={(e) =>
                  update(node.id, (n) => ({
                    ...n,
                    params: { ...n.params, [p.key]: Number(e.target.value) },
                  }))
                }
                className="w-full"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
