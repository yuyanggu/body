# Prompted by the Body: Residual Motion

*Part of the "Prompted by the Body" MA research series.*

A physio exercise web app that uses the body as an interface for ACL recovery. Camera-based pose detection and biomechanical sensing drive a particle visualization, while an AI companion offers quiet, spoken reflections. The project explores how continuous embodied data — rather than typed text — can ground and enrich AI interaction.

**Framed as art/design (somatic experience). Not a medical device.**

## Design Statement

ACL recovery is a long, solitary process — months of repetitive exercises between physiotherapy appointments, alone with a body that doesn't trust itself yet.

Residual Motion explores how the body can provide continuous, unprompted context to AI — without typing a word. Camera-based pose detection and a knee-worn sensor capture biomechanical signals at two scales — posture and micro-tremor — driving a particle visualization that mirrors effort in real time. An AI companion, not a physiotherapist but a quiet presence, reflects on what it observes through voice. A haptic loop lets users feel the visualization on their skin.

Taking a citizen science approach to biomechanics, the project demonstrates that embodied data makes AI engagement more present and grounded than text.

## Stack

- Vanilla JS (ES modules), no build tools, no TypeScript, no framework
- Three.js 0.182.0 — via importmap CDN
- TensorFlow.js + MoveNet SINGLEPOSE_LIGHTNING — via CDN script tags
- OpenAI API — Chat Completions (GPT-4o-mini) for AI companion, TTS (tts-1, Nova voice) for speech
- Font: Outfit (Google Fonts)

## Running

Requires a local HTTP server for ES module imports:
```
cd "/Users/yuyang/body tracking test"
python3 -m http.server 8080
```
- **Main app:** `http://localhost:8080` — full experience with exercises and AI companion
- **Testing page:** `http://localhost:8080/testing/` — shader + camera only, no exercises, includes FPS counter and status panel
- **Test mode:** Add `?test` to either URL for a synthetic animated body without a webcam

## Files

| File | Purpose |
|---|---|
| `index.html` | Main page — video, canvas, exercise overlay, HUD, test mode toggles |
| `main.js` | Orchestrator (~200 lines) — scene setup, starfield, animation loop, init |
| `config.js` | Shared constants and `config` state object |
| `shaders.js` | All GLSL shaders — simplex noise, curl noise, particle position/render/sort/opacity |
| `particle-system.js` | `ParticleSystem`, `ParticleSort`, `OpacityPass` GPU classes |
| `keypoint-sampler.js` | `KeypointSampler` (body → GPU texture), debug skeleton overlay |
| `pose-detection.js` | Camera setup, MoveNet detection, `processKeypoints()`, movement analysis |
| `test-mode.js` | Synthetic animated standing pose for development |
| `ui.js` | Exercise grid, HUD, API key modal, control button listeners |
| `exercises.js` | 6 ACL recovery exercises — angle tracking, rep counting, form quality (0-1) |
| `ai-companion.js` | Contemplative AI observer — triggers on milestones, speaks 1-2 sentences |
| `voice.js` | OpenAI TTS wrapper — queue management, Nova voice at 0.98x speed |
| `styles.css` | Dark theme, frosted glass panels, toggle switches, responsive layout |
| `testing/index.html` | Testing page — minimal UI, status panel with FPS |
| `testing/main.js` | Testing page orchestrator — reuses all shared modules |

## Architecture

Modular ES module app. State lives in two objects:

- **`config`** (`config.js`) — `paused`, `activePaletteIndex`, `sensitivity`, `appMode`, `testMode`, `showKeypoints`
- **`bodyState`** (`pose-detection.js`) — `keypoints[]`, `isTracking`, `presence`, `globalVelocity`, `globalJitter`, `globalRangeOfMotion`

Mode state machine: `select` → `exercise` → back to `select`

Pose detection: MoveNet runs every frame on 640x480 video, outputs 17 keypoints with confidence scores. Smoothed with exponential moving average (SMOOTHING_FACTOR = 0.65). Confidence threshold: 0.3.

## GPU Particle System

262,144 particles (512×512 `GPUComputationRenderer`) driven by 256 body sample points.

### Pipeline (each frame)

1. **`KeypointSampler.update(bodyState)`** — packs 256 body points into 16×16 DataTextures (position + velocity)
2. **Position compute shader** (`positionShaderFrag`) — curl noise drift, attraction to keypoint targets, `bodyActivity` modulation
3. **`ParticleSort`** — GPU bitonic depth sort (18 passes/frame) for back-to-front alpha ordering
4. **`OpacityPass`** — 1024×1024 shadow accumulation from light POV for self-shadowing
5. **Particle render** — sphere-rasterized points with diffuse + specular + shadow

### KeypointSampler (256 slots, 16×16 texture)

| Slots | Content |
|---|---|
| 0–7 | Head (nose, eyes, ears, interpolated fill, top of head) |
| 8–9 | Neck (nose → shoulder midpoint) |
| 10–57 | Torso grid (6×8 between shoulders and hips) |
| 58–81 | Arms (6 points per segment: upper arm + forearm, both sides) |
| 82–113 | Legs (8 points per segment: thigh + shin, both sides) |
| 114–125 | Torso depth (3×4 grid offset in Z for volume) |
| 126–141 | Limb width (perpendicular offset at each limb midpoint) |
| 142–157 | Extra limb interpolation (quarter + three-quarter points) |
| 158–255 | Filled with duplicates of valid body points |

### Position Shader Uniforms

