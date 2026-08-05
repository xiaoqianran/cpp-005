# cpp-005 · 后期三件套（合成 / Shader / 动画）

> **本期只做一件事：** 像 Blender 那样处理「渲染之后」和「材质/镜头」，  
> **不做：** 再讲一遍路径追踪积分（请回 [002](https://github.com/xiaoqianran/cpp-002)–[004](https://github.com/xiaoqianran/cpp-004)）。

| 课 | 主题 | 你学什么 |
|----|------|----------|
| 002 | 积分 | 光怎么积出正确能量 |
| 003 | 资产 | 网格·纹理·OBJ |
| 004 | 外观光 | 太阳 NEE · 法线贴图 |
| **005** | **后期三件套** | **合成 · 材质节点 · 相机动画** |

- 仓库：https://github.com/xiaoqianran/cpp-005  
- 演示：https://xiaoqianran.github.io/cpp-005/

---

## 打开页面你会看到什么

三个大按钮（主功能）：

1. **① 合成 Compositor** — AOV、曝光、辉光、暗角、预设、导出 PNG  
2. **② Shader 节点** — 颜色/贴图/法线/金属 → 编译到主物体  
3. **③ 相机动画** — 关键帧、播放、导出 PNG 序列  

次要入口（小按钮）：

- **底层预览引擎** — 002–004 的场景/NEE/分辨率（只为出图）  
- **005 课程** — 对应讲义  

默认进入 **① 合成**，不是旧实验台。

---

## 明确不是

- 完整 Blender Shader Editor / 动画/合成器  
- 新积分器、新 BVH、新场景课（那是前面几仓）

## 命令

```bash
npm run dev
npm run build:wasm
BASE_PATH=/cpp-005/ npm run build
```
