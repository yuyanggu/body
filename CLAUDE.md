# Prompted by the Body: Residual Motion

*Part of the "Prompted by the Body" research series.*

A physio exercise web app that uses the body as an interface for ACL recovery. Camera-based pose detection and biomechanical sensing drive a particle visualization, while an AI companion offers quiet, spoken reflections. The project explores how continuous embodied data — rather than typed text — can ground and enrich AI interaction.

**Framed as art/design (somatic experience). Not a medical device.**

## Design Statement

ACL recovery is a long, solitary process — months of repetitive exercises between physiotherapy appointments, alone with a body that doesn't trust itself yet.

Residual Motion explores how the body can provide continuous, unprompted context to AI — without typing a word. Camera-based pose detection and a knee-worn sensor capture biomechanical signals at two scales — posture and micro-tremor — driving a particle visualization that mirrors effort in real time. An AI companion, not a physiotherapist but a quiet presence, reflects on what it observes through voice. A haptic loop lets users feel the visualization on their skin.

Taking a citizen science approach to biomechanics, the project demonstrates that embodied data makes AI engagement more present and grounded than text.

## Stack

- Next.js 16 (App Router) + React 19 — `"use client"` pages, no SSR for WebGL/camera
- Three.js — via npm, GPU particle system + post-processing
- TensorFlow.js + MoveNet SINGLEPOSE_LIGHTNING — loaded at runtime via CDN ESM imports (not bundled, avoids @mediapipe/pose compatibility issues)
- Zustand — lightweight state management bridging React UI and imperative animation loop
- OpenAI API — Chat Completions (GPT-4o-mini) for AI companion, TTS (tts-1, Nova voice) for speech
- Font: Geist Pixel (local woff2 files in `public/fonts/`)

## Running

```
cd "/Users/yuyang/body tracking test"
npm run dev
```
- **Main app:** `http://localhost:3000` — full experience with exercises and AI companion
- **Testing page:** `http://localhost:3000/testing` — dual-layer shader tuning with real-time control panels, FPS counter, no exercises
- **Test mode:** Add `?test` to either URL for a synthetic animated body without a webcam

## Files

### App Layer (Next.js / React)

| File | Purpose |
|---|---|
| `app/layout.js` | Root layout — html/body, global CSS import |
| `app/page.js` | Main page — `"use client"`, wires SceneCanvas + all UI components |
| `app/testing/page.js` | Testing page — SceneCanvas + status panel + dual shader control panels, no exercises |
| `app/globals.css` | Dark theme, frosted glass panels, toggle switches, responsive layout |

### Components

| File | Purpose |
|---|---|
| `components/SceneCanvas.jsx` | Three.js scene, animation loop, dual GPU particle pipelines (Layer A + B) — renders one `<canvas>`, never re-renders |
| `components/ExerciseOverlay.jsx` | Exercise card grid + selection |
| `components/ExerciseHUD.jsx` | Reps, angle, form cue, AI text, voice indicator |
| `components/SensorHUD.jsx` | Unified bottom-left HUD — body metrics (Motion/Range/Energy) + IMU sensor data (raw accel/gyro, knee angle gauge, tremor bar, rolling graph). Expands when IMU connected. |
| `components/WebcamPreview.jsx` | Video element + tracking status dot |
| `components/ControlButtons.jsx` | Freeze, reset, end session |
| `components/TestModePanel.jsx` | Toggle switches for test mode, keypoints, data overlay |
| `components/ApiKeyModal.jsx` | API key entry modal |
| `components/LoadingOverlay.jsx` | Loading state with progress bar |
| `components/TestingStatusPanel.jsx` | FPS, particle count, camera/tracking status (testing page only) |
| `components/ShaderControlPanel.jsx` | Real-time slider panel for GPU uniforms — accepts `layer`, `title`, `showSceneControls`, `showParticleCount` props |

### Stores (Zustand)

| File | Purpose |
|---|---|
| `stores/useAppStore.js` | Config state: paused, appMode, testMode, showKeypoints, loading |
| `stores/useBodyStore.js` | Body metrics: isTracking, velocity, range, jitter (updated ~5Hz from animation loop) |
| `stores/useIMUStore.js` | IMU sensor state: connected, accel/gyro XYZ, tremor, kneeAngle (updated ~5Hz from animation loop) |
| `stores/useExerciseStore.js` | Exercise state: name, reps, angle, formCue, aiText, isSpeaking |

### Core Modules (`lib/`)

Imperative core — these run inside refs/useEffect, not React state. Unchanged from the original codebase except for minor SSR guards.

