// 引擎配置：C++ 侧唯一参数包（与前端 EngineConfig 对应）
#pragma once

#include "vec3.h"

struct CameraPose {
  point3 lookfrom = point3(0, 1, 3);
  point3 lookat = point3(0, 1, 0);
  vec3 vup = vec3(0, 1, 0);
  double vfov = 40;
  double defocus_angle = 0;
  double focus_dist = 3;
};

struct TraceFlags {
  int max_depth = 50;
  int debug_mode = 0;
  bool bvh = true;
  bool nee = true;
  bool mis = true;
  bool rr = true;
};

struct EngineConfig {
  // 0 = 未初始化，迫使首次 apply 分配缓冲
  int width = 0;
  int height = 0;
  int scene_id = 3;
  CameraPose pose;
  TraceFlags flags;
  color background = color(0, 0, 0);
};

inline color scene_background(int scene_id) {
  // 室外场景实际由 Atmosphere::env_sky 接管；此处作回退色
  if (scene_id == 1) return color(0, 0, 0);
  if (scene_id == 2) return color(0.05, 0.05, 0.06);
  return color(0.70, 0.80, 1.00);
}
