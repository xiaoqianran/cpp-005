import { useMemo, useState } from "react";
import { defaultGraph, NODE_META, type CompGraph, type CompNode } from "../compositor/types";

type Props = {
  graph: CompGraph;
  onChange: (g: CompGraph) => void;
  enabled: boolean;
  onEnabled: (v: boolean) => void;
};

export function CompositorPanel({ graph, onChange, enabled, onEnabled }: Props) {
  const [sel, setSel] = useState(graph.nodes[0]?.id ?? "in");
  const node = graph.nodes.find((n) => n.id === sel);

  const update = (id: string, fn: (n: CompNode) => CompNode) => {
    onChange({
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === id ? fn(n) : n)),
    });
  };

  const meta = node ? NODE_META[node.type] : null;

  const summary = useMemo(
    () => graph.nodes.map((n) => NODE_META[n.type].label).join(" → "),
    [graph],
  );

  return (
    <div className="space-y-3 rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">合成节点图</h3>
          <p className="text-xs text-fg-subtle">类 Blender Compositor · 曝光/辉光/暗角/混合</p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs">
          <input type="checkbox" checked={enabled} onChange={(e) => onEnabled(e.target.checked)} />
          启用合成
        </label>
      </div>
      <p className="font-mono text-[10px] leading-relaxed text-fg-muted">{summary}</p>
      <div className="flex flex-wrap gap-1.5">
        {graph.nodes.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setSel(n.id)}
            className={`rounded-full border px-2.5 py-1 text-[11px] ${
              sel === n.id ? "border-border-strong bg-bg-subtle font-medium" : "border-border"
            }`}
          >
            {NODE_META[n.type].label}
          </button>
        ))}
      </div>
      {node && meta && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium">{meta.label}</p>
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
          <button
            type="button"
            className="text-[11px] text-fg-muted underline"
            onClick={() => onChange(defaultGraph())}
          >
            重置默认图
          </button>
        </div>
      )}
    </div>
  );
}