| Uniform | Default | Purpose |
|---|---|---|
| `speed` | 2.0 | Base particle drift speed |
| `dieSpeed` | 0.01 | Particle life decay per frame |
| `curlSize` | 0.0175 | Curl noise frequency |
| `attraction` | 3.5 | Keypoint pull strength |
| `wind` | (-4, 0, -1) | Static drift vector |
| `bodyActivity` | 0.0 | 0=still, 1=moving — modulates curl, wind, attraction |

### Body Activity Modulation

`bodyActivity` = `globalVelocity + globalJitter * 0.5` (clamped 0–1), smoothed with exponential lerp.

- **Curl noise**: 15% when still → 100% when moving
- **Wind**: 10% when still → 100% when moving
- **Attraction**: 1.5× when still → 1× when moving (gentle tightening)

### Rendering

- `pointSize`: 10000 (perspective-correct, per-particle random 0.1–0.7×)
- Palette: magenta/purple/blue (hardcoded in fragment shader, 4 colors indexed by UV hash)
- Lighting: Lambertian diffuse + Blinn-Phong specular (shininess 32)
- Self-shadowing: `exp(-opacity * shadowDensity)` from OpacityPass accumulation
- Post-processing: UnrealBloomPass (strength 0.4, radius 0.2, threshold 0.3)
- Camera: FOV 50, z=300. Light: (0, -200, 3000)

### Key Constants (`config.js`)

```
PARTICLE_SIZE = 512        // 512×512 = 262,144 particles
SAMPLE_SIZE = 16           // 16×16 = 256 keypoint sample slots
SORT_PASSES_PER_FRAME = 18 // Bitonic sort steps per frame
OPACITY_MAP_SIZE = 1024    // Shadow accumulation texture
ORTHO_SIZE = 500           // Light camera frustum
BODY_SCALE = 8.0           // Keypoint → swarm space mapping
WORLD_SCALE_X = 15         // 3D mapping X scale
WORLD_SCALE_Y = 12         // 3D mapping Y scale
```

## Key Integration Points

Any new feature that needs to hook into the system should connect at these points:

- **`bodyState.keypoints`** (`pose-detection.js`) — consumed by all modules for pose data
- **`processKeypoints()`** (`pose-detection.js`) — runs every frame, smooths keypoints, computes metrics
- **`keypointSampler.update(bodyState)`** (`keypoint-sampler.js`) — pushes body data to GPU DataTexture
- **`particleSystem.update(dt, t, keypointSampler, camera, lightPosition, activity)`** (`particle-system.js`) — drives GPU pipeline
- **`animate()`** (`main.js`) — main loop; exercise analyzer and AI companion update here
- **`positionShaderFrag`** (`shaders.js`) — GLSL compute shader; edit to change particle physics

## UI

- Test mode toggle panel (top-right): Synthetic Body on/off, Show Keypoints on/off
- Webcam preview (bottom-left): live camera feed with tracking status dot
- Movement metrics (bottom-center): Motion, Range, Energy bars
- Control buttons (bottom-right): Freeze, Skeleton, Reset, End Session
- Exercise overlay: card grid for 6 ACL exercises
- Frosted glass aesthetic (backdrop-filter blur) throughout

## AI Companion

Quiet, contemplative presence. Not a coach or physiotherapist — an observer that notices movement qualities and reflects them back. Speaks only at meaningful moments:

- First rep, every 5th rep milestone, new range of motion, form quality drops below 50%
- Occasional ambient observations (~40s intervals, 0.6% chance per frame)
- System prompt: short, plain language, don't narrate everything, don't perform warmth
- Context sent to GPT-4o-mini includes exercise state + movement metrics (velocity, jitter, range)
- Rate limited: min 22s between reflections

The key design principle: the body provides continuous context to the AI without the user having to describe their state in text. The AI's reflections are grounded in real biomechanical signals, not self-reported mood.

## MoveNet Keypoint Indices

```
0: nose, 1: left_eye, 2: right_eye, 3: left_ear, 4: right_ear
5: left_shoulder, 6: right_shoulder, 7: left_elbow, 8: right_elbow
9: left_wrist, 10: right_wrist, 11: left_hip, 12: right_hip
13: left_knee, 14: right_knee, 15: left_ankle, 16: right_ankle
```

## Code Conventions

- No build step — import from CDN via importmap, local files via relative ES module imports
- No TypeScript, no JSX, no framework
- All GLSL shaders are template literal strings in `shaders.js`
- `#include` directives resolved by string concatenation (e.g. `curl4GLSL = simplexNoise4GLSL + curlGLSL`)
- OpenAI API key stored in `localStorage` — user enters via UI prompt
- Particle palette is baked into the fragment shader (magenta/purple/blue)
- UI uses frosted glass aesthetic (backdrop-filter blur)

## Available Skills

Project-specific skills live in `.claude/skills/` and are loaded automatically. Use them by describing the task — Claude will apply the relevant skill context.

| Skill | Use when... |
|---|---|
| `shader-edit` | Adding or modifying GLSL shaders in `shaders.js` |
| `visualization-tune` | Adjusting particle behaviour, movement response, or bloom |
| `algorithmic-art` (global) | Rapid prototyping of new visual ideas in p5.js before porting to Three.js |
| `frontend-design` (global) | Redesigning or building UI panels, overlays, or layout |
| `feature-dev` (global) | Structured feature development with full codebase exploration first |
| `simplify` (global) | Reviewing and tidying code after a feature is built |
