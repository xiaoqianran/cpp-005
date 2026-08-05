// 材质槽覆盖：供前端 Shader Graph 编译结果写入
#pragma once

#include "material.h"
#include "texture.h"
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

/** 由覆盖参数生成材质；未启用时返回 fallback */
inline shared_ptr<material> material_from_override(shared_ptr<material> fallback) {
  auto &mo = mat_override();
  if (!mo.enable) return fallback;
  if (mo.metal) return make_shared<metal>(mo.albedo, mo.fuzz);
  shared_ptr<texture> alb =
      mo.use_texture ? static_cast<shared_ptr<texture>>(image_texture::make_wood(64, 64))
                     : static_cast<shared_ptr<texture>>(make_shared<solid_color>(mo.albedo));
  if (mo.use_nmap)
    return make_shared<lambertian>(alb, image_texture::make_normal_bricks(64, 64), 1.0, true);
  return make_shared<lambertian>(alb);
}
