# cpp-005 · 合成 · Shader 节点 · 相机动画

## 系列

| 课 | 一句话 |
|----|--------|
| [cpp-002](https://github.com/xiaoqianran/cpp-002) | 光线怎么积能量 |
| [cpp-003](https://github.com/xiaoqianran/cpp-003) | 资产怎么进场景 |
| [cpp-004](https://github.com/xiaoqianran/cpp-004) | 太阳 NEE · 法线贴图 |
| **cpp-005** | **AOV 合成 · 材质节点 · 相机动画** |

- 仓库：https://github.com/xiaoqianran/cpp-005  
- 演示：https://xiaoqianran.github.io/cpp-005/

## 三件套（教学子集）

1. **Compositor**：Input/Exposure/Bloom/Mix/Gamma/Vignette/View + beauty/normal/depth AOV  
2. **Shader Graph**：Color·Texture·Normal·Metal → `rt_set_mat_override` → 场景 0 主球  
3. **Animation**：yaw/pitch/radius/vfov 关键帧 + 播放

## 明确边界

不是完整 Blender。无骨骼、无 OSL、无全量合成节点。

## 命令

```bash
npm run dev
npm run build:wasm
npm run build   # BASE_PATH=/cpp-005/
```
