// 三角网格：Möller–Trumbore 求交 + 重心插值 UV/法线
#pragma once

#include "hittable.h"
#include "vec3.h"
#include <vector>

struct vertex {
  point3 p;
  vec3 n;
  double u, v;
};

class triangle : public hittable {
public:
  triangle(const vertex &a, const vertex &b, const vertex &c, shared_ptr<material> m)
      : v0(a), v1(b), v2(c), mat(m) {
    bbox = aabb(aabb(v0.p, v1.p), aabb(v0.p, v2.p));
  }

  bool hit(const ray &r, interval ray_t, hit_record &rec) const override {
    const vec3 e1 = v1.p - v0.p;
    const vec3 e2 = v2.p - v0.p;
    const vec3 pvec = cross(r.direction(), e2);
    const double det = dot(e1, pvec);
    if (std::fabs(det) < 1e-10) return false;
    const double inv_det = 1.0 / det;

    const vec3 tvec = r.origin() - v0.p;
    const double u = dot(tvec, pvec) * inv_det;
    if (u < 0.0 || u > 1.0) return false;

    const vec3 qvec = cross(tvec, e1);
    const double v = dot(r.direction(), qvec) * inv_det;
    if (v < 0.0 || u + v > 1.0) return false;

    const double t = dot(e2, qvec) * inv_det;
    if (!ray_t.contains(t)) return false;

    const double w = 1.0 - u - v;
    rec.t = t;
    rec.p = r.at(t);
    rec.u = w * v0.u + u * v1.u + v * v2.u;
    rec.v = w * v0.v + u * v1.v + v * v2.v;
    vec3 n = w * v0.n + u * v1.n + v * v2.n;
    if (n.length_squared() < 1e-16) n = cross(e1, e2);
    rec.set_face_normal(r, unit_vector(n));
    // 从 UV 建 TBN（Mikk 简化）：dp/du, dp/dv
    {
      const vec3 e1 = v1.p - v0.p;
      const vec3 e2 = v2.p - v0.p;
      const double du1 = v1.u - v0.u, dv1 = v1.v - v0.v;
      const double du2 = v2.u - v0.u, dv2 = v2.v - v0.v;
      double det = du1 * dv2 - du2 * dv1;
      if (std::fabs(det) > 1e-12) {
        double inv = 1.0 / det;
        vec3 T = (e1 * dv2 - e2 * dv1) * inv;
        vec3 B = (e2 * du1 - e1 * du2) * inv;
        // 正交化到法线
        vec3 N = rec.normal;
        T = unit_vector(T - N * dot(N, T));
        B = unit_vector(cross(N, T));
        if (dot(cross(T, B), N) < 0) B = -B;
        rec.tangent = T;
        rec.bitangent = B;
        rec.has_tbn = true;
      }
    }
    rec.mat = mat;
    return true;
  }

  aabb bounding_box() const override { return bbox; }

private:
  vertex v0, v1, v2;
  shared_ptr<material> mat;
  aabb bbox;
};

class triangle_mesh {
public:
  std::vector<vertex> verts;
  std::vector<int> indices;
  shared_ptr<material> mat;

  void add_triangle(int i0, int i1, int i2) {
    indices.push_back(i0);
    indices.push_back(i1);
    indices.push_back(i2);
  }

  void compute_vertex_normals() {
    std::vector<vec3> acc(verts.size(), vec3(0, 0, 0));
    for (size_t i = 0; i + 2 < indices.size(); i += 3) {
      auto &a = verts[static_cast<size_t>(indices[i])];
      auto &b = verts[static_cast<size_t>(indices[i + 1])];
      auto &c = verts[static_cast<size_t>(indices[i + 2])];
      vec3 fn = cross(b.p - a.p, c.p - a.p);
      acc[static_cast<size_t>(indices[i])] += fn;
      acc[static_cast<size_t>(indices[i + 1])] += fn;
      acc[static_cast<size_t>(indices[i + 2])] += fn;
    }
    for (size_t i = 0; i < verts.size(); ++i) {
      verts[i].n = acc[i].length_squared() > 0 ? unit_vector(acc[i]) : vec3(0, 1, 0);
    }
  }

  void append_to(hittable_list &world) const {
    for (size_t i = 0; i + 2 < indices.size(); i += 3) {
      world.add(make_shared<triangle>(verts[static_cast<size_t>(indices[i])],
                                      verts[static_cast<size_t>(indices[i + 1])],
                                      verts[static_cast<size_t>(indices[i + 2])], mat));
    }
  }
};

