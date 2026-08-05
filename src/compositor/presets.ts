import type { CompGraph } from "./types";
import { defaultGraph } from "./types";

export function presetFilmic(): CompGraph {
  const g = defaultGraph();
  const exp = g.nodes.find((n) => n.id === "exp");
  const bloom = g.nodes.find((n) => n.id === "bloom");
  const gam = g.nodes.find((n) => n.id === "gam");
  const vig = g.nodes.find((n) => n.id === "vig");
  if (exp) exp.params.stops = 0.35;
  if (bloom) {
    bloom.params.threshold = 0.7;
    bloom.params.strength = 0.55;
    bloom.params.radius = 3;
  }
  if (gam) gam.params.gamma = 0.95;
  if (vig) vig.params.amount = 0.4;
  return { ...g, nodes: [...g.nodes] };
}

export function presetFlat(): CompGraph {
  return {
    outputId: "view",
    nodes: [
      { id: "in", type: "input", x: 40, y: 80, params: { aov: 0 }, inputs: {} },
      {
        id: "view",
        type: "view",
        x: 240,
        y: 80,
        params: {},
        inputs: { in: "in" },
      },
    ],
  };
}

export function presetNormalAov(): CompGraph {
  return {
    outputId: "view",
    nodes: [
      { id: "in", type: "input", x: 40, y: 80, params: { aov: 1 }, inputs: {} },
      {
        id: "view",
        type: "view",
        x: 240,
        y: 80,
        params: {},
        inputs: { in: "in" },
      },
    ],
  };
}

export function presetDepthAov(): CompGraph {
  return {
    outputId: "view",
    nodes: [
      { id: "in", type: "input", x: 40, y: 80, params: { aov: 2 }, inputs: {} },
      {
        id: "view",
        type: "view",
        x: 240,
        y: 80,
        params: {},
        inputs: { in: "in" },
      },
    ],
  };
}

export function presetBloomOnly(): CompGraph {
  const g = defaultGraph();
  const bloom = g.nodes.find((n) => n.id === "bloom");
  const mix = g.nodes.find((n) => n.id === "mix");
  if (bloom) {
    bloom.params.threshold = 0.55;
    bloom.params.strength = 0.9;
    bloom.params.radius = 4;
  }
  if (mix) mix.params.factor = 0.85;
  return { ...g, nodes: [...g.nodes] };
}