| File | Purpose |
|---|---|
| `lib/config.js` | Shared constants and mutable `config` state object |
| `lib/shaders.js` | All GLSL shaders — simplex noise, curl noise, particle position/render/sort/opacity |
| `lib/particle-system.js` | `ParticleSystem(renderer, id, particleSize)`, `ParticleSort`, `OpacityPass` GPU classes — supports configurable grid size and `dispose()` for runtime rebuild |
| `lib/keypoint-sampler.js` | `KeypointSampler` (256-slot body fill → GPU texture), `RawKeypointSampler` (17 keypoints + skeleton bones only), debug skeleton overlay |
| `lib/pose-detection.js` | Camera setup, MoveNet detection, `processKeypoints()`, movement analysis |
| `lib/test-mode.js` | Synthetic animated standing pose for development |
| `lib/exercises.js` | 6 ACL recovery exercises — angle tracking, rep counting, form quality (0-1) |
| `lib/ai-companion.js` | Contemplative AI observer — triggers on milestones, speaks 1-2 sentences |
| `lib/voice.js` | OpenAI TTS wrapper — queue management, Nova voice at 0.98x speed |
| `lib/data-overlay.js` | 2D canvas overlay showing live body tracking telemetry |
| `lib/imu-sensor.js` | WebSocket connection to knee IMU sensor — auto-reconnect (500ms, 100 attempts), complementary filter for knee angle, tremor from accel stddev |
| `lib/imu-sensor-ble.js` | **BLE backup** — copy over `imu-sensor.js` to revert to BLE transport |

### Hardware

| File | Purpose |
|---|---|
| `arduino/knee_imu_wifi/knee_imu_wifi.ino` | **Active** — XIAO ESP32S3 + MPU-6050, reads IMU at 50Hz, streams over WiFi WebSocket (port 81) |
| `arduino/knee_imu_ble/knee_imu_ble.ino` | **BLE backup** — same IMU at 50Hz, streams over BLE notifications |
| `arduino/mpu6050_test/mpu6050_test.ino` | I2C pin finder — scans all GPIO combos to locate MPU-6050 |

## Hardware: Knee IMU (XIAO ESP32S3 + MPU-6050)

A knee-worn inertial sensor streams accelerometer + gyroscope data over WiFi WebSocket to the web app. (BLE version preserved as backup.)

### Board & Wiring

- **MCU**: Seeed XIAO ESP32S3
- **IMU**: MPU-6050 (or compatible clone, WHO_AM_I may report 0x72)
- **Connection**: 4 dupont wires (female-to-female)

| MPU-6050 | XIAO ESP32S3 |
|---|---|
| VCC | 3V3 (NOT VUSB/5V) |
| GND | GND |
| SDA | D4 (GPIO5) |
| SCL | D5 (GPIO6) |

**Pin mapping note**: XIAO ESP32S3 pin labels vs GPIO numbers — D4=GPIO5, D5=GPIO6 (not GPIO6/GPIO7 as some docs suggest). Confirmed via I2C scan.

### Sketch: `knee_imu_wifi.ino` (Active)

- Raw I2C registers — no Adafruit library (avoids `Wire.begin()` pin conflicts)
- Reads accel/gyro at 50Hz, streams 12-byte binary packets over WebSocket (port 81)
- WiFi credentials hardcoded at top of file — update 2 lines when switching networks
- Prints IP address to Serial Monitor on connect — enter this IP in the browser prompt
- Sensor config: ±8G accel, ±500 dps gyro, 21Hz DLPF bandwidth
- Auto-reconnects WiFi if dropped
- Requires `WebSockets` library by Markus Sattler (install via Arduino Library Manager)
- Upload: hold BOOT button while plugging USB if port not detected

### Sketch: `knee_imu_ble.ino` (BLE Backup)

- Same IMU reading code, streams over BLE notifications instead
- BLE service UUID: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- BLE connection params: 22.5-45ms interval — antenna note: holding board causes drops
- **To revert to BLE**: flash this sketch and copy `lib/imu-sensor-ble.js` → `lib/imu-sensor.js`

### Sketch: `mpu6050_test.ino`

Diagnostic tool — tries all GPIO pin combinations to find the MPU-6050 on I2C. Use this first if the IMU isn't responding.

## Architecture

Two-layer architecture: **React shell** (UI components + Zustand state) wrapping an **imperative core** (Three.js scene, GPU particles, TensorFlow pose detection).

### State

