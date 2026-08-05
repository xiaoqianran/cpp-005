# cpp-005 架构

```text
WASM path tracer → beauty + AOV(normal,depth)
                 ↓
         compositor graph (CPU ImageData)
                 ↓
              canvas

Shader graph → compile → rt_set_mat_override → rebuild scene 0 ball
Timeline → yaw/pitch/radius/vfov → applyPose
```
