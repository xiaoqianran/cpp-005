import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Clapperboard,
  FlaskConical,
  GraduationCap,
  Layers,
  Pause,
  Play,
  Workflow,
} from "lucide-react";
import { Curriculum } from "./components/Curriculum";
import { LearningPanel } from "./components/LearningPanel";
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

type View = "lab" | "comp" | "anim" | "shader" | "course";

export default function App() {
  const [cfg, setCfg] = useState<EngineConfig>(defaultConfig);
  const [running, setRunning] = useState(true);
  const [view, setView] = useState<View>("lab");
  const [showLearn, setShowLearn] = useState(true);

  const [compGraph, setCompGraph] = useState<CompGraph>(defaultGraph);
  const [compOn, setCompOn] = useState(true);

  const [tl, setTl] = useState<Timeline>(defaultTimeline);
  const [animT, setAnimT] = useState(0);
  const [animPlay, setAnimPlay] = useState(false);
  const animRef = useRef(0);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  const [matGraph, setMatGraph] = useState<MatGraph>(defaultMatGraph);

  // 动画播放时仍继续采样（原先 !animPlay 会冻屏）
  const { canvasRef, snap, reset, applyMat } = useEngine(cfg, running || animPlay || exporting, {
    compGraph,
    compEnabled: compOn && view !== "course",
  });

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
        const cam = sampleTimeline(tl, nt);
        setCfg((c) => ({ ...c, ...cam }));
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
    setView("lab");
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
    setView("lab");
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
        450, // 每帧等待采样
        {
          setCam: (cam) => setCfg((c) => ({ ...c, ...cam })),
          waitMs: (ms) => new Promise((r) => setTimeout(r, ms)),
          capture: () =>
            new Promise((resolve) => {
              const c = canvasRef.current;
              if (!c) {
                resolve(null);
                return;
              }
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

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-4 py-5 md:px-6 md:py-8">
        <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
              cpp-005 · compositor · shader · animation
            </p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              合成 · Shader 节点 · 相机动画
            </h1>
            <p className="max-w-xl text-sm text-fg-muted md:text-base">
              Blender 三件套教学子集：AOV 合成预设、材质图驱动主球、关键帧导出 PNG 序列。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex h-11 flex-wrap items-center rounded-[var(--radius-md)] border border-border bg-bg-elevated p-1">
              <Tab active={view === "lab"} onClick={() => setView("lab")} icon={<FlaskConical className="size-3.5" />} label="实验台" />
              <Tab active={view === "comp"} onClick={() => setView("comp")} icon={<Layers className="size-3.5" />} label="合成" />
              <Tab active={view === "shader"} onClick={() => setView("shader")} icon={<Workflow className="size-3.5" />} label="Shader" />
              <Tab active={view === "anim"} onClick={() => setView("anim")} icon={<Clapperboard className="size-3.5" />} label="动画" />
              <Tab active={view === "course"} onClick={() => setView("course")} icon={<GraduationCap className="size-3.5" />} label="课程" />
            </div>
            <button
              type="button"
              onClick={() => setShowLearn((v) => !v)}
              className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-bg-elevated px-4 text-sm font-medium"
            >
              <BookOpen className="size-4" />
              {showLearn ? "隐藏摘要" : "摘要"}
            </button>
            <button
              type="button"
              disabled={snap.status !== "ready" || exporting}
              onClick={() => setRunning((v) => !v)}
              className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 text-sm font-semibold text-accent-fg"
            >
              {running ? <Pause className="size-4" /> : <Play className="size-4" />}
              {running ? "暂停" : "继续"}
            </button>
          </div>
        </header>

        {view === "course" ? (
          <div className="flex min-h-[70dvh] flex-col">
            <Curriculum onApply={applyLesson} onClose={() => setView("lab")} />
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
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
                <ShaderGraphPanel graph={matGraph} onChange={setMatGraph} onApply={applyShader} />
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
                    const cam = sampleTimeline(tl, t);
                    setCfg((c) => ({ ...c, ...cam }));
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
              {showLearn && view === "lab" && (
                <div className="lg:hidden">
                  <LearningPanel onOpenCourse={() => setView("course")} />
                </div>
              )}
            </section>
            <Controls
              cfg={cfg}
              setCfg={setCfg}
              lightCount={snap.lightCount}
              primCount={snap.primCount}
              showLearn={showLearn && view === "lab"}
              onOpenCourse={() => setView("course")}
            />
          </div>
        )}

        {view !== "course" && (
          <div className="rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-4 text-xs text-fg-muted">
            <p className="font-medium text-fg">系列 002→005</p>
            <p className="mt-1 leading-relaxed">
              合成预设（电影感 / AOV）· Shader 编译主球 · 动画导出 PNG。Pages：
              cpp-003/004/005 均已 Actions 部署。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-xs font-medium transition ${
        active ? "bg-bg-subtle text-fg" : "text-fg-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