- **`config`** (`lib/config.js`) — mutable singleton: `paused`, `activePaletteIndex`, `sensitivity`, `appMode`, `testMode`, `showKeypoints`. The animation loop reads this directly; Zustand `useAppStore` syncs UI changes into it.
- **`bodyState`** (`lib/pose-detection.js`) — mutable singleton: `keypoints[]`, `isTracking`, `presence`, `globalVelocity`, `globalJitter`, `globalRangeOfMotion`. Updated every frame by the animation loop. `useBodyStore` mirrors it at ~5Hz for React UI.
- **`imuState`** (`lib/imu-sensor.js`) — mutable singleton: `connected`, `connecting`, `accel{x,y,z}`, `gyro{x,y,z}`, `tremor`, `kneeAngle`. Updated at 50Hz by WebSocket. `useIMUStore` mirrors it at ~5Hz for React UI.
- **Zustand stores** — `useAppStore`, `useBodyStore`, `useIMUStore`, `useExerciseStore` drive React re-renders. The animation loop updates them via `getState()` (no re-render overhead).

### Data Flow

The `SceneCanvas` component mounts once and starts a `requestAnimationFrame` loop. It reads from `config` and `bodyState` directly (mutable objects), pushes exercise/body metrics into Zustand stores at throttled intervals, and React components subscribe to those stores for UI updates.

Mode state machine: `select` → `exercise` → back to `select`

Pose detection: MoveNet runs every frame on 640x480 video, outputs 17 keypoints with confidence scores. Smoothed with exponential moving average (SMOOTHING_FACTOR = 0.65). Confidence threshold: 0.3.

## GPU Particle System — Dual Layer Architecture

Two independent `ParticleSystem` instances (Layer A and Layer B) run in the same scene, both driven by the same body pose but with separate GPU pipelines, separate uniforms, and separate keypoint samplers.

### Layer A — Body Fill

Uses `KeypointSampler` (256-slot interpolated body surface). Particles fill the full body silhouette including torso volume, limb width, and depth offsets.

### Layer B — Skeleton Only

Uses `RawKeypointSampler` (17 raw MoveNet keypoints + 8 interpolated points per skeleton bone). Particles trace the skeleton wireframe: joints and the lines connecting them. No torso fill, no depth offsets. Layer B also supports runtime particle count changes via `dispose()` and rebuild.

### Pipeline (each frame, runs twice — once per layer)

1. **Sampler `.update(bodyState)`** — packs body points into 16x16 DataTextures (position + velocity)
2. **Position compute shader** (`positionShaderFrag`) — curl noise drift, attraction to keypoint targets, `bodyActivity` modulation, lattice alignment
3. **`ParticleSort`** — GPU bitonic depth sort (18 passes/frame) for back-to-front alpha ordering
4. **`OpacityPass`** — 1024x1024 shadow accumulation from light POV for self-shadowing
5. **Particle render** — sphere-rasterized points with diffuse + specular + shadow

### KeypointSampler — Body Fill (Layer A, 256 slots, 16x16 texture)

| Slots | Content |
|---|---|
| 0-7 | Head (nose, eyes, ears, interpolated fill, top of head) |
| 8-9 | Neck (nose to shoulder midpoint) |
| 10-57 | Torso grid (6x8 between shoulders and hips) |
| 58-81 | Arms (6 points per segment: upper arm + forearm, both sides) |
| 82-113 | Legs (8 points per segment: thigh + shin, both sides) |
| 114-125 | Torso depth (3x4 grid offset in Z for volume) |
| 126-141 | Limb width (perpendicular offset at each limb midpoint) |
| 142-157 | Extra limb interpolation (quarter + three-quarter points) |
| 158-255 | Filled with duplicates of valid body points |

### RawKeypointSampler — Skeleton Only (Layer B, 256 slots, 16x16 texture)

| Slots | Content |
|---|---|
| 0-16 | 17 raw MoveNet keypoints |
| 17-144 | 8 interpolated points along each of the 16 skeleton bones (128 total) |
| 145-255 | Filled by cycling through valid skeleton points |

### Position Shader Uniforms (per-layer, tuned defaults)

| Uniform | Default | Purpose |
|---|---|---|
| `speed` | 1.7 | Base particle drift speed |
| `dieSpeed` | 0.01 | Particle life decay per frame |
| `curlSize` | 0.1 | Curl noise frequency |
| `attraction` | 2.9 | Keypoint pull strength |
| `radius` | 308 | Spawn radius |
| `wind` | (0.9, 0, -1) | Static drift vector |
| `bodyActivity` | 0.0 | 0=still, 1=moving (overridden to 0.3 by default via UI) |
| `gridSpacing` | 1.3 | Lattice alignment spacing (uniform, not hardcoded) |

### Body Activity Modulation

