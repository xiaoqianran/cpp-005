import type { Chapter } from "./types";

/** cpp-005：合成 · Shader · 动画 */
export const CHAPTERS: Chapter[] = [
  {
    id: "ch00",
    index: 0,
    title: "导论",
    subtitle: "挑战 Blender 三件套",
    lessons: [
      {
        id: "ch00-scope",
        title: "005 做什么、不做什么",
        minutes: 6,
        summary: "Compositor + 材质图子集 + 相机关键帧；不是完整 Blender。",
        refs: ["Blender Manual 概念"],
        blocks: [
          {
            type: "compare",
            left: {
              title: "本课教学子集",
              body: "合成节点 7 种 · Shader 图编译到主球 · 相机 4 通道关键帧",
            },
            right: {
              title: "明确不做",
              body: "全量节点、骨骼动画、Nuke 级合成、OSL",
            },
          },
          {
            type: "ul",
            items: [
              "合成：对 beauty/normal/depth AOV 做曝光辉光",
              "Shader：Color/Texture/Normal/Metal → 覆盖场景 0 主球",
              "动画：yaw/pitch/radius/vfov 时间轴",
            ],
          },
        ],
        action: { label: "回到阳光沙地", sceneId: 0 },
      },
    ],
  },
  {
    id: "ch01",
    index: 1,
    title: "AOV 与合成",
    subtitle: "Compositor",
    lessons: [
      {
        id: "ch01-aov",
        title: "什么是 AOV",
        minutes: 8,
        summary: "Arbitrary Output Variables：beauty / normal / depth。",
        refs: ["PBRT film", "Blender AOV"],
        blocks: [
          {
            type: "p",
            text: "每满一帧引擎 bake 主光线法线与深度缓冲。合成输入节点可切换 0 美 1 法 2 深。",
          },
          {
            type: "map",
            rows: [
              { file: "cpp/engine.h", note: "bake_aov" },
              { file: "src/compositor/evaluate.ts", note: "节点求值" },
            ],
          },
        ],
        action: { label: "阳光沙地", sceneId: 0 },
      },
      {
        id: "ch01-graph",
        title: "合成节点图",
        minutes: 10,
        summary: "Input→Exposure/Bloom→Mix→Gamma→Vignette→View",
        refs: ["Blender Compositor"],
        blocks: [
          {
            type: "ol",
            items: [
              "打开顶部「合成」页",
              "调曝光 stops、辉光阈值",
              "关「启用合成」对比原 beauty",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "ch02",
    index: 2,
    title: "Shader Graph",
    subtitle: "材质节点子集",
    lessons: [
      {
        id: "ch02-compile",
        title: "图 → 参数 → 主球",
        minutes: 10,
        summary: "编译为 albedo/metal/nmap，rt_set_mat_override 重建场景 0。",
        refs: ["Blender Shader Editor 概念"],
        blocks: [
          {
            type: "p",
            text: "完整节点 BSDF 进路径追踪是工业级工程。本课先打通：节点参数 → C++ 材质覆盖 → 可见差异。",
          },
          {
            type: "quiz",
            q: "「编译并应用」主要改哪个场景物体？",
            options: ["所有墙", "场景 0 主球", "太阳", "雾"],
            answer: 1,
            explain: "mat_override 挂在阳光沙地中央主球。",
          },
        ],
        action: { label: "场景 0 准备", sceneId: 0 },
      },
    ],
  },
  {
    id: "ch03",
    index: 3,
    title: "相机动画",
    subtitle: "关键帧",
    lessons: [
      {
        id: "ch03-keys",
        title: "时间轴采样",
        minutes: 8,
        summary: "smoothstep 插值关键帧；播放时持续路径追踪。",
        refs: ["动画曲线概念"],
        blocks: [
          {
            type: "ol",
            items: ["打开「动画」", "播放默认环绕", "拖拽相机后「记录关键帧」", "再播放"],
          },
          {
            type: "callout",
            tone: "warn",
            text: "每帧会 reset 累积（姿态变），动画预览噪声大是正常的。",
          },
        ],
      },
    ],
  },
];

export function allLessons() {
  return CHAPTERS.flatMap((c) => c.lessons.map((l) => ({ chapter: c, lesson: l })));
}

export function findLesson(id: string) {
  for (const c of CHAPTERS) {
    const l = c.lessons.find((x) => x.id === id);
    if (l) return { chapter: c, lesson: l };
  }
  return null;
}
