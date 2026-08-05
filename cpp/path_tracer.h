// 路径追踪：面光 NEE + **环境（太阳）NEE** + MIS + 雾
#pragma once

#include "atmosphere.h"
#include "config.h"
#include "hittable.h"
#include "material.h"
#include "quad.h"
#include "rt_common.h"
#include "vec3.h"
#include <vector>

class path_tracer {
public:
  TraceFlags flags;
  color background = color(0, 0, 0);
  Atmosphere atm{};
  const std::vector<shared_ptr<quad>> *lights = nullptr;

  void set_flags(const TraceFlags &f) { flags = f; }

  color trace(const ray &r, const hittable &world) const {
    return trace_impl(r, flags.max_depth, world, true, 0, -1.0, false);
  }

private:
  static double mis_weight(double pdf_a, double pdf_b) {
    double a2 = pdf_a * pdf_a;
    double b2 = pdf_b * pdf_b;
    return a2 / (a2 + b2 + 1e-12);
  }

  double sun_solid_angle() const {
    // Ω = 2π (1 - cosθ_max)
    return 2 * pi * (1.0 - atm.sun_cos);
  }

  /** 环境作为光源时，方向 wi 的 pdf（仅太阳盘 NEE 策略） */
  double pdf_env_sun(const vec3 &wi) const {
    if (!atm.env_sky) return 0;
    if (dot(unit_vector(wi), atm.sun_dir) < atm.sun_cos) return 0;
    double sa = sun_solid_angle();
    return sa > 1e-12 ? 1.0 / sa : 0;
  }

  /** 在太阳锥内均匀采样方向 */
  vec3 sample_sun_dir() const {
    // 在 sun_dir 周围的圆锥内采样
    onb basis;
    basis.build_from_w(atm.sun_dir);
    double cos_max = atm.sun_cos;
    double r1 = random_double(), r2 = random_double();
    double cos_t = (1 - r1) + r1 * cos_max;
    double sin_t = std::sqrt(std::fmax(0.0, 1 - cos_t * cos_t));
    double phi = 2 * pi * r2;
    return unit_vector(basis.local(std::cos(phi) * sin_t, std::sin(phi) * sin_t, cos_t));
  }

  color miss_color(const ray &r) const {
    if (flags.debug_mode != 0) return color(0, 0, 0);
    if (atm.env_sky) return atm.eval_sky(r.direction());
    return background;
  }

  color env_on_miss(const ray &r, bool is_camera_ray, double prev_bsdf_pdf,
                    bool prev_lambert) const {
    color Le = miss_color(r);
    if (Le.length_squared() < 1e-16) return color(0, 0, 0);
    if (is_camera_ray || !flags.nee || !atm.env_sky) return Le;
    // 朗伯 + NEE：太阳盘用 MIS；普通天空仍走 BSDF 全权重
    if (prev_lambert && prev_bsdf_pdf > 0) {
      double pdf_l = pdf_env_sun(r.direction());
      if (pdf_l > 0) {
        if (flags.mis) return Le * mis_weight(prev_bsdf_pdf, pdf_l);
        return color(0, 0, 0); // 纯 NEE：BSDF 打到太阳的不算
      }
    }
    return Le;
  }

  color sample_env_sun(const hit_record &rec, const hittable &world) const {
    if (!flags.nee || !atm.env_sky) return color(0, 0, 0);
    double sa = sun_solid_angle();
    if (sa < 1e-12) return color(0, 0, 0);

    vec3 wi = sample_sun_dir();
    double cos_surf = dot(rec.normal, wi);
    if (cos_surf <= 0) return color(0, 0, 0);

    // 可见性：不被几何挡住
    hit_record srec;
    if (world.hit(ray(rec.p, wi), interval(0.001, infinity), srec)) return color(0, 0, 0);

    double pdf = 1.0 / sa;
    color Le = atm.eval_sky(wi);
    color f = rec.mat->brdf_lambert(rec);
    // 到「无穷远」的透射：用一个大距离近似雾
    double Tr = atm.transmittance(80.0);
    color contrib = f * Le * cos_surf / pdf * Tr;
    if (flags.mis) {
      double pdf_bsdf = cos_surf / pi;
      contrib = contrib * mis_weight(pdf, pdf_bsdf);
    }
    return contrib;
  }