`bodyActivity` = `globalVelocity + globalJitter * 0.5` (clamped 0-1), smoothed with exponential lerp. Can be overridden per-layer via the shader control panel.

- **Curl noise**: 20% when still, 100% when moving
- **Wind**: 10% when still, 100% when moving
- **Attraction**: 1.5x when still, 1x when moving (gentle tightening)

### Rendering

- `pointSize`: 100 (perspective-correct, per-particle random 0.1-0.7x)
- Palette: velocity-driven 5-stop color ramp (teal, blue, purple, magenta, hot amber) in fragment shader
- Lighting: Lambertian diffuse + Blinn-Phong specular (shininess 32)
- Self-shadowing: `exp(-opacity * shadowDensity)`, shadowDensity default 3.5
- Post-processing: UnrealBloomPass (strength 0.54, radius 0.08, threshold 0.32)
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

- **`bodyState.keypoints`** (`lib/pose-detection.js`) — consumed by all modules for pose data
- **`processKeypoints()`** (`lib/pose-detection.js`) — runs every frame, smooths keypoints, computes metrics
- **`keypointSamplerA.update(bodyState)`** / **`keypointSamplerB.update(bodyState)`** (`lib/keypoint-sampler.js`) — pushes body data to GPU DataTextures (body fill vs skeleton only)
- **`particleSystemA.update(...)` / `particleSystemB.update(...)`** (`lib/particle-system.js`) — drives GPU pipelines independently
- **`animate()`** (`components/SceneCanvas.jsx`) — main loop inside `useEffect`; exercise analyzer and AI companion update here
- **`positionShaderFrag`** (`lib/shaders.js`) — GLSL compute shader; edit to change particle physics (shared by both layers)
- **`imuState`** (`lib/imu-sensor.js`) — consumed by `SensorHUD` (via `useIMUStore`) and `SceneCanvas` (directly) for particle modulation and AI companion context
- **Zustand stores** (`stores/`) — connect new UI components by subscribing to `useAppStore`, `useBodyStore`, `useIMUStore`, or `useExerciseStore`

## Shader Parameter Events

Real-time parameter changes are dispatched as CustomEvents on `window`. `SceneCanvas` listens and applies values directly to GPU uniforms. No React re-renders involved.

| Event | Target | Used by |
|---|---|---|
| `shader-param-a` | Layer A particle system uniforms | ShaderControlPanel layer="a" |
| `shader-param-b` | Layer B particle system uniforms + particle count rebuild | ShaderControlPanel layer="b" |
| `shader-param-scene` | Shared bloom pass, light position, orbit controls | ShaderControlPanel with `showSceneControls` |
| `reset-camera` | OrbitControls.reset() | ControlButtons |

Per-layer controls: speed, dieSpeed, curlSize, attraction, radius, pointSize, windX/Y/Z, shadowDensity, bodyActivity, gridSpacing, sortEnabled, shadowEnabled, particleCount (Layer B only).

Scene-level controls: lightX/Y/Z, bloomStrength/Radius/Threshold, bloomEnabled, autoRotate.

The `ShaderControlPanel` component has a copy button that diffs current values against defaults and copies a structured summary to clipboard. This output can be pasted directly into chat for Claude to apply as code changes.

## UI

- Test mode toggle panel (top-right): Synthetic Body on/off, Show Keypoints on/off
- Shader control panels (testing page, right side): Layer A (purple accent) and Layer B (blue accent), each with independent sliders for all particle/shader params. Layer B includes a GPU grid size slider for particle count.
- Webcam preview (bottom-left): live camera feed with tracking status dot
- Sensor HUD (bottom-left): Motion/Range/Energy bars + IMU section (knee angle gauge, tremor bar, raw accel/gyro, rolling angle graph) — IMU section appears only when sensor connected
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

- Next.js App Router with `"use client"` pages — no SSR for any page (WebGL, camera, TensorFlow are client-only)
- No TypeScript — pure JS/JSX. Can be added later as a separate effort.
- Core modules in `lib/` are plain ES modules (no React). They run inside `useEffect`/refs and must not import React.
- React components in `components/` use Zustand stores for state. No prop-drilling for shared state.
- TensorFlow.js loaded at runtime via CDN ESM imports (not bundled via npm) to avoid @mediapipe/pose bundler incompatibility
- All GLSL shaders are template literal strings in `lib/shaders.js`
- `#include` directives resolved by string concatenation (e.g. `curl4GLSL = simplexNoise4GLSL + curlGLSL`)
- OpenAI API key stored in `localStorage` — user enters via UI prompt
- Particle palette is baked into the fragment shader (velocity-driven color ramp)
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
