import { useCallback, useEffect, useRef, useState } from "react";
import {
  Clapperboard,
  GraduationCap,
  Layers,
  Pause,
  Play,
  MonitorPlay,
  Workflow,
} from "lucide-react";
import { Curriculum } from "./components/Curriculum";
import { CompositorPanel } from "./components/CompositorPanel";
import { AnimPanel } from "./components/AnimPanel";
import { ShaderGraphPanel } from "./components/ShaderGraphPanel";
import {
  applyPatch,
  defaultConfig,
  lessonToPatch,
  selectScene,
  type EngineConfig,
} from "./engine/types";
import { useEngine } from "./engine/useEngine";
import { Controls } from "./lab/Controls";
import { Viewport } from "./lab/Viewport";
import type { LessonAction } from "./curriculum/types";
import { defaultGraph, type CompGraph } from "./compositor/types";
import { defaultTimeline, sampleTimeline, type Timeline } from "./animation/timeline";
import { exportFrameSequence } from "./animation/exportFrames";
import { defaultMatGraph, compileMatGraph, type MatGraph } from "./shadergraph/types";
import { AovStrip } from "./components/AovStrip";
import { loadJson, saveJson, persistKeys } from "./lib/persist";
import { presetNormalAov, presetDepthAov, presetFlat } from "./compositor/presets";

type Pillar = "comp" | "shader" | "anim";
type View = Pillar | "engine" | "course";

const PILLARS: {
  id: Pillar;
  n: string;
  title: string;
  blurb: string;
  color: string;
  icon: typeof Layers;
}[] = [
  {
    id: "comp",
    n: "01",
    title: "合成",
    blurb: "AOV · 曝光 · 辉光 · 导出",
    color: "var(--color-sky)",
    icon: Layers,
  },
  {
    id: "shader",
    n: "02",
    title: "Shader",
    blurb: "节点材质 → 主物体",
    color: "var(--color-mauve)",
    icon: Workflow,
  },
  {
    id: "anim",
    n: "03",
    title: "动画",
    blurb: "关键帧 · 播放 · 序列",
    color: "var(--color-pink)",
    icon: Clapperboard,
  },
];