  color trace_impl(const ray &r, int depth, const hittable &world, bool is_camera_ray, int bounce,
                   double prev_bsdf_pdf, bool prev_lambert) const {
    if (depth <= 0) return color(0, 0, 0);

    hit_record rec;
    const bool hit = world.hit(r, interval(0.001, infinity), rec);
    const double t_hit = hit ? rec.t : infinity;

    if (atm.fog_density > 1e-8 && flags.debug_mode == 0) {
      double t_s;
      if (atm.sample_scatter(t_hit, t_s)) {
        point3 p = r.at(t_s);
        vec3 new_dir = random_unit_vector();
        if (depth <= 2) {
          color env = atm.env_sky ? atm.eval_sky(new_dir) : background;
          return atm.fog_albedo * env;
        }
        return atm.fog_albedo *
               trace_impl(ray(p, new_dir), depth - 1, world, false, bounce + 1, -1.0, false);
      }
    }

    if (!hit) return env_on_miss(r, is_camera_ray, prev_bsdf_pdf, prev_lambert);

    const double Tr = (flags.debug_mode == 0) ? atm.transmittance(rec.t) : 1.0;

    if (flags.debug_mode == 5) {
      if (rec.has_tbn)
        return 0.5 * color(rec.tangent.x() + 1, rec.tangent.y() + 1, rec.tangent.z() + 1);
      return color(0.2, 0, 0.2);
    }
    if (flags.debug_mode == 2) {
      auto d = clamp(rec.t / 12.0, 0.0, 1.0);
      return color(d, d, d);
    }
    if (flags.debug_mode == 3) return rec.mat->emitted(rec);
    if (flags.debug_mode == 4) return color(rec.u, rec.v, 0.15);

    rec.mat->perturb_normal(rec);

    if (flags.debug_mode == 1)
      return 0.5 * color(rec.normal.x() + 1, rec.normal.y() + 1, rec.normal.z() + 1);

    color emit = rec.mat->emitted(rec);
    if (emit.length_squared() > 0) {
      color Le(0, 0, 0);
      if (is_camera_ray || !flags.nee)
        Le = emit;
      else if (flags.mis && prev_lambert && prev_bsdf_pdf > 0) {
        double pdf_l = pdf_light_direction(r.origin(), unit_vector(r.direction()), rec);
        if (pdf_l > 0) Le = emit * mis_weight(prev_bsdf_pdf, pdf_l);
      }
      return Le * Tr;
    }

    ray scattered;
    color attenuation;
    if (!rec.mat->scatter(r, rec, attenuation, scattered)) return color(0, 0, 0);

    color L(0, 0, 0);
    const bool lambert = rec.mat->is_lambertian();
    double bsdf_pdf = lambert ? rec.mat->scattering_pdf(r, rec, scattered) : -1.0;

    if (flags.nee && lambert) {
      if (lights && !lights->empty()) L += sample_direct_light(rec, world);
      // 004：太阳环境 NEE
      L += sample_env_sun(rec, world);
    }

    if (flags.rr && bounce >= 3) {
      double p = std::fmax(attenuation.x(), std::fmax(attenuation.y(), attenuation.z()));
      p = clamp(p, 0.05, 0.95);
      if (random_double() > p) return L * Tr;
      attenuation = attenuation / p;
    }

    L += attenuation *
         trace_impl(scattered, depth - 1, world, false, bounce + 1, bsdf_pdf, lambert);
    return L * Tr;
  }

  double pdf_light_direction(const point3 &origin, const vec3 &unit_dir,
                             const hit_record &lrec) const {
    if (!lights || lights->empty()) return 0;
    const auto &list = *lights;
    double dist2 = (lrec.p - origin).length_squared();
    double cos_l = std::fabs(dot(lrec.normal, unit_dir));
    if (cos_l < 1e-8) return 0;
    double best_area = 0, best_score = infinity;
    for (const auto &lg : list) {
      double align = std::fabs(dot(lg->outward_normal(), lrec.normal));
      if (align < 0.9) continue;
      double d = (lg->centroid() - lrec.p).length_squared();
      if (d < best_score) {
        best_score = d;
        best_area = lg->surface_area();
      }
    }
    if (best_area <= 0) best_area = list[0]->surface_area();
    if (best_area <= 0) return 0;
    return (1.0 / (static_cast<double>(list.size()) * best_area)) * dist2 / cos_l;
  }

  color sample_direct_light(const hit_record &rec, const hittable &world) const {
    const auto &list = *lights;
    const size_t n = list.size();
    if (n == 0) return color(0, 0, 0);
    auto light = list[static_cast<size_t>(random_int(0, static_cast<int>(n) - 1))];
    point3 on_light = light->sample_point();
    vec3 to_light = on_light - rec.p;
    double dist2 = to_light.length_squared();
    if (dist2 < 1e-12) return color(0, 0, 0);
    double dist = std::sqrt(dist2);
    vec3 wi = to_light / dist;
    double cos_surf = dot(rec.normal, wi);
    if (cos_surf <= 0) return color(0, 0, 0);
    double cos_light = -dot(light->outward_normal(), wi);
    if (cos_light <= 0) return color(0, 0, 0);
    hit_record shadow_rec;
    if (world.hit(ray(rec.p, wi), interval(0.001, dist - 1e-4), shadow_rec))
      return color(0, 0, 0);
    double area = light->surface_area();
    if (area <= 0) return color(0, 0, 0);
    double pdf_solid = (1.0 / (static_cast<double>(n) * area)) * dist2 / cos_light;
    if (pdf_solid <= 1e-12) return color(0, 0, 0);
    hit_record light_rec;
    light_rec.p = on_light;
    light_rec.normal = light->outward_normal();
    light_rec.mat = light->material_ptr();
    color Le = light->material_ptr()->emitted(light_rec);
    color f = rec.mat->brdf_lambert(rec);
    color contrib = f * Le * (cos_surf / pdf_solid) * atm.transmittance(dist);
    if (flags.mis) {
      double pdf_bsdf = cos_surf / pi;
      contrib = contrib * mis_weight(pdf_solid, pdf_bsdf);
    }
    return contrib;
  }
};
