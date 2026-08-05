/** localStorage 持久化合成图 / 材质图 / 时间轴 */

const K_COMP = "cpp005-comp-v1";
const K_MAT = "cpp005-mat-v1";
const K_TL = "cpp005-tl-v1";

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export const persistKeys = { K_COMP, K_MAT, K_TL };
