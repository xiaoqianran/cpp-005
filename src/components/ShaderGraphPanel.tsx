import { compileMatGraph, type MatGraph } from "../shadergraph/types";

type Props = {
  graph: MatGraph;
  onChange: (g: MatGraph) => void;
  onApply: () => void;
};

export function ShaderGraphPanel({ graph, onChange, onApply }: Props) {
  const compiled = compileMatGraph(graph);
  const setParam = (id: string, key: string, v: number) => {
    onChange({
      ...graph,
      nodes: graph.nodes.map((n) =>
        n.id === id ? { ...n, params: { ...n.params, [key]: v } } : n,
      ),
    });
  };
  const col = graph.nodes.find((n) => n.id === "col");
  const mix = graph.nodes.find((n) => n.id === "mix");
  const met = graph.nodes.find((n) => n.id === "met");
  const nmap = graph.nodes.find((n) => n.id === "nmap");
  const tex = graph.nodes.find((n) => n.id === "tex");

  return (
    <div className="space-y-3 rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-4">
      <div>
        <h3 className="text-sm font-semibold">② Shader 节点（教学子集）</h3>
        <p className="text-xs text-fg-subtle">
          编译后覆盖：场景0主球 · 场景1右侧立方 · 场景2蓝球（localStorage 自动保存）
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {(["r", "g", "b"] as const).map((ch) => (
          <label key={ch} className="block space-y-1 text-[11px]">
            <span className="text-fg-subtle">Color.{ch}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={col?.params[ch] ?? 0.5}
              onChange={(e) => setParam("col", ch, Number(e.target.value))}
              className="w-full"
            />
          </label>
        ))}
        <label className="block space-y-1 text-[11px]">
          <span className="text-fg-subtle">Mix 纹理权重</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={mix?.params.factor ?? 0}
            onChange={(e) => setParam("mix", "factor", Number(e.target.value))}
            className="w-full"
          />
        </label>
        <label className="flex items-center gap-2 text-[11px]">
          <input
            type="checkbox"
            checked={(tex?.params.enabled ?? 0) > 0.5}
            onChange={(e) => setParam("tex", "enabled", e.target.checked ? 1 : 0)}
          />
          Texture 节点
        </label>
        <label className="flex items-center gap-2 text-[11px]">
          <input
            type="checkbox"
            checked={(nmap?.params.enabled ?? 0) > 0.5}
            onChange={(e) => setParam("nmap", "enabled", e.target.checked ? 1 : 0)}
          />
          Normal Map
        </label>
        <label className="flex items-center gap-2 text-[11px]">
          <input
            type="checkbox"
            checked={(met?.params.metal ?? 0) > 0.5}
            onChange={(e) => setParam("met", "metal", e.target.checked ? 1 : 0)}
          />
          Metal BSDF
        </label>
        <label className="block space-y-1 text-[11px]">
          <span className="text-fg-subtle">Fuzz</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={met?.params.fuzz ?? 0.1}
            onChange={(e) => setParam("met", "fuzz", Number(e.target.value))}
            className="w-full"
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-md border border-border"
          style={{
            background: `rgb(${compiled.albedo.map((x) => Math.round(x * 255)).join(",")})`,
          }}
        />
        <div className="font-mono text-[10px] text-fg-muted">
          metal={compiled.metal} nmap={String(compiled.useNormalMap)} tex=
          {String(compiled.useTexture)}
        </div>
      </div>
      <button
        type="button"
        onClick={onApply}
        className="h-9 rounded-[var(--radius-sm)] bg-accent px-3 text-xs font-semibold text-accent-fg"
      >
        编译并应用材质覆盖
      </button>
    </div>
  );
}
