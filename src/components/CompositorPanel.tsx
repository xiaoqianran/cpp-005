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
    { label: "原片 beauty", run: presetFlat },
    { label: "AOV 法线", run: presetNormalAov },
    { label: "AOV 深度", run: presetDepthAov },
  ];

  return (
    <div className="space-y-3 rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">① 合成 · 节点图</h3>
          <p className="text-xs text-fg-subtle">cpp-005 主能力 A · 类 Blender Compositor</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs">
            <input type="checkbox" checked={enabled} onChange={(e) => onEnabled(e.target.checked)} />
            启用合成
          </label>
          {onExportPng && (
            <button
              type="button"
              onClick={onExportPng}
              className="h-8 rounded-[var(--radius-sm)] border border-border px-2.5 text-[11px] font-medium"
            >
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
            className="rounded-full border border-border px-2.5 py-1 text-[11px] hover:bg-bg-subtle"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 简易节点流水线可视化 */}
      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border bg-bg p-3">
        <div className="flex min-w-max items-center gap-2">
          {graph.nodes.map((n, i) => (
            <div key={n.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSel(n.id)}
                className={`min-w-[4.5rem] rounded-[var(--radius-sm)] border px-2 py-2 text-center text-[11px] ${
                  sel === n.id
                    ? "border-accent bg-bg-subtle font-semibold"
                    : "border-border bg-bg-elevated"
                }`}
              >
                <div>{NODE_META[n.type].label}</div>
                <div className="mt-0.5 font-mono text-[9px] text-fg-subtle">{n.id}</div>
              </button>
              {i < graph.nodes.length - 1 && (
                <span className="text-fg-subtle" aria-hidden>
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="font-mono text-[10px] leading-relaxed text-fg-muted">{summary}</p>

      {node && meta && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium">参数 · {meta.label}</p>
          {meta.params.length === 0 && (
            <p className="text-[11px] text-fg-subtle">此节点无参（输出汇点）</p>
          )}
          {meta.params.map((p) => (
            <label key={p.key} className="block space-y-1">
              <span className="text-[11px] text-fg-subtle">
                {p.label} = {(node.params[p.key] ?? 0).toFixed(2)}
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
