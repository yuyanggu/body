# Skill: Shader Edit

Use this skill when adding, modifying, or debugging GLSL vertex or fragment shaders in `main.js`.

## Context

All shaders are template literal strings inside `main.js`. There are three shader materials:

| Material | Vertex shader line | Fragment shader line | Purpose |
|---|---|---|---|
| Node / fill-point | ~207 | ~280 | 85-node skeletal network |
| Connection web | ~290 | ~330 | Bone curves and torso grid |
| Anadol particles | 341 | 374 | 18,000 flowing particles |

All three share the same set of uniforms defined in `pulseUniformsDef` (line 193).

## The Perlin Noise Function

A `snoise(vec3)` function is defined in the `noiseFn` template string (line ~160). It is injected into vertex shaders via:
```glsl
${noiseFn}
```
This gives all vertex shaders access to `snoise`. Fragment shaders do **not** receive it by default.

## Adding a New Uniform

Follow this exact sequence — skipping any step will break the material:

1. **Add to `pulseUniformsDef`** (line 193):
   ```js
   uMyUniform: { value: 0 },
   ```

2. **Declare in the shader template literal** (inside the `uniform` block at the top of the GLSL):
   ```glsl
   uniform float uMyUniform;
   ```

3. **Push the value in `updateUniforms()`** (line 1178):
   ```js
   // Add to the vals object:
   uMyUniform: someValue,
   ```
   The existing loop `allMeshes().forEach(m => ...)` will propagate it automatically.

## Particle Shader Specifics

- `vPosition` (varying vec3) carries world-space position to the fragment shader
- `vLife` (varying float) is 0→1 over particle lifetime
- `gl_PointSize` must be corrected for depth: `sz * (900.0 / -mv.z)`
- Additive blending is active — colours stack; keep alpha low (final alpha ~0.3 or less)
- The life fade `sin(vLife * PI)` creates a smooth bell curve — use `pow()` to shape it

## Proximity Patterns

To affect only particles near a body keypoint, pass the world position as a `vec3` uniform and use:
```glsl
float influence = smoothstep(farRadius, closeRadius, distance(wp, uTargetPos));
```
Typical radii: `farRadius = 6.0`, `closeRadius = 0.5` (in Three.js world units, ~screen-space).

## Common Pitfalls

- Don't add uniforms only to one material — always add to `pulseUniformsDef` so all three materials receive them
- `vPosition` is world space, `position` is local space — use `wp = (modelMatrix * vec4(position,1.)).xyz` if you need world space in the vertex shader
- After changing shader source strings, Three.js does **not** recompile automatically — you must reload the page
- The bloom pass `UnrealBloomPass` amplifies bright values; keeping base brightness low and using `uRangeOfMotion` to scale glow is the established pattern
