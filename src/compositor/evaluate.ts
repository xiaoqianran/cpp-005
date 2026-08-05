/** 在 CPU 上对 ImageData 求值合成图 */

import type { CompGraph, CompNode } from "./types";

export type AovBuffers = {
  beauty: ImageData;
  normal?: ImageData | null;
  depth?: ImageData | null;
};

function clone(img: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
}

function getInput(
  node: CompNode,
  slot: string,
  cache: Map<string, ImageData>,
  graph: CompGraph,
  aovs: AovBuffers,
): ImageData {
  const id = node.inputs[slot];
  if (!id) return empty(aovs.beauty.width, aovs.beauty.height);
  return evalNode(id, cache, graph, aovs);
}

function empty(w: number, h: number): ImageData {
  return new ImageData(w, h);
}

function pickAov(aovs: AovBuffers, aov: number): ImageData {
  if (aov === 1 && aovs.normal) return aovs.normal;
  if (aov === 2 && aovs.depth) return aovs.depth;
  return aovs.beauty;
}

function evalNode(
  id: string,
  cache: Map<string, ImageData>,
  graph: CompGraph,
  aovs: AovBuffers,
): ImageData {
  if (cache.has(id)) return cache.get(id)!;
  const node = graph.nodes.find((n) => n.id === id);
  if (!node) return empty(aovs.beauty.width, aovs.beauty.height);

  let out: ImageData;
  switch (node.type) {
    case "input":
      out = clone(pickAov(aovs, node.params.aov ?? 0));
      break;
    case "exposure": {
      const src = getInput(node, "in", cache, graph, aovs);
      out = mapRgb(src, (r, g, b) => {
        const k = Math.pow(2, node.params.stops ?? 0);
        return [r * k, g * k, b * k];
      });
      break;
    }
    case "gamma": {
      const src = getInput(node, "in", cache, graph, aovs);
      const g = Math.max(0.05, node.params.gamma ?? 1);
      const inv = 1 / g;
      out = mapRgb(src, (r, g0, b) => [
        Math.pow(r / 255, inv) * 255,
        Math.pow(g0 / 255, inv) * 255,
        Math.pow(b / 255, inv) * 255,
      ]);
      break;
    }
    case "contrast": {
      const src = getInput(node, "in", cache, graph, aovs);
      const a = node.params.amount ?? 1;
      out = mapRgb(src, (r, g, b) => [(r - 128) * a + 128, (g - 128) * a + 128, (b - 128) * a + 128]);
      break;
    }
    case "bloom": {
      const src = getInput(node, "in", cache, graph, aovs);
      out = bloom(
        src,
        node.params.threshold ?? 0.85,
        node.params.strength ?? 0.35,
        node.params.radius ?? 2,
      );
      break;
    }
    case "vignette": {
      const src = getInput(node, "in", cache, graph, aovs);
      out = vignette(src, node.params.amount ?? 0.25);
      break;
    }
    case "mix": {
      const a = getInput(node, "a", cache, graph, aovs);
      const b = getInput(node, "b", cache, graph, aovs);
      out = mix(a, b, node.params.factor ?? 0.5);
      break;
    }
    case "view":
      out = clone(getInput(node, "in", cache, graph, aovs));
      break;
    default:
      out = clone(aovs.beauty);
  }
  cache.set(id, out);
  return out;
}

function mapRgb(
  src: ImageData,
  f: (r: number, g: number, b: number) => [number, number, number],
): ImageData {
  const out = clone(src);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = f(d[i]!, d[i + 1]!, d[i + 2]!);
    d[i] = clamp255(r);
    d[i + 1] = clamp255(g);
    d[i + 2] = clamp255(b);
  }
  return out;
}

function clamp255(x: number) {
  return x < 0 ? 0 : x > 255 ? 255 : x;
}

function mix(a: ImageData, b: ImageData, f: number): ImageData {
  const out = clone(a);
  const da = a.data,
    db = b.data,
    o = out.data;
  for (let i = 0; i < o.length; i += 4) {
    o[i] = clamp255(da[i]! * (1 - f) + db[i]! * f);
    o[i + 1] = clamp255(da[i + 1]! * (1 - f) + db[i + 1]! * f);
    o[i + 2] = clamp255(da[i + 2]! * (1 - f) + db[i + 2]! * f);
  }
  return out;
}

function vignette(src: ImageData, amount: number): ImageData {
  const out = clone(src);
  const { width: w, height: h, data } = out;
  const cx = w * 0.5,
    cy = h * 0.5;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dx = (x - cx) / maxR,
        dy = (y - cy) / maxR;
      const r = Math.sqrt(dx * dx + dy * dy);
      const v = 1 - amount * Math.pow(r, 1.6);
      data[i] = clamp255(data[i]! * v);
      data[i + 1] = clamp255(data[i + 1]! * v);
      data[i + 2] = clamp255(data[i + 2]! * v);
    }
  }
  return out;
}

function bloom(src: ImageData, threshold: number, strength: number, radius: number): ImageData {
  const bright = clone(src);
  const th = threshold * 255;
  for (let i = 0; i < bright.data.length; i += 4) {
    const y =
      0.2126 * bright.data[i]! + 0.7152 * bright.data[i + 1]! + 0.0722 * bright.data[i + 2]!;
    if (y < th) {
      bright.data[i] = bright.data[i + 1] = bright.data[i + 2] = 0;
    }
  }
  const blur = boxBlur(bright, Math.max(1, Math.round(radius)));
  const out = clone(src);
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = clamp255(out.data[i]! + blur.data[i]! * strength);
    out.data[i + 1] = clamp255(out.data[i + 1]! + blur.data[i + 1]! * strength);
    out.data[i + 2] = clamp255(out.data[i + 2]! + blur.data[i + 2]! * strength);
  }
  return out;
}

function boxBlur(src: ImageData, r: number): ImageData {
  const w = src.width,
    h = src.height;
  let cur = clone(src);
  for (let pass = 0; pass < 2; pass++) {
    const next = clone(cur);
    const s = cur.data,
      d = next.data;
    if (pass === 0) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let rsum = 0,
            gsum = 0,
            bsum = 0,
            n = 0;
          for (let k = -r; k <= r; k++) {
            const xx = Math.min(w - 1, Math.max(0, x + k));
            const i = (y * w + xx) * 4;
            rsum += s[i]!;
            gsum += s[i + 1]!;
            bsum += s[i + 2]!;
            n++;
          }
          const o = (y * w + x) * 4;
          d[o] = rsum / n;
          d[o + 1] = gsum / n;
          d[o + 2] = bsum / n;
        }
      }
    } else {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let rsum = 0,
            gsum = 0,
            bsum = 0,
            n = 0;
          for (let k = -r; k <= r; k++) {
            const yy = Math.min(h - 1, Math.max(0, y + k));
            const i = (yy * w + x) * 4;
            rsum += s[i]!;
            gsum += s[i + 1]!;
            bsum += s[i + 2]!;
            n++;
          }
          const o = (y * w + x) * 4;
          d[o] = rsum / n;
          d[o + 1] = gsum / n;
          d[o + 2] = bsum / n;
        }
      }
    }
    cur = next;
  }
  return cur;
}

export function evaluateGraph(graph: CompGraph, aovs: AovBuffers): ImageData {
  const cache = new Map<string, ImageData>();
  return evalNode(graph.outputId, cache, graph, aovs);
}
