# Wall Text — Residual Motion Showcase

Print-ready text blocks. Left-to-right reading flow across the wall.
Font: Geist or a clean sans-serif. Dark text on light card stock, or light text on dark.

---

## PANEL A — Design Statement (leftmost, printed large)

**Size**: A3 or larger. Title at 36pt, subtitle at 16pt, body at 14pt.
**Position**: Far left of wall, first thing a viewer reads.

---

### PROMPTED BY THE BODY: RESIDUAL MOTION

Gu Yuyang — AY 24/25 Graduation Project

ACL recovery is a long, solitary process. Months of repetitive exercises, alone with a body that doesn't trust itself yet.

Residual Motion explores how the body can provide continuous, unprompted context to AI — without typing a word. Camera-based pose detection and a knee-worn sensor capture biomechanical signals at two scales: posture and micro-tremor. These signals drive a particle visualization that mirrors effort in real time. An AI companion, not a physiotherapist but a quiet presence, reflects on what it observes through voice.

The body is the prompt. Language follows.

*Framed as art and design (somatic experience). Not a medical device.*

---

## PANEL B — Semester 1 → 2 Bridge (left-center)

**Size**: A4. Header at 20pt, body at 12pt.
**Position**: Next to the sem1 video loop and Arduino prototypes on the table.

---

### FROM FIVE MODALITIES TO ONE

Semester 1 tested five ways the body can prompt AI: typing rhythm, breath, heartbeat, facial expression, and full-body movement.

Each experiment used a different sensor and a different visualization. Together they mapped a spectrum from subtle finger rhythms to whole-body spatial expression.

Movement proved richest. It generates continuous spatial data, captures effort and hesitation without self-reporting, and translates naturally into visual form. Semester 2 focuses entirely on movement — applied to ACL knee recovery, where the gap between body and language is widest.

**On the table:** The physical Arduino prototypes from Semester 1 — breath sensor, heartbeat sensor — alongside the knee IMU built for Semester 2.

---

## PANEL C — Technical Diagram (center)

**Size**: A2 landscape, printed from `system-diagram.html`
**Position**: Center of wall. The visual anchor.

*(See `showcase/system-diagram.html` — screenshot at 2x for print)*

---

## PANEL D — Process & AI Workflow (right-center)

**Size**: 4 cards, each ~A5. Header at 14pt bold, quote at 12pt, context at 10pt italic.
**Position**: Arranged vertically or in a 2×2 grid.

*(See `showcase/process-excerpts.md` for the 4 pull-quote cards)*

---

## PANEL E — The Prototype (rightmost, next to running laptop)

**Size**: A4. Header at 20pt, specs at 11pt monospace.
**Position**: Right side, immediately next to the live demo.

---

### RESIDUAL MOTION — ACL RECOVERY PROTOTYPE

**What it does**
A physio exercise web app where the body is the only interface. The user selects an ACL recovery exercise and performs it in front of the camera. The system tracks their movement, visualizes it as a particle body in real time, and an AI companion speaks short reflections at meaningful moments — first rep, milestones, changes in form.

**Sensing — Two Scales**

| | Camera (macro) | Knee IMU (micro) |
|---|---|---|
| Hardware | Webcam | XIAO ESP32S3 + MPU-6050 |
| Data | 17 body keypoints @ 30fps | 6-axis accel + gyro @ 50Hz |
| Transport | Browser → TensorFlow.js MoveNet | WiFi WebSocket (binary) |
| Sees | Whole-body posture, joint angles | Knee tremor, flexion angle |
| Can't see | Micro-instability, rotational shake | Whole-body context |

The camera sees the body from outside. The IMU feels the body from inside. Together they capture what neither can alone.

**Derived Metrics**

- **Knee angle**: Complementary filter fusing gyroscope integration (fast, drifts) with accelerometer pitch (noisy, stable). Calibrated to standing-straight on connection.
- **Tremor**: Standard deviation of accelerometer magnitude over a 1-second sliding window. Maps to a 0–1 bar: green (steady) → red (shaking).
- **Form quality**: Per-exercise scoring (0–1) based on secondary joint alignment during reps. "I notice your weight shifting left" — not "bad form."

**Visualization — 262,144 GPU Particles**

Two independent particle layers share the same body pose but have separate GPU pipelines:

*Layer A — Body Fill*
256-slot sampler interpolates the full body volume: torso grid (6×8 between shoulders and hips), limb cylinders with anatomical widths, head ellipsoid, depth offsets for 3D volume. Particles fill the silhouette.

*Layer B — Skeleton*
17 raw MoveNet keypoints + 8 interpolated points per bone connection. Particles trace the wireframe joints and lines. The raw structure of pose detection made visible.

*Render pipeline (each frame, per layer):*
Curl noise drift → Attraction to body keypoints → Bitonic depth sort (18 passes) → Shadow accumulation from light POV → Sphere-rasterized points with diffuse + specular lighting → Bloom post-processing.

Body activity (velocity + jitter) modulates everything: still body = tight lattice, moving body = turbulent cloud.

**AI Companion**

GPT-4o-mini receives movement context — exercise state, rep count, form quality, velocity, jitter, range of motion, knee angle, tremor — and generates 1–2 sentence reflections. Not coaching. Observation. "I notice the range opening up" or "There's a steadiness in these last few reps."

Speaks through OpenAI TTS (Nova voice, 0.98× speed). Minimum 22 seconds between reflections. Silence is the default. When it speaks, it lands.

**Approach: Citizen Science, Not Clinical**

The biomechanics are design-driven, not medical-grade. Knee angle uses a complementary filter, not motion capture. Tremor is standard deviation, not frequency-domain decomposition. The tool doesn't need to be scientifically rigorous — it needs to make the person more aware of their body.

---

## Layout Notes

```
┌──────────────────────────────────────────────────────────────────────────┐
│  WALL                                                                      │
│                                                                            │
│  [A]           [B]           [C]              [D]           [E]           │
│  Design        Sem1→2       Technical         Process       Prototype     │
│  Statement     Bridge       Diagram           Quotes        Specs         │
│  (large)       (medium)     (A2, visual       (4 cards)     (next to      │
│                             anchor)                          laptop)       │
│                                                                            │
├──────────────────────────────────────────────────────────────────────────┤
│  TABLE                                                                     │
│                                                                            │
│  [Sem1 Arduino   [Sem1 video    [Knee IMU        [Laptop running          │
│   prototypes]     loop iPad]     prototype]        live demo]              │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘
```

Reading flow: A viewer approaches from the left, reads the design statement, sees the physical history on the table (sem1 Arduinos + video), scans the diagram to understand the system, reads process quotes about how it was built, then arrives at the live demo with full context.
