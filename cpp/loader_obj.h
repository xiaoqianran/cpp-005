// 最小 OBJ 加载器：从内存字符串解析 v / vt / vn / f
#pragma once

#include "mesh.h"
#include "rt_common.h"
#include <cctype>
#include <sstream>
#include <string>
#include <vector>

namespace obj_detail {

inline void skip_ws(const char *&p) {
  while (*p && std::isspace(static_cast<unsigned char>(*p))) ++p;
}

inline bool read_token(const char *&p, std::string &out) {
  skip_ws(p);
  if (!*p || *p == '#') return false;
  const char *s = p;
  while (*p && !std::isspace(static_cast<unsigned char>(*p))) ++p;
  out.assign(s, p);
  return !out.empty();
}

// 解析 f 分量：i 或 i/j 或 i/j/k 或 i//k （1-based，负索引相对末尾）
inline void parse_face_vert(const std::string &tok, int nV, int nT, int nN, int &vi, int &ti,
                            int &ni) {
  vi = ti = ni = 0;
  int slash = 0;
  std::string part;
  for (size_t k = 0; k <= tok.size(); ++k) {
    char c = k < tok.size() ? tok[k] : '/';
    if (c == '/' || k == tok.size()) {
      if (!part.empty()) {
        int val = std::atoi(part.c_str());
        if (slash == 0) {
          vi = val < 0 ? nV + 1 + val : val;
        } else if (slash == 1) {
          ti = val < 0 ? nT + 1 + val : val;
        } else if (slash == 2) {
          ni = val < 0 ? nN + 1 + val : val;
        }
        part.clear();
      }
      if (k < tok.size() && c == '/') ++slash;
    } else {
      part.push_back(c);
    }
  }
}

} // namespace obj_detail

/**
 * 从 OBJ 文本构建 triangle_mesh。
 * 支持三角面；四边形自动拆成两个三角。
 * center/scale/yaw：放到场景坐标系。
 */
inline triangle_mesh load_obj_string(const char *obj_text, shared_ptr<material> mat,
                                     point3 center = point3(0, 0, 0), double scale = 1.0,
                                     double yaw = 0.0) {
  triangle_mesh mesh;
  mesh.mat = mat;

  std::vector<point3> positions;
  std::vector<vec3> normals;
  std::vector<std::pair<double, double>> uvs;

  // 每个角点 (vi,ti,ni) 映射到 mesh.verts 下标
  std::vector<int> face_corner_indices; // 临时

  std::istringstream in(obj_text);
  std::string line;
  while (std::getline(in, line)) {
    if (line.empty() || line[0] == '#') continue;
    std::istringstream ls(line);
    std::string tag;
    ls >> tag;
    if (tag == "v") {
      double x, y, z;
      ls >> x >> y >> z;
      positions.emplace_back(x, y, z);
    } else if (tag == "vt") {
      double u, v;
      ls >> u >> v;
      uvs.emplace_back(u, v);
    } else if (tag == "vn") {
      double x, y, z;
      ls >> x >> y >> z;
      normals.push_back(unit_vector(vec3(x, y, z)));
    } else if (tag == "f") {
      std::vector<std::string> toks;
      std::string t;
      while (ls >> t) toks.push_back(t);
      if (toks.size() < 3) continue;

      auto corner = [&](const std::string &tok) -> int {
        int vi, ti, ni;
        obj_detail::parse_face_vert(tok, static_cast<int>(positions.size()),
                                    static_cast<int>(uvs.size()),
                                    static_cast<int>(normals.size()), vi, ti, ni);
        if (vi < 1 || vi > static_cast<int>(positions.size())) return -1;
        vertex vert;
        vert.p = positions[static_cast<size_t>(vi - 1)];
        if (ti >= 1 && ti <= static_cast<int>(uvs.size())) {
          vert.u = uvs[static_cast<size_t>(ti - 1)].first;
          vert.v = uvs[static_cast<size_t>(ti - 1)].second;
        } else {
          vert.u = 0;
          vert.v = 0;
        }
        if (ni >= 1 && ni <= static_cast<int>(normals.size())) {
          vert.n = normals[static_cast<size_t>(ni - 1)];
        } else {
          vert.n = vec3(0, 1, 0);
        }
        int idx = static_cast<int>(mesh.verts.size());
        mesh.verts.push_back(vert);
        return idx;
      };

      std::vector<int> ids;
      ids.reserve(toks.size());
      for (auto &tk : toks) {
        int id = corner(tk);
        if (id >= 0) ids.push_back(id);
      }
      // fan triangulation
      for (size_t i = 1; i + 1 < ids.size(); ++i) {
        mesh.add_triangle(ids[0], ids[i], ids[i + 1]);
      }
    }
  }

  // 若无 vn，按面算顶点法线
  bool any_n = false;
  for (auto &v : mesh.verts) {
    if (v.n.length_squared() > 1e-12 && (v.n.x() != 0 || v.n.z() != 0 || v.n.y() != 1)) {
      any_n = true;
      break;
    }
  }
  if (!any_n) mesh.compute_vertex_normals();

  // 变换：yaw → scale → translate
  const double cy = std::cos(yaw), sy = std::sin(yaw);
  for (auto &v : mesh.verts) {
    double x = v.p.x() * scale;
    double y = v.p.y() * scale;
    double z = v.p.z() * scale;
    double xr = cy * x + sy * z;
    double zr = -sy * x + cy * z;
    v.p = point3(xr, y, zr) + center;
    double nx = v.n.x(), ny = v.n.y(), nz = v.n.z();
    v.n = unit_vector(vec3(cy * nx + sy * nz, ny, -sy * nx + cy * nz));
  }

  return mesh;
}

