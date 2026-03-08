# Skill: Visualization Tuning

Use this skill when adjusting particle behaviour, visual responsiveness to movement, bloom intensity, colour palettes, or the mapping between body metrics and visual output.

## Key Parameters and Locations

### Movement Smoothing (main.js)
```js
const SMOOTHING_FACTOR = 0.65;  // line ~30
// Higher = smoother but laggier. Lower = more reactive but jittery.
// Applied per-keypoint via exponential moving average every frame.

const CONFIDENCE_THRESHOLD = 0.3;  // line ~30
// Keypoints below this score are ignored. Higher = stricter, fewer false positives.
```

### Particle System (main.js)
```js
// Total particle count — change requires page reload
const ANADOL_COUNT = 18000;  // line ~490

// Lifespan range (seconds)
const PARTICLE_LIFE_MIN = 5;   // line ~750
const PARTICLE_LIFE_MAX = 8;

// Body vs wisp split
// 92% spawned across body regions (torso, limbs, head)
// 8% wisps — loosely tethered to high-velocity extremities (wrists, ankles, head)
```

### Distribution Weights (main.js, anadol spawning section ~line 710)
Particle spawn weights per body region. Increasing a weight means more particles cluster there:
- Head ellipsoid
- Torso Gaussian volume (denser at centre)
- Bone cylinders (16 skeleton bones)
- Wisp emitters (wrists, ankles, nose)

### Movement → Visual Mapping

All visual responsiveness flows through four uniforms. Adjust the multipliers in `updateUniforms()` (line 1178) and the shader code:

| Metric | Shader effect | Tune here |
|---|---|---|
| `uGlobalVelocity` | Particle flow speed, shimmer | Multiplier in `updateAnadolParticles()` flow field |
| `uJitter` | Node displacement via snoise | Noise amplitude in node vertex shader |
| `uRangeOfMotion` | Glow intensity, particle size | `sz * (1.0 + uRangeOfMotion * 0.3)` in anadol vertex |
| `uPresence` | Overall fade in/out | Multiplied into final alpha everywhere |

### Bloom (main.js, inside `updateUniforms()`)
```js
bloomPass.strength = 0.6 + bodyState.globalRangeOfMotion * 0.5;
// Range: 0.6 (still) to 1.1 (full range of motion)
// bloomPass.threshold and bloomPass.radius set at init (~line 530)
```

### Colour Palettes
Three palettes are cycled via the theme button. Defined as arrays of Three.js `Color` objects (line ~60 area). Each palette affects:
- Node colours (per keypoint)
- Connection web colour
- Particle base colour (per body region)
- Pulse ring colours

## Tuning the AI Companion Trigger Rate

In `ai-companion.js`:
```js
const AMBIENT_CHANCE = 0.006;  // ~line 50 — probability per frame (~0.6% ≈ every 40s at 60fps)
const MIN_SILENCE = 22000;     // ms between any two reflections
```

## Visual Design Principles for This Project

- **Low base brightness** — let bloom do the heavy lifting, avoid blown-out whites
- **Additive blending** — particles stack; density creates brightness naturally
- **Movement as breath** — velocity/range uniforms should feel like the visualization is breathing with the user, not reacting sharply
- **Knee region** — any future IMU data should affect particles locally (use proximity patterns from `shader-edit` skill), not globally
- **Silence is part of the design** — particles continuing to flow during stillness is intentional; the system never fully stops
