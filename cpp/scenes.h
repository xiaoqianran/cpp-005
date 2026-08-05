// cpp-004 场景：环境太阳 NEE · 法线贴图对照
#pragma once

#include "hittable.h"
#include "instance.h"
#include "loader_obj.h"
#include "material.h"
#include "mesh.h"
#include "quad.h"
#include "sphere.h"
#include "mat_override.h"
#include "texture.h"
#include <vector>

inline shared_ptr<hittable> mesh_as_hittable(const triangle_mesh &m) {
  auto list = make_shared<hittable_list>();
  m.append_to(*list);
  return list;
}

// 0 阳光沙地：太阳 NEE 硬影
// 1 法线对照：左无 nmap / 右有 nmap
// 2 室外道具 + 软太阳
// 3 雾中晶簇
// 4 经典三球
inline void build_scene(int scene_id, hittable_list &world,
                        std::vector<shared_ptr<quad>> &lights) {
  world.clear();
  lights.clear();

  if (scene_id == 0) {
    auto ground = make_shared<lambertian>(
        make_shared<checker_texture>(0.5, color(0.3, 0.28, 0.2), color(0.75, 0.7, 0.55)));
    world.add(make_shared<sphere>(point3(0, -1000, 0), 1000, ground));
    {
      auto &mo = mat_override();
      shared_ptr<material> main_mat;
      if (mo.enable) {
        if (mo.metal)
          main_mat = make_shared<metal>(mo.albedo, mo.fuzz);
        else if (mo.use_nmap)
          main_mat = make_shared<lambertian>(
              mo.use_texture ? static_cast<shared_ptr<texture>>(image_texture::make_wood(64, 64))
                             : static_cast<shared_ptr<texture>>(make_shared<solid_color>(mo.albedo)),
              image_texture::make_normal_bricks(64, 64), 1.0, true);
        else
          main_mat = make_shared<lambertian>(mo.albedo);
      } else {
        main_mat = make_shared<lambertian>(color(0.7, 0.7, 0.75));
      }
      world.add(make_shared<sphere>(point3(0, 1.2, 0), 1.2, main_mat));
    }
    world.add(make_shared<sphere>(point3(-2.5, 0.8, 1.5), 0.8, make_shared<metal>(color(0.9, 0.85, 0.7), 0.05)));
    world.add(make_shared<sphere>(point3(2.2, 0.7, 0.5), 0.7, make_shared<dielectric>(1.5)));
    make_box_mesh(make_shared<lambertian>(color(0.55, 0.5, 0.45)), point3(-0.5, 0.6, -1.8),
                  vec3(2.5, 0.6, 0.15))
        .append_to(world);
    // 细柱：更明显的细阴影
    make_box_mesh(make_shared<lambertian>(color(0.4, 0.42, 0.45)), point3(1.2, 1.0, -0.5),
                  vec3(0.08, 1.0, 0.08))
        .append_to(world);
    return;
  }

  if (scene_id == 1) {
    auto nmap = image_texture::make_normal_bricks(128, 128);
    auto plain_alb = make_shared<solid_color>(color(0.62, 0.58, 0.54));
    auto brick_alb =
        make_shared<uv_checker_texture>(6, color(0.55, 0.38, 0.3), color(0.72, 0.58, 0.48));

    // 地面：右侧一半带法线（用两块 quad）
    auto floor_plain = make_shared<lambertian>(plain_alb);
    auto floor_nmap = make_shared<lambertian>(brick_alb, nmap, 1.0, true);
    world.add(make_shared<quad>(point3(-3, 0, -2.5), vec3(3, 0, 0), vec3(0, 0, 5), floor_plain));
    world.add(make_shared<quad>(point3(0, 0, -2.5), vec3(3, 0, 0), vec3(0, 0, 5), floor_nmap));

    // 后墙整面 nmap
    auto wall = make_shared<lambertian>(brick_alb, nmap, 1.0, true);
    world.add(make_shared<quad>(point3(-3, 0, -2.5), vec3(6, 0, 0), vec3(0, 2.8, 0), wall));

    // 左立方：无 nmap · 右立方：有 nmap（同 albedo）
    auto mat_l = make_shared<lambertian>(plain_alb);
    auto mat_r = make_shared<lambertian>(plain_alb, nmap, 1.15, true);
    make_cube_mesh(mat_l, point3(-1.15, 0.55, 0.4), 1.0).append_to(world);
    make_cube_mesh(mat_r, point3(1.15, 0.55, 0.4), 1.0).append_to(world);

    // 分隔标记球
    world.add(make_shared<sphere>(point3(0, 0.2, 1.6), 0.2, make_shared<metal>(color(0.9, 0.9, 0.95), 0.05)));
    return;
  }

  if (scene_id == 2) {
    auto nmap = image_texture::make_normal_bricks(96, 96);
    auto floor_mat = make_shared<lambertian>(image_texture::make_wood(128, 128), nmap, 0.55, true);
    world.add(make_shared<quad>(point3(-4, 0, -4), vec3(8, 0, 0), vec3(0, 0, 8), floor_mat));
    auto wall = make_shared<lambertian>(make_shared<solid_color>(color(0.72, 0.7, 0.68)), nmap, 1.0, true);
    world.add(make_shared<quad>(point3(-4, 0, -4), vec3(8, 0, 0), vec3(0, 3.2, 0), wall));

    auto gold = make_shared<metal>(color(0.9, 0.75, 0.3), 0.1);
    auto trophy = load_obj_string(k_builtin_trophy_obj(), gold, point3(0, 0, 0), 0.7, 0.0);
    world.add(instance_ry_t(mesh_as_hittable(trophy), 25, vec3(0, 0, 0.2)));
    world.add(make_shared<sphere>(point3(1.4, 0.55, 1.0), 0.55, make_shared<dielectric>(1.5)));
    world.add(make_shared<sphere>(point3(-1.3, 0.45, 0.8), 0.45,
                                  make_shared<lambertian>(color(0.2, 0.35, 0.6))));
    // 挡光板：看太阳 NEE 投影在法线地面上
    make_box_mesh(make_shared<lambertian>(color(0.15, 0.15, 0.18)), point3(0.2, 1.4, -1.2),
                  vec3(1.2, 0.08, 0.08))
        .append_to(world);
    return;
  }

  if (scene_id == 3) {
    auto ground = make_shared<lambertian>(color(0.4, 0.4, 0.45));
    world.add(make_shared<quad>(point3(-12, 0, -12), vec3(24, 0, 0), vec3(0, 0, 24), ground));
    auto mat_a = make_shared<lambertian>(image_texture::make_demo(24, 24));
    auto mat_b = make_shared<metal>(color(0.7, 0.7, 0.75), 0.15);
    auto proto_c = mesh_as_hittable(make_crystal_mesh(mat_a, point3(0, 0, 0), 0.45));
    auto proto_b = mesh_as_hittable(make_cube_mesh(mat_b, point3(0, 0, 0), 0.7));
    for (int i = -5; i <= 5; ++i)
      for (int j = -5; j <= 5; ++j) {
        point3 c(i * 1.1 + 0.2 * (j % 2), 0.55, j * 1.1);
        double yaw = 15.0 * ((i * 3 + j) % 8);
        if ((i + j) % 2 == 0)
          world.add(instance_ry_t(proto_c, yaw, vec3(c.x(), c.y(), c.z())));
        else
          world.add(instance_ry_t(proto_b, yaw, vec3(c.x(), c.y(), c.z())));
      }
    return;
  }

  auto ground = make_shared<lambertian>(color(0.5, 0.5, 0.5));
  world.add(make_shared<sphere>(point3(0, -1000, 0), 1000, ground));
  world.add(make_shared<sphere>(point3(0, 1, 0), 1.0, make_shared<dielectric>(1.5)));
  world.add(make_shared<sphere>(point3(-2, 1, 0), 1.0, make_shared<lambertian>(color(0.4, 0.2, 0.1))));
  world.add(make_shared<sphere>(point3(2, 1, 0), 1.0, make_shared<metal>(color(0.7, 0.6, 0.5), 0.0)));
}
