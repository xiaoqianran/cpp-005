/**
 * 材质 Shader Graph（教学子集）
 * 编译为简单参数，驱动场景里的「可编辑槽位」albedo / metal / nmap 开关
 * （完整节点 BSDF 进 C++ 是后续；本课先打通「图 → 参数 → 画面」）
 */

export type MatNodeType = "color" | "texture" | "mix" | "metalness" | "normalMap" | "bsdf" | "output";

export type MatNode = {
  id: string;
  type: MatNodeType;
  x: number;
  y: number;
  params: Record<string, number>;
  inputs: Record<string, string | null>;
};

export type MatGraph = {
  nodes: MatNode[];
  outputId: string;
};

/** 编译结果：给场景/UI 用 */
export type MatCompileResult = {
  albedo: [number, number, number];
  metal: number; // 0 朗伯 1 金属
  fuzz: number;
  useNormalMap: boolean;
  useTexture: boolean;
};

export function defaultMatGraph(): MatGraph {
  return {
    outputId: "out",
    nodes: [
      { id: "col", type: "color", x: 40, y: 60, params: { r: 0.65, g: 0.55, b: 0.45 }, inputs: {} },
      { id: "tex", type: "texture", x: 40, y: 180, params: { enabled: 1 }, inputs: {} },
      {
        id: "mix",
        type: "mix",
        x: 240,
        y: 100,
        params: { factor: 0.4 },
        inputs: { a: "col", b: "tex" },
      },
      { id: "nmap", type: "normalMap", x: 240, y: 240, params: { enabled: 1 }, inputs: {} },
      { id: "met", type: "metalness", x: 240, y: 320, params: { metal: 0, fuzz: 0.1 }, inputs: {} },
      {
        id: "bsdf",
        type: "bsdf",
        x: 460,
        y: 160,
        params: {},
        inputs: { color: "mix", metal: "met", normal: "nmap" },
      },
      { id: "out", type: "output", x: 680, y: 160, params: {}, inputs: { in: "bsdf" } },
    ],
  };
}

export function compileMatGraph(g: MatGraph): MatCompileResult {
  const nodes = new Map(g.nodes.map((n) => [n.id, n]));
  const col = nodes.get("col");
  const mix = nodes.get("mix");
  const met = nodes.get("met");
  const nmap = nodes.get("nmap");
  const tex = nodes.get("tex");

  const albedo: [number, number, number] = [
    col?.params.r ?? 0.6,
    col?.params.g ?? 0.55,
    col?.params.b ?? 0.45,
  ];
  // mix factor 影响纹理权重（展示用）
  const factor = mix?.params.factor ?? 0.5;
  if ((tex?.params.enabled ?? 0) > 0.5) {
    // 向木纹色偏移一点表示接了纹理
    albedo[0] = albedo[0] * (1 - factor) + 0.45 * factor;
    albedo[1] = albedo[1] * (1 - factor) + 0.3 * factor;
    albedo[2] = albedo[2] * (1 - factor) + 0.15 * factor;
  }

  return {
    albedo,
    metal: met?.params.metal ?? 0,
    fuzz: met?.params.fuzz ?? 0.1,
    useNormalMap: (nmap?.params.enabled ?? 0) > 0.5,
    useTexture: (tex?.params.enabled ?? 0) > 0.5,
  };
}