inline triangle_mesh make_cube_mesh(shared_ptr<material> mat, point3 center, double scale) {
  triangle_mesh m;
  m.mat = mat;
  const double h = 0.5 * scale;

  struct Face {
    vec3 n;
    point3 q[4];
  };
  Face faces[6] = {
      {vec3(0, 0, 1), {point3(-h, -h, h), point3(h, -h, h), point3(h, h, h), point3(-h, h, h)}},
      {vec3(0, 0, -1),
       {point3(h, -h, -h), point3(-h, -h, -h), point3(-h, h, -h), point3(h, h, -h)}},
      {vec3(0, 1, 0), {point3(-h, h, h), point3(h, h, h), point3(h, h, -h), point3(-h, h, -h)}},
      {vec3(0, -1, 0),
       {point3(-h, -h, -h), point3(h, -h, -h), point3(h, -h, h), point3(-h, -h, h)}},
      {vec3(1, 0, 0), {point3(h, -h, h), point3(h, -h, -h), point3(h, h, -h), point3(h, h, h)}},
      {vec3(-1, 0, 0),
       {point3(-h, -h, -h), point3(-h, -h, h), point3(-h, h, h), point3(-h, h, -h)}},
  };
  double uvs[4][2] = {{0, 0}, {1, 0}, {1, 1}, {0, 1}};

  for (auto &f : faces) {
    int base = static_cast<int>(m.verts.size());
    for (int i = 0; i < 4; ++i) {
      vertex vt;
      vt.p = center + f.q[i];
      vt.n = f.n;
      vt.u = uvs[i][0];
      vt.v = uvs[i][1];
      m.verts.push_back(vt);
    }
    m.add_triangle(base + 0, base + 1, base + 2);
    m.add_triangle(base + 0, base + 2, base + 3);
  }
  return m;
}


/** 任意尺寸 AABB 盒子（中心 + 半轴），用于桌面等扁长体 */
inline triangle_mesh make_box_mesh(shared_ptr<material> mat, point3 center, vec3 half) {
  triangle_mesh m;
  m.mat = mat;
  double hx = half.x(), hy = half.y(), hz = half.z();
  struct Face {
    vec3 n;
    point3 q[4];
  };
  Face faces[6] = {
      {vec3(0, 0, 1),
       {point3(-hx, -hy, hz), point3(hx, -hy, hz), point3(hx, hy, hz), point3(-hx, hy, hz)}},
      {vec3(0, 0, -1),
       {point3(hx, -hy, -hz), point3(-hx, -hy, -hz), point3(-hx, hy, -hz), point3(hx, hy, -hz)}},
      {vec3(0, 1, 0),
       {point3(-hx, hy, hz), point3(hx, hy, hz), point3(hx, hy, -hz), point3(-hx, hy, -hz)}},
      {vec3(0, -1, 0),
       {point3(-hx, -hy, -hz), point3(hx, -hy, -hz), point3(hx, -hy, hz), point3(-hx, -hy, hz)}},
      {vec3(1, 0, 0),
       {point3(hx, -hy, hz), point3(hx, -hy, -hz), point3(hx, hy, -hz), point3(hx, hy, hz)}},
      {vec3(-1, 0, 0),
       {point3(-hx, -hy, -hz), point3(-hx, -hy, hz), point3(-hx, hy, hz), point3(-hx, hy, -hz)}},
  };
  double uvs[4][2] = {{0, 0}, {1, 0}, {1, 1}, {0, 1}};
  for (auto &f : faces) {
    int base = static_cast<int>(m.verts.size());
    for (int i = 0; i < 4; ++i) {
      vertex vt;
      vt.p = center + f.q[i];
      vt.n = f.n;
      vt.u = uvs[i][0];
      vt.v = uvs[i][1];
      m.verts.push_back(vt);
    }
    m.add_triangle(base + 0, base + 1, base + 2);
    m.add_triangle(base + 0, base + 2, base + 3);
  }
  return m;
}

inline triangle_mesh make_crystal_mesh(shared_ptr<material> mat, point3 center, double scale) {
  triangle_mesh m;
  m.mat = mat;
  auto push = [&](point3 p, double u, double v) {
    vertex vt;
    vt.p = center + p * scale;
    vt.n = vec3(0, 1, 0);
    vt.u = u;
    vt.v = v;
    m.verts.push_back(vt);
  };
  push(point3(0, 1, 0), 0.5, 1);
  push(point3(1, 0, 0), 1, 0.5);
  push(point3(0, 0, 1), 0.5, 0.5);
  push(point3(-1, 0, 0), 0, 0.5);
  push(point3(0, 0, -1), 0.5, 0);
  push(point3(0, -1, 0), 0.5, 0);
  int top = 0, r = 1, f = 2, l = 3, b = 4, bot = 5;
  m.add_triangle(top, r, f);
  m.add_triangle(top, f, l);
  m.add_triangle(top, l, b);
  m.add_triangle(top, b, r);
  m.add_triangle(bot, f, r);
  m.add_triangle(bot, l, f);
  m.add_triangle(bot, b, l);
  m.add_triangle(bot, r, b);
  m.compute_vertex_normals();
  return m;
}
