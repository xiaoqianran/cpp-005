/** 相机关键帧时间轴 */

export type CamKey = {
  t: number; // 秒
  yaw: number;
  pitch: number;
  radius: number;
  vfov: number;
};

export type Timeline = {
  keys: CamKey[];
  duration: number;
  loop: boolean;
};

export function defaultTimeline(): Timeline {
  return {
    duration: 8,
    loop: true,
    keys: [
      { t: 0, yaw: 0.2, pitch: 0.15, radius: 7.5, vfov: 32 },
      { t: 2.5, yaw: 1.1, pitch: 0.22, radius: 6.5, vfov: 30 },
      { t: 5, yaw: 2.4, pitch: 0.12, radius: 8.5, vfov: 28 },
      { t: 8, yaw: 0.2 + Math.PI * 2, pitch: 0.15, radius: 7.5, vfov: 32 },
    ],
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function sampleTimeline(tl: Timeline, time: number): Omit<CamKey, "t"> {
  let t = time;
  if (tl.loop && tl.duration > 0) {
    t = ((t % tl.duration) + tl.duration) % tl.duration;
  } else {
    t = Math.min(Math.max(t, 0), tl.duration);
  }
  const keys = [...tl.keys].sort((a, b) => a.t - b.t);
  if (keys.length === 0) return { yaw: 0, pitch: 0.15, radius: 6, vfov: 40 };
  if (t <= keys[0]!.t) {
    const k = keys[0]!;
    return { yaw: k.yaw, pitch: k.pitch, radius: k.radius, vfov: k.vfov };
  }
  if (t >= keys[keys.length - 1]!.t) {
    const k = keys[keys.length - 1]!;
    return { yaw: k.yaw, pitch: k.pitch, radius: k.radius, vfov: k.vfov };
  }
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]!,
      b = keys[i + 1]!;
    if (t >= a.t && t <= b.t) {
      const u = (t - a.t) / Math.max(1e-6, b.t - a.t);
      // smoothstep
      const s = u * u * (3 - 2 * u);
      return {
        yaw: lerp(a.yaw, b.yaw, s),
        pitch: lerp(a.pitch, b.pitch, s),
        radius: lerp(a.radius, b.radius, s),
        vfov: lerp(a.vfov, b.vfov, s),
      };
    }
  }
  const k = keys[0]!;
  return { yaw: k.yaw, pitch: k.pitch, radius: k.radius, vfov: k.vfov };
}
