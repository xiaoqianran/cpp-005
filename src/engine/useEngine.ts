import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyCameraOnly,
  applyConfig,
  configNeedsCamera,
  configNeedsRebuild,
} from "./applyConfig";
import type { EngineConfig } from "./types";
import { createRayTracer, type RayTracerApi } from "./wasm";
import type { CompGraph } from "../compositor/types";
import { evaluateGraph } from "../compositor/evaluate";

export type EngineStatus = "loading" | "ready" | "error";

export type EngineSnapshot = {
  status: EngineStatus;
  error: string | null;
  samples: number;
  passMs: number;
  primCount: number;
  lightCount: number;
  scanY: number;
};

const TARGET_MS = 14;

export function useEngine(
  cfg: EngineConfig,
  running: boolean,
  opts?: {
    compGraph?: CompGraph;
    compEnabled?: boolean;
  },
) {
  const apiRef = useRef<RayTracerApi | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cfgRef = useRef(cfg);
  const prevCfgRef = useRef<EngineConfig | null>(null);
  const rafRef = useRef(0);
  const rowsBudgetRef = useRef(32);
  const compRef = useRef(opts);

  const [snap, setSnap] = useState<EngineSnapshot>({
    status: "loading",
    error: null,
    samples: 0,
    passMs: 0,
    primCount: 0,
    lightCount: 0,
    scanY: 0,
  });

  cfgRef.current = cfg;
  compRef.current = opts;

  const paint = useCallback(() => {
    const api = apiRef.current;
    const canvas = canvasRef.current;
    if (!api || !canvas) return;
    const w = api.width();
    const h = api.height();
    if (w <= 0 || h <= 0) return;
    const rgba = api.rgba();
    if (rgba.length < w * h * 4) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const beauty = new ImageData(new Uint8ClampedArray(rgba), w, h);
    const o = compRef.current;
    if (o?.compEnabled && o.compGraph) {
      let normal: ImageData | null = null;
      let depth: ImageData | null = null;
      try {
        const n = api.aovNormal();
        const d = api.aovDepth();
        if (n.length >= w * h * 4) normal = new ImageData(new Uint8ClampedArray(n), w, h);
        if (d.length >= w * h * 4) depth = new ImageData(new Uint8ClampedArray(d), w, h);
      } catch {
        /* aov optional */
      }
      const out = evaluateGraph(o.compGraph, { beauty, normal, depth });
      ctx.putImageData(out, 0, 0);
    } else {
      ctx.putImageData(beauty, 0, 0);
    }

    setSnap((s) => ({
      ...s,
      samples: api.samples(),
      primCount: api.primitiveCount(),
      lightCount: api.lightCount(),
      scanY: api.scanY(),
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const api = await createRayTracer();
        if (cancelled) return;
        apiRef.current = api;
        applyConfig(api, cfgRef.current);
        if (api.width() <= 0 || api.rgba().length === 0) {
          throw new Error("引擎缓冲未就绪（rt_apply）");
        }
        setSnap((s) => ({ ...s, status: "ready", error: null }));
        paint();
      } catch (e) {
        if (!cancelled)
          setSnap((s) => ({
            ...s,
            status: "error",
            error: e instanceof Error ? e.message : String(e),
          }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paint]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api || snap.status !== "ready") return;
    const prev = prevCfgRef.current;
    if (!prev) {
      applyConfig(api, cfg);
      prevCfgRef.current = cfg;
      paint();
      return;
    }
    if (configNeedsRebuild(prev, cfg)) {
      applyConfig(api, cfg);
    } else if (configNeedsCamera(prev, cfg)) {
      applyCameraOnly(api, cfg);
    } else {
      applyConfig(api, cfg);
    }
    prevCfgRef.current = cfg;
    paint();
  }, [cfg, snap.status, paint]);

  useEffect(() => {
    if (snap.status !== "ready" || !running) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    let alive = true;
    const loop = () => {
      if (!alive) return;
      const api = apiRef.current;
      if (!api) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const t0 = performance.now();
      api.renderPass(cfgRef.current.spp, rowsBudgetRef.current);
      const dt = performance.now() - t0;
      if (dt > TARGET_MS * 1.4) rowsBudgetRef.current = Math.max(4, (rowsBudgetRef.current * 0.7) | 0);
      else if (dt < TARGET_MS * 0.6) rowsBudgetRef.current = Math.min(120, rowsBudgetRef.current + 4);
      setSnap((s) => ({ ...s, passMs: dt }));
      paint();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [running, snap.status, paint]);

  // 合成参数变化时重绘
  useEffect(() => {
    if (snap.status === "ready") paint();
  }, [opts?.compEnabled, opts?.compGraph, paint, snap.status]);

  const reset = useCallback(() => {
    apiRef.current?.reset();
    paint();
  }, [paint]);

  const applyMat = useCallback(
    (args: Parameters<RayTracerApi["setMatOverride"]>[0]) => {
      const api = apiRef.current;
      if (!api) return;
      api.setMatOverride(args);
      applyConfig(api, cfgRef.current); // rebuild scene with override
      paint();
    },
    [paint],
  );

  return { canvasRef, snap, reset, applyMat, apiRef };
}
