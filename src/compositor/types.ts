/** 合成节点图 · 对 beauty / AOV 做后处理 */

export type AovId = "beauty" | "normal" | "depth";

export type CompNodeType =
  | "input"
  | "exposure"
  | "gamma"
  | "contrast"
  | "bloom"
  | "vignette"
  | "mix"
  | "view";

export type CompNode = {
  id: string;
  type: CompNodeType;
  x: number;
  y: number;
  /** 节点参数 */
  params: Record<string, number>;
  /** 输入连接：slot -> 上游 nodeId */
  inputs: Record<string, string | null>;
};

export type CompGraph = {
  nodes: CompNode[];
  /** 最终输出节点 id（type=view） */
  outputId: string;
};

export function defaultGraph(): CompGraph {
  const input: CompNode = {
    id: "in",
    type: "input",
    x: 40,
    y: 80,
    params: { aov: 0 }, // 0 beauty 1 normal 2 depth
    inputs: {},
  };
  const exp: CompNode = {
    id: "exp",
    type: "exposure",
    x: 220,
    y: 40,
    params: { stops: 0 },
    inputs: { in: "in" },
  };
  const bloom: CompNode = {
    id: "bloom",
    type: "bloom",
    x: 220,
    y: 160,
    params: { threshold: 0.85, strength: 0.35, radius: 2 },
    inputs: { in: "in" },
  };
  const mix: CompNode = {
    id: "mix",
    type: "mix",
    x: 420,
    y: 80,
    params: { factor: 0.55 },
    inputs: { a: "exp", b: "bloom" },
  };
  const gam: CompNode = {
    id: "gam",
    type: "gamma",
    x: 600,
    y: 80,
    params: { gamma: 1.0 },
    inputs: { in: "mix" },
  };
  const vig: CompNode = {
    id: "vig",
    type: "vignette",
    x: 780,
    y: 80,
    params: { amount: 0.25 },
    inputs: { in: "gam" },
  };
  const view: CompNode = {
    id: "view",
    type: "view",
    x: 960,
    y: 80,
    params: {},
    inputs: { in: "vig" },
  };
  return { nodes: [input, exp, bloom, mix, gam, vig, view], outputId: "view" };
}

export const NODE_META: Record<
  CompNodeType,
  { label: string; inputs: string[]; params: { key: string; label: string; min: number; max: number; step: number }[] }
> = {
  input: {
    label: "输入 AOV",
    inputs: [],
    params: [{ key: "aov", label: "0美1法2深", min: 0, max: 2, step: 1 }],
  },
  exposure: {
    label: "曝光",
    inputs: ["in"],
    params: [{ key: "stops", label: "档", min: -3, max: 3, step: 0.05 }],
  },
  gamma: {
    label: "Gamma",
    inputs: ["in"],
    params: [{ key: "gamma", label: "γ", min: 0.4, max: 2.4, step: 0.05 }],
  },
  contrast: {
    label: "对比度",
    inputs: ["in"],
    params: [{ key: "amount", label: "量", min: 0.2, max: 2.5, step: 0.05 }],
  },
  bloom: {
    label: "辉光",
    inputs: ["in"],
    params: [
      { key: "threshold", label: "阈值", min: 0.2, max: 1.5, step: 0.05 },
      { key: "strength", label: "强度", min: 0, max: 1.5, step: 0.05 },
      { key: "radius", label: "半径", min: 1, max: 6, step: 1 },
    ],
  },
  vignette: {
    label: "暗角",
    inputs: ["in"],
    params: [{ key: "amount", label: "量", min: 0, max: 1, step: 0.05 }],
  },
  mix: {
    label: "混合",
    inputs: ["a", "b"],
    params: [{ key: "factor", label: "B 权重", min: 0, max: 1, step: 0.05 }],
  },
  view: {
    label: "输出",
    inputs: ["in"],
    params: [],
  },
};