/** 内置低模：简锥 + 底座「奖杯」OBJ（教学用，无外链） */
inline const char *k_builtin_trophy_obj() {
  return R"OBJ(
# simple trophy — 三角面
v 0 0 0
v 0.6 0 0
v 0.6 0 0.6
v 0 0 0.6
v 0.1 0.15 0.1
v 0.5 0.15 0.1
v 0.5 0.15 0.5
v 0.1 0.15 0.5
v 0.2 0.15 0.2
v 0.4 0.15 0.2
v 0.4 0.15 0.4
v 0.2 0.15 0.4
v 0.25 0.7 0.25
v 0.35 0.7 0.25
v 0.35 0.7 0.35
v 0.25 0.7 0.35
v 0.15 0.85 0.15
v 0.45 0.85 0.15
v 0.45 0.85 0.45
v 0.15 0.85 0.45
v 0.3 1.0 0.3
vt 0 0
vt 1 0
vt 1 1
vt 0 1
# base
f 1/1 2/2 3/3
f 1/1 3/3 4/4
f 5/1 6/2 7/3
f 5/1 7/3 8/4
f 1/1 2/2 6/3
f 1/1 6/3 5/4
f 2/1 3/2 7/3
f 2/1 7/3 6/4
f 3/1 4/2 8/3
f 3/1 8/3 7/4
f 4/1 1/2 5/3
f 4/1 5/3 8/4
# stem
f 9/1 10/2 14/3
f 9/1 14/3 13/4
f 10/1 11/2 15/3
f 10/1 15/3 14/4
f 11/1 12/2 16/3
f 11/1 16/3 15/4
f 12/1 9/2 13/3
f 12/1 13/3 16/4
# cup
f 13/1 14/2 18/3
f 13/1 18/3 17/4
f 14/1 15/2 19/3
f 14/1 19/3 18/4
f 15/1 16/2 20/3
f 15/1 20/3 19/4
f 16/1 13/2 17/3
f 16/1 17/3 20/4
f 17/1 18/2 21/3
f 18/1 19/2 21/3
f 19/1 20/2 21/3
f 20/1 17/2 21/3
)OBJ";
}

/** 内置：低模四面体星（fan） */
inline const char *k_builtin_tetra_obj() {
  return R"OBJ(
v 1 1 1
v 1 -1 -1
v -1 1 -1
v -1 -1 1
vt 0 0
vt 1 0
vt 0.5 1
f 1/1 2/2 3/3
f 1/1 3/2 4/3
f 1/1 4/2 2/3
f 2/1 4/2 3/3
)OBJ";
}
