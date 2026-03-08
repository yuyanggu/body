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
- Three.js 0.162.0 — via importmap CDN
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
| `main.js` | Core (~1600 lines) — scene setup, shaders, pose detection, particle system, animation loop, UI logic |
| `styles.css` | Dark theme, frosted glass panels, neon palette system, responsive layout |
| `exercises.js` | 6 ACL recovery exercises — angle tracking, rep counting, form quality (0-1) |
| `ai-companion.js` | Contemplative AI observer — triggers on milestones, speaks 1-2 sentences, min 22s between reflections |
| `voice.js` | OpenAI TTS wrapper — queue management, Nova voice at 0.98x speed |
| `docs/design-statement.md` | Full design statement and project framing |

## Architecture

Single-page app. All state lives in two plain objects:

- **`config`** (line 21) — `paused`, `activePaletteIndex`, `sensitivity`, `appMode`
- **`bodyState`** (line 443 area) — `keypoints[]`, `isTracking`, `presence`, `globalVelocity`, `globalJitter`, `globalRangeOfMotion`

Mode state machine: `select` → `exercise` → back to `select`

Pose detection: MoveNet runs every frame on 640x480 video, outputs 17 keypoints with confidence scores. Smoothed with exponential moving average (SMOOTHING_FACTOR = 0.65). Confidence threshold: 0.3.

## Visualization Layers

Three layers share uniforms via `pulseUniformsDef` (line 193):

1. **Skeletal network** (85 nodes) — 17 primary keypoints + 68 interpolated fill points (bone segments, torso grid, head ring). Custom vertex/fragment shader with Perlin noise displacement.
2. **Connection web** — bones as subdivided curves (40 segments each), torso interior grid with horizontal/vertical/diagonal connections. Animated sine-wave flow.
3. **Anadol particles** (18,000) — tethered to body volume. 92% body-distributed, 8% wisps from extremities. Curl-noise flow field, 5-8s lifespan. Vertex shader at line 341, fragment at line 374.

Post-processing: UnrealBloomPass for glow.

## Shader Uniforms

All three shader materials receive these via `updateUniforms()` (line 1178):

| Uniform | Source | Effect |
|---|---|---|
| `uTime` | clock | Animation driver |
| `uGlobalVelocity` | movement speed (0-1) | Flow speed, particle pulse |
| `uJitter` | movement shakiness (0-1) | Noise displacement intensity |
| `uRangeOfMotion` | movement expansiveness (0-1) | Node glow, particle expansion |
| `uPresence` | tracking confidence fade (0-1) | Overall visibility |

Pulse system: up to 3 simultaneous expanding rings from `triggerPulse()` (line 1199).

## Key Integration Points

Any new feature that needs to hook into the system should connect at these points:

- **`bodyState.keypoints`** — consumed by all modules for pose data
- **`processKeypoints()`** (line ~850) — runs every frame before exercise analysis
- **`updateUniforms()`** (line 1178) — push new metrics to shaders here
- **`triggerPulse(pos, time)`** (line 1199) — trigger visual pulses from positions
- **`animate()`** (line 1538) — main loop; exercise analyzer and AI companion update here (line 1558-1589)
- **`pulseUniformsDef`** (line 193) — add new shader uniforms here; they propagate to all materials
- **`updateAnadolParticles(t, dt)`** — CPU-side particle simulation with flow field

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
- Shaders are template literal strings embedded in `main.js`
- OpenAI API key stored in `localStorage` — user enters via UI prompt
- Three color palettes: Purple Nebula, Sunset Fire, Ocean Aurora
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
