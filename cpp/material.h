// 材质：纹理朗伯 + 切空间法线贴图 / 高度 bump
#pragma once

#include "hittable.h"
#include "onb.h"
#include "rt_common.h"
#include "texture.h"
#include "vec3.h"

class material {
public:
  virtual ~material() = default;
  virtual bool scatter(const ray &, const hit_record &, color &, ray &) const { return false; }
  virtual color emitted(const hit_record &) const { return color(0, 0, 0); }
  virtual bool is_lambertian() const { return false; }
  virtual color brdf_lambert(const hit_record &) const { return color(0, 0, 0); }
  virtual double scattering_pdf(const ray &, const hit_record &, const ray &) const { return -1.0; }
  virtual void perturb_normal(hit_record &rec) const { (void)rec; }
};

class lambertian : public material {
public:
  lambertian(const color &albedo) : tex(make_shared<solid_color>(albedo)) {}
  lambertian(shared_ptr<texture> t) : tex(t) {}
  lambertian(shared_ptr<texture> t, shared_ptr<texture> bump_tex, double strength)
      : tex(t), bump(bump_tex), bump_strength(strength) {}
  // albedo + normal map（第四个参数区分 bump 三参）
  lambertian(shared_ptr<texture> albedo, shared_ptr<texture> nmap, double strength, bool is_nmap)
      : tex(albedo), normal_strength(strength) {
    if (is_nmap)
      normal_map = nmap;
    else {
      bump = nmap;
      bump_strength = strength;
    }
  }

  void perturb_normal(hit_record &rec) const override {
    if (normal_map) {
      color c = normal_map->value(rec.u, rec.v, rec.p);
      vec3 n_ts(2 * c.x() - 1, 2 * c.y() - 1, 2 * c.z() - 1);
      n_ts = unit_vector(vec3(n_ts.x() * normal_strength, n_ts.y() * normal_strength,
                              std::fmax(n_ts.z(), 0.2)));
      vec3 n_world;
      if (rec.has_tbn) {
        n_world = unit_vector(n_ts.x() * rec.tangent + n_ts.y() * rec.bitangent +
                              n_ts.z() * rec.normal);
      } else {
        onb basis;
        basis.build_from_w(rec.normal);
        n_world = unit_vector(basis.local(n_ts));
      }
      if (dot(n_world, rec.normal) < 0) n_world = -n_world;
      rec.normal = n_world;
      return;
    }
    if (!bump) return;
    const double eps = 0.003;
    auto height = [&](double u, double v) { return bump->value(u, v, rec.p).x(); };
    double h0 = height(rec.u, rec.v);
    double hu = (height(rec.u + eps, rec.v) - h0) / eps;
    double hv = (height(rec.u, rec.v + eps) - h0) / eps;
    onb basis;
    basis.build_from_w(rec.normal);
    vec3 n = unit_vector(rec.normal - bump_strength * (hu * basis.u() + hv * basis.v()));
    if (dot(n, rec.normal) < 0) n = -n;
    rec.normal = n;
  }

  bool scatter(const ray &, const hit_record &rec, color &attenuation, ray &scattered) const override {
    onb uvw;
    uvw.build_from_w(rec.normal);
    scattered = ray(rec.p, unit_vector(uvw.local(random_cosine_direction())));
    attenuation = tex->value(rec.u, rec.v, rec.p);
    return true;
  }

  bool is_lambertian() const override { return true; }
  color brdf_lambert(const hit_record &rec) const override {
    return tex->value(rec.u, rec.v, rec.p) / pi;
  }
  double scattering_pdf(const ray &, const hit_record &rec, const ray &scattered) const override {
    auto cos_theta = dot(rec.normal, unit_vector(scattered.direction()));
    return cos_theta < 0 ? 0 : cos_theta / pi;
  }

private:
  shared_ptr<texture> tex;
  shared_ptr<texture> bump;
  shared_ptr<texture> normal_map;
  double bump_strength = 1.0;
  double normal_strength = 1.0;
};

class metal : public material {
public:
  metal(const color &albedo, double fuzz) : albedo(albedo), fuzz(fuzz < 1 ? fuzz : 1) {}
  bool scatter(const ray &r_in, const hit_record &rec, color &attenuation,
               ray &scattered) const override {
    vec3 reflected = reflect(unit_vector(r_in.direction()), rec.normal);
    scattered = ray(rec.p, reflected + fuzz * random_unit_vector());
    attenuation = albedo;
    return dot(scattered.direction(), rec.normal) > 0;
  }

private:
  color albedo;
  double fuzz;
};

class dielectric : public material {
public:
  dielectric(double refraction_index) : refraction_index(refraction_index) {}
  bool scatter(const ray &r_in, const hit_record &rec, color &attenuation,
               ray &scattered) const override {
    attenuation = color(1, 1, 1);
    double ri = rec.front_face ? (1.0 / refraction_index) : refraction_index;
    vec3 unit_direction = unit_vector(r_in.direction());
    double cos_theta = std::fmin(dot(-unit_direction, rec.normal), 1.0);
    double sin_theta = std::sqrt(1.0 - cos_theta * cos_theta);
    vec3 direction;
    if (ri * sin_theta > 1.0 || reflectance(cos_theta, ri) > random_double())
      direction = reflect(unit_direction, rec.normal);
    else
      direction = refract(unit_direction, rec.normal, ri);
    scattered = ray(rec.p, direction);
    return true;
  }

private:
  double refraction_index;
  static double reflectance(double cosine, double ref_idx) {
    auto r0 = (1 - ref_idx) / (1 + ref_idx);
    r0 = r0 * r0;
    return r0 + (1 - r0) * std::pow(1 - cosine, 5);
  }
};

class diffuse_light : public material {
public:
  diffuse_light(const color &emit) : emit(emit) {}
  color emitted(const hit_record &) const override { return emit; }

private:
  color emit;
};
