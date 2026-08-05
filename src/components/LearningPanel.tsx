import { GraduationCap } from "lucide-react";

export function LearningPanel({ onOpenCourse }: { onOpenCourse?: () => void }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <GraduationCap className="size-4 text-accent" />
        完整课程 · cpp-003
      </div>
      <p className="mb-3 text-xs leading-relaxed text-fg-muted">
        AOV 合成节点 · Shader 图驱动主球 · 相机关键帧。挑战 Blender 三件套教学子集。
      </p>
      <ul className="mb-3 space-y-1 text-[11px] text-fg-subtle">
        <li>· Möller–Trumbore 与重心坐标</li>
        <li>· 立方 / 晶体 mesh · SAH-BVH</li>
        <li>· 棋盘 / UV / 程序图像纹理</li>
      </ul>
      {onOpenCourse && (
        <button
          type="button"
          onClick={onOpenCourse}
          className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] bg-accent text-sm font-semibold text-accent-fg"
        >
          进入完整课程
        </button>
      )}
    </div>
  );
}