export default function App() {
  const [cfg, setCfg] = useState<EngineConfig>(defaultConfig);
  const [running, setRunning] = useState(true);
  const [view, setView] = useState<View>("comp");

  const [compGraph, setCompGraph] = useState<CompGraph>(() =>
    loadJson(persistKeys.K_COMP, defaultGraph()),
  );
  const [compOn, setCompOn] = useState(true);
  const [tl, setTl] = useState<Timeline>(() => loadJson(persistKeys.K_TL, defaultTimeline()));
  const [animT, setAnimT] = useState(0);
  const [animPlay, setAnimPlay] = useState(false);
  const animRef = useRef(0);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [matGraph, setMatGraph] = useState<MatGraph>(() =>
    loadJson(persistKeys.K_MAT, defaultMatGraph()),
  );

  const { canvasRef, snap, reset, applyMat, apiRef } = useEngine(
    cfg,
    running || animPlay || exporting,
    { compGraph, compEnabled: compOn && view !== "course" },
  );

  useEffect(() => saveJson(persistKeys.K_COMP, compGraph), [compGraph]);
  useEffect(() => saveJson(persistKeys.K_MAT, matGraph), [matGraph]);
  useEffect(() => saveJson(persistKeys.K_TL, tl), [tl]);

  useEffect(() => {
    if (!animPlay || exporting) {
      cancelAnimationFrame(animRef.current);
      return;
    }
    let last = performance.now();
    let alive = true;
    const tick = (now: number) => {
      if (!alive) return;
      const dt = (now - last) / 1000;
      last = now;
      setAnimT((t) => {
        const nt = t + dt;
        setCfg((c) => ({ ...c, ...sampleTimeline(tl, nt) }));
        return tl.loop ? nt % tl.duration : Math.min(nt, tl.duration);
      });
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [animPlay, tl, exporting]);

  useEffect(() => {
    if (animPlay) setRunning(true);
  }, [animPlay]);

  const applyLesson = (a: LessonAction) => {
    setCfg((c) => applyPatch(c, lessonToPatch(a)));
    setRunning(true);
    setView("comp");
  };

  const applyShader = () => {
    const m = compileMatGraph(matGraph);
    setCfg((c) => selectScene({ ...c, sceneId: 0 }, 0));
    applyMat({
      enable: true,
      r: m.albedo[0],
      g: m.albedo[1],
      b: m.albedo[2],
      metal: m.metal > 0.5,
      fuzz: m.fuzz,
      useNmap: m.useNormalMap,
      useTexture: m.useTexture,
    });
    setView("shader");
  };

  const exportPng = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cpp005_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [canvasRef]);

  const exportSeq = async (fps: number) => {
    setAnimPlay(false);
    setExporting(true);
    setExportProgress("准备…");
    setRunning(true);
    try {
      const n = await exportFrameSequence(
        tl,
        fps,
        450,
        {
          setCam: (cam) => setCfg((c) => ({ ...c, ...cam })),
          waitMs: (ms) => new Promise((r) => setTimeout(r, ms)),
          capture: () =>
            new Promise((resolve) => {
              const c = canvasRef.current;
              if (!c) return resolve(null);
              c.toBlob((b) => resolve(b), "image/png");
            }),
        },
        (i, total) => setExportProgress(`导出 ${i}/${total}`),
      );
      setExportProgress(`完成 ${n} 帧`);
    } catch (e) {
      setExportProgress(e instanceof Error ? e.message : "导出失败");
    } finally {
      setExporting(false);
    }
  };

  const pillar = PILLARS.find((p) => p.id === view);
  const showEngineSide = view === "engine";

  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-4 py-5 md:px-6 md:py-7">
        {/* Identity */}
        <header className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="ctp-chip bg-[var(--color-mauve)] text-[var(--color-crust)]">
                  cpp-005
                </span>
                <span className="ctp-chip border border-border bg-mantle text-[var(--color-subtext0)]">
                  Catppuccin Mocha
                </span>
                <span className="ctp-chip border border-border text-[var(--color-sky)]">
                  后期三件套
                </span>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-fg md:text-[2rem]">
                合成 · Shader · 动画
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-fg-muted">
                <span className="text-fg">005 只做后期与交互镜头。</span>
                路径追踪积分在 002–004；本页三大主能力下方大卡片，光追引擎是次要入口。
              </p>
            </div>
            <button
              type="button"
              disabled={snap.status !== "ready" || exporting}
              onClick={() => setRunning((v) => !v)}
              className="ctp-btn ctp-btn-primary shrink-0 shadow-[0_8px_24px_color-mix(in_srgb,var(--color-mauve)_35%,transparent)]"
            >
              {running ? <Pause className="size-4" /> : <Play className="size-4" />}
              {running ? "暂停渲染" : "继续渲染"}
            </button>
          </div>

          {/* Series breadcrumb */}
          <nav
            aria-label="系列进度"
            className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]"
          >
            {[
              { t: "002 积分", cur: false },
              { t: "003 资产", cur: false },
              { t: "004 环境", cur: false },
              { t: "005 ← 当前", cur: true },
            ].map((x, i) => (
              <span key={x.t} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-fg-subtle">/</span>}
                <span
                  className={
                    x.cur
                      ? "rounded-md bg-[var(--color-mauve)] px-2 py-1 font-semibold text-[var(--color-crust)]"
                      : "rounded-md border border-border px-2 py-1 text-fg-subtle"
                  }
                >
                  {x.t}
                </span>
              </span>
            ))}
          </nav>

          {/* Three pillars */}
          <div className="grid gap-3 sm:grid-cols-3">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              const active = view === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setView(p.id)}
                  className={`group relative overflow-hidden rounded-[var(--radius-xl)] border p-4 text-left transition ${
                    active
                      ? "border-transparent bg-mantle"
                      : "border-border bg-mantle/60 hover:border-[var(--color-surface1)] hover:bg-mantle"
                  }`}
                  style={
                    active
                      ? {
                          boxShadow: `0 0 0 2px ${p.color}, 0 16px 40px color-mix(in srgb, ${p.color} 18%, transparent)`,
                        }
                      : undefined
                  }
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className="font-mono text-[10px] font-semibold tracking-widest"
                      style={{ color: p.color }}
                    >
                      {p.n}
                    </span>
                    <Icon className="size-5" style={{ color: p.color }} />
                  </div>
                  <div className="text-base font-semibold text-fg">{p.title}</div>
                  <p className="mt-1 text-xs text-fg-muted">{p.blurb}</p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setView("engine")}
              className={`ctp-btn h-9 px-3 text-xs ${
                view === "engine" ? "ctp-btn-primary" : "ctp-btn-ghost"
              }`}
            >
              <MonitorPlay className="size-3.5" />
              底层光追引擎
            </button>
            <button
              type="button"
              onClick={() => setView("course")}
              className={`ctp-btn h-9 px-3 text-xs ${
                view === "course" ? "ctp-btn-primary" : "ctp-btn-ghost"
              }`}
            >
              <GraduationCap className="size-3.5" />
              005 课程
            </button>
          </div>
        </header>

        {view === "course" ? (
          <div className="flex min-h-[65dvh] flex-col">
            <Curriculum onApply={applyLesson} onClose={() => setView("comp")} />
          </div>
        ) : (
          <>
            {pillar && (
              <div
                className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-border bg-mantle/80 px-3 py-2.5 text-xs"
                style={{ borderLeft: `4px solid ${pillar.color}` }}
              >
                <span className="font-semibold text-fg">
                  当前工作区 · {pillar.n} {pillar.title}
                </span>
                <span className="text-fg-subtle">{pillar.blurb}</span>
              </div>
            )}
            {view === "engine" && (
              <div className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-yellow)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-yellow)_8%,var(--color-mantle))] px-3 py-2.5 text-xs text-fg-muted">
                <strong className="text-[var(--color-yellow)]">次要面板：</strong>
                场景 / NEE / 分辨率继承 002–004，只为给上面三件套供图。
                <strong className="text-fg"> 005 新功能不在这里。</strong>
              </div>
            )}

            <div
              className={`grid gap-4 ${
                showEngineSide ? "lg:grid-cols-[minmax(0,1fr)_300px]" : ""
              }`}
            >
              <section className="space-y-3">
                <Viewport
                  canvasRef={canvasRef}
                  cfg={cfg}
                  snap={snap}
                  onOrbit={(yaw, pitch) => {
                    if (!animPlay && !exporting) setCfg((c) => ({ ...c, yaw, pitch }));
                  }}
                  onReset={reset}
                />
                {snap.status === "ready" && (
                  <AovStrip
                    apiRef={apiRef}
                    samples={snap.samples}
                    onPick={(aov) => {
                      setCompOn(true);
                      if (aov === 0) setCompGraph(presetFlat());
                      if (aov === 1) setCompGraph(presetNormalAov());
                      if (aov === 2) setCompGraph(presetDepthAov());
                      setView("comp");
                    }}
                  />
                )}
                {view === "comp" && (
                  <CompositorPanel
                    graph={compGraph}
                    onChange={setCompGraph}
                    enabled={compOn}
                    onEnabled={setCompOn}
                    onExportPng={exportPng}
                  />
                )}
                {view === "shader" && (
                  <ShaderGraphPanel
                    graph={matGraph}
                    onChange={setMatGraph}
                    onApply={applyShader}
                  />
                )}
                {view === "anim" && (
                  <AnimPanel
                    tl={tl}
                    time={animT}
                    playing={animPlay}
                    exporting={exporting}
                    exportProgress={exportProgress}
                    onPlay={setAnimPlay}
                    onSeek={(t) => {
                      setAnimT(t);
                      setCfg((c) => ({ ...c, ...sampleTimeline(tl, t) }));
                    }}
                    onCapture={() => {
                      setTl((old) => ({
                        ...old,
                        keys: [
                          ...old.keys,
                          {
                            t: animT,
                            yaw: cfg.yaw,
                            pitch: cfg.pitch,
                            radius: cfg.radius,
                            vfov: cfg.vfov,
                          },
                        ].sort((a, b) => a.t - b.t),
                      }));
                    }}
                    onReset={() => {
                      setTl(defaultTimeline());
                      setAnimT(0);
                    }}
                    onExport={exportSeq}
                  />
                )}
              </section>

              {showEngineSide && (
                <Controls
                  cfg={cfg}
                  setCfg={setCfg}
                  lightCount={snap.lightCount}
                  primCount={snap.primCount}
                  showLearn={false}
                  onOpenCourse={() => setView("course")}
                />
              )}
            </div>
          </>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-[11px] text-fg-subtle">
          <p>
            主题 <span className="text-[var(--color-mauve)]">Catppuccin Mocha</span> · 005
            后期三件套 · 非完整 Blender
          </p>
          <p className="font-mono text-[10px] text-overlay0">github.com/xiaoqianran/cpp-005</p>
        </footer>
      </div>
    </div>
  );
}
