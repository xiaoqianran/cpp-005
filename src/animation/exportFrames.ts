/** 按时间轴导出 PNG 帧（浏览器下载） */

import type { Timeline } from "./timeline";
import { sampleTimeline } from "./timeline";
import type { EngineConfig } from "../engine/types";

export type FrameExporter = {
  setCam: (cam: Partial<EngineConfig>) => void;
  /** 等待若干 ms 让采样累积 */
  waitMs: (ms: number) => Promise<void>;
  /** 抓当前 canvas 为 blob */
  capture: () => Promise<Blob | null>;
};

export async function exportFrameSequence(
  tl: Timeline,
  fps: number,
  sppWaitMs: number,
  exp: FrameExporter,
  onProgress?: (i: number, total: number) => void,
): Promise<number> {
  const total = Math.max(1, Math.ceil(tl.duration * fps));
  let saved = 0;
  for (let i = 0; i < total; i++) {
    const t = (i / fps) % (tl.duration + 1e-9);
    const cam = sampleTimeline(tl, t);
    exp.setCam(cam);
    await exp.waitMs(sppWaitMs);
    const blob = await exp.capture();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `frame_${String(i).padStart(4, "0")}.png`;
      a.click();
      URL.revokeObjectURL(url);
      saved++;
      // 浏览器限流：帧间稍歇
      await exp.waitMs(80);
    }
    onProgress?.(i + 1, total);
  }
  return saved;
}
