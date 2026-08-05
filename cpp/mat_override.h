// 材质槽覆盖：供前端 Shader Graph 编译结果写入
#pragma once

#include "vec3.h"

struct MatOverride {
  bool enable = false;
  color albedo = color(0.65, 0.55, 0.45);
  bool metal = false;
  double fuzz = 0.1;
  bool use_nmap = true;
  bool use_texture = false;
};

inline MatOverride &mat_override() {
  static MatOverride m;
  return m;
}
