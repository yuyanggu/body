# Prompted by the Body: Residual Motion

*Part of the "Prompted by the Body" MA research series.*

A physio exercise web app that uses the body as an interface for ACL recovery. Camera-based pose detection and biomechanical sensing drive a particle visualization, while an AI companion offers quiet, spoken reflections. The project explores how continuous embodied data — rather than typed text — can ground and enrich AI interaction.

**Framed as art/design (somatic experience). Not a medical device.**

## Design Statement

ACL recovery is a long, solitary process — months of repetitive exercises between physiotherapy appointments, alone with a body that doesn't trust itself yet.

Residual Motion explores how the body can provide continuous, unprompted context to AI — without typing a word. Camera-based pose detection and a knee-worn sensor capture biomechanical signals at two scales — posture and micro-tremor — driving a particle visualization that mirrors effort in real time. An AI companion, not a physiotherapist but a quiet presence, reflects on what it observes through voice. A haptic loop lets users feel the visualization on their skin.

Taking a citizen science approach to biomechanics, the project demonstrates that embodied data makes AI engagement more present and grounded than text.

## Research Context

This prototype is the culmination of the "Prompted by the Body" thesis, which investigates how embodied interactions (breath, heart rate, movement) can make reflective AI engagement more accessible and grounded than disembodied text interfaces. Residual Motion applies this to ACL rehabilitation — one of the longest, most isolating recovery journeys — using biomechanical data as the primary input channel to AI.

The AI companion is a **presence, not a physiotherapist**. It doesn't correct, prescribe, or diagnose. It observes movement qualities — effort, steadiness, rhythm — and reflects them back in plain language, using data the body provides continuously rather than waiting to be prompted.

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
Open `http://localhost:8080` in Chrome. Grant camera access when prompted.

## Files

| File | Purpose |
|---|---|
| `index.html` | Single page — video element, Three.js canvas, exercise selection overlay, HUD panels, control buttons |
| `main.js` | Core (~900 lines) — GPU particle system, keypoint sampler, pose detection, animation loop, UI logic |
| `styles.css` | Dark theme, frosted glass panels, neon palette system, responsive layout |
| `exercises.js` | 6 ACL recovery exercises — angle tracking, rep counting, form quality (0-1) |
| `ai-companion.js` | Contemplative AI observer — triggers on milestones, speaks 1-2 sentences, min 22s between reflections |
| `voice.js` | OpenAI TTS wrapper — queue management, Nova voice at 0.98x speed |
| `docs/design-statement.md` | Full design statement and project framing |

## Architecture

Single-page app. All state lives in two plain objects:

- **`config`** (line 21) — `paused`, `activePaletteIndex`, `sensitivity`, `appMode`, `testMode`
- **`bodyState`** — `keypoints[]`, `isTracking`, `presence`, `globalVelocity`, `globalJitter`, `globalRangeOfMotion`

Mode state machine: `select` → `exercise` → back to `select`

Pose detection: MoveNet runs every frame on 640x480 video, outputs 17 keypoints with confidence scores. Smoothed with exponential moving average (SMOOTHING_FACTOR = 0.65). Confidence threshold: 0.3.

**Test mode:** Add `?test` to the URL to use a synthetic animated standing pose instead of the camera — useful for development without a webcam.

## Visualization

Single GPU particle swarm — 65,536 particles (256×256 GPUComputationRenderer) driven by body keypoints:

- **`ParticleSystem`** — GPUComputationRenderer position compute, curl noise drift, attraction to keypoint targets, particle lifecycle
- **`ParticleSort`** — GPU bitonic depth sort (6 passes/frame) for correct back-to-front alpha ordering
- **`OpacityPass`** — 1024×1024 shadow accumulation rendered from light POV (half-angle slicing) for self-shadowing
- **`KeypointSampler`** — 8×8 DataTexture (64 slots) feeding 17 keypoints + 16 bone midpoints + 16 torso grid points to the GPU

Palette: magenta / purple / blue (hardcoded in fragment shader). Post-processing: UnrealBloomPass (strength 0.4, radius 0.2, threshold 0.3).

Camera: FOV 50, z=300. Light: PointLight at (0, -200, 3000).

## Key Integration Points

Any new feature that needs to hook into the system should connect at these points:

- **`bodyState.keypoints`** — consumed by all modules for pose data
- **`processKeypoints()`** — runs every frame, smooths keypoints, updates `position3D`, computes velocity/jitter/range
- **`keypointSampler.update(bodyState)`** — call to push new keypoint positions to the GPU DataTexture
- **`particleSystem.update(dt, t, keypointSampler, camera, lightPosition)`** — drives the full GPU pipeline each frame
- **`animate()`** — main loop; exercise analyzer and AI companion update here
- **`positionShaderFrag`** — GLSL compute shader; edit here to change particle physics/attraction behaviour

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
- All GLSL shaders are template literal strings embedded in `main.js` (no external `.glsl` files)
- `#include` directives resolved by string concatenation (e.g. `curl4GLSL = simplexNoise4GLSL + curlGLSL`)
- OpenAI API key stored in `localStorage` — user enters via UI prompt
- Particle palette is baked into the fragment shader (magenta/purple/blue); theme buttons affect starfield only
- UI uses frosted glass aesthetic (backdrop-filter blur)

## Available Skills

Project-specific skills live in `.claude/skills/` and are loaded automatically. Use them by describing the task — Claude will apply the relevant skill context.

| Skill | Use when... |
|---|---|
| `shader-edit` | Adding or modifying GLSL shaders in `main.js` |
| `visualization-tune` | Adjusting particle behaviour, movement response, or bloom |
| `algorithmic-art` (global) | Rapid prototyping of new visual ideas in p5.js before porting to Three.js |
| `frontend-design` (global) | Redesigning or building UI panels, overlays, or layout |
| `feature-dev` (global) | Structured feature development with full codebase exploration first |
| `simplify` (global) | Reviewing and tidying code after a feature is built |
