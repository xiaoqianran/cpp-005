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
    <div
      className="ctp-card space-y-4 p-4 md:p-5"
      style={{ borderTop: "3px solid var(--color-mauve)" }}
    >
      <div>
        <p className="font-mono text-[10px] font-semibold tracking-widest text-[var(--color-mauve)]">
          02 · SHADER GRAPH
        </p>
        <h3 className="mt-1 text-base font-semibold">节点材质（教学子集）</h3>
        <p className="mt-0.5 text-xs text-fg-muted">
          覆盖：场景0主球 · 场景1右立方 · 场景2蓝球 · 自动 localStorage
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(["r", "g", "b"] as const).map((ch) => (
          <label key={ch} className="block space-y-1.5 text-[11px]">
            <span className="text-fg-muted">
              Color.{ch}{" "}
              <span className="font-mono text-[var(--color-lavender)]">
                {(col?.params[ch] ?? 0.5).toFixed(2)}
              </span>
            </span>
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
        <label className="block space-y-1.5 text-[11px]">
          <span className="text-fg-muted">Mix 纹理权重</span>
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
        {(
          [
            ["tex", "Texture", tex?.params.enabled],
            ["nmap", "Normal Map", nmap?.params.enabled],
            ["met", "Metal BSDF", met?.params.metal],
          ] as const
        ).map(([id, label, val]) => (
          <label
            key={id}
            className="flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-base/40 px-3 text-[11px]"
          >
            <input
              type="checkbox"
              checked={(val ?? 0) > 0.5}
              onChange={(e) =>
                setParam(id, id === "met" ? "metal" : "enabled", e.target.checked ? 1 : 0)
              }
            />
            {label}
          </label>
        ))}
        <label className="block space-y-1.5 text-[11px]">
          <span className="text-fg-muted">Fuzz</span>
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

      <div className="flex flex-wrap items-center gap-3">
        <div
          className="size-12 rounded-[var(--radius-md)] border border-border shadow-inner"
          style={{
            background: `rgb(${compiled.albedo.map((x) => Math.round(x * 255)).join(",")})`,
          }}
        />
        <div className="font-mono text-[10px] text-overlay1">
          metal={compiled.metal} nmap={String(compiled.useNormalMap)} tex=
          {String(compiled.useTexture)}
        </div>
        <button type="button" onClick={onApply} className="ctp-btn ctp-btn-primary ml-auto">
          编译并应用
        </button>
      </div>
    </div>
  );
}
