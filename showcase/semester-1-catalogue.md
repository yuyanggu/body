# Prompted by the Body — Semester 1: Catalogue of Making

**AY 24/25 | Gu Yuyang**

Source: [yy-catalouge-of-making.netlify.app](https://yy-catalouge-of-making.netlify.app/)

---

## Core Question

What happens when our bodies, rather than our keyboards, lead the conversation with AI?

Current LLM chat interfaces reduce human expression to typed text and systematically discard the rich somatic information present in how we think, feel, and communicate. Through 5 experiments — beginning with an analysis of typing patterns to establish embodied baselines in text input, then exploring breath, heart rate, mood, and movement as direct body-based modalities — the project investigates how embodied interactions can make reflective AI engagement more accessible and grounded.

Semester 1 focused on developing visual and interaction aesthetics for each bodily input modality and exploring how different technologies can shape the felt experience of embodied AI interaction.

---

## Experiment 1: Type Trace

- **Tech**: p5.js
- **Input**: Keyboard (typing patterns)
- **Concept**: Before designing direct body-based inputs, this experiment examines whether existing text input already carries embodied information. The prototype tracks micro-rhythms of writing — keystroke timing, hesitation patterns, revision rhythms, and pause durations.

**Two-Phase Design:**
- Phase 1: Poem transcription — enforces accuracy, advancing only when correct
- Phase 2: Freestyle writing — pauses lengthen as participants "think about their day"

**Findings**: Testing with six participants revealed that typing speed, hesitation, and revision patterns vary based on cognitive state and emotional engagement. These micro-rhythms proved to be readable signals for embodied analysis.

---

## Experiment 2: Breath Ring

- **Tech**: Arduino, THREE.js
- **Input**: Breath via Arduino sound sensor
- **Concept**: Captures breath intensity using an Arduino microphone sensor and translates it into visual feedback through WebGL shaders. Users blow into the sensor while visuals mirror their breath's loudness, creating real-time feedback between physiological state and visual representation.

---

## Experiment 3: Pulse Check

- **Tech**: Arduino, THREE.js
- **Input**: Heart rate via Arduino heartbeat sensor (KY-039)
- **Concept**: Translates heartbeat into light. A finger placed on a KY-039 sensor captures pulse. Arduino calculates BPM and streams data to WebGL visualization, creating an intimate mapping of cardiovascular activity to visual form.

---

## Experiment 4: Mood Gradient

- **Tech**: MediaPipe Face Landmarker, WebGL Shaders
- **Input**: Webcam + MediaPipe facial expression analysis
- **Concept**: Uses MediaPipe Face Landmarker to analyse facial blendshapes and emotional micro-expressions. Like a digital mood ring, the interface accumulates emotional signals over time.

**Process**: 15-second session captures users' movements → MediaPipe blendshapes detect facial expressions → WebGL shader creates color and particle response → Gemini interprets the accumulated motion patterns.

---

## Experiment 5: movementGPT

- **Tech**: MoveNet (TensorFlow.js), p5.js, WebGL
- **Input**: Webcam + TensorFlow MoveNet pose detection
- **Concept**: An installation inviting participants to move freely for 15 seconds. MoveNet measures velocity, spatial reach, and movement intensity. These motion data are then interpreted by an LLM.

By making physical movement itself readable to the LLM — rather than asking users to describe their state in text — the project demonstrates embodied data as a first site of emotional and physical expression. It treats the body as the first site where emotional states surface, and lets language follow.

---

## Progression Across Experiments

| # | Experiment | Modality | Sensing | Scale |
|---|-----------|----------|---------|-------|
| 1 | Type Trace | Typing rhythm | Keyboard | Micro (fingers) |
| 2 | Breath Ring | Respiration | Arduino mic | Internal (breath) |
| 3 | Pulse Check | Cardiac | Arduino sensor | Internal (heart) |
| 4 | Mood Gradient | Facial expression | MediaPipe | External (face) |
| 5 | movementGPT | Full-body movement | MoveNet | External (whole body) |

Each experiment adds complexity in how the body interfaces with AI, moving from subtle timing patterns to whole-body spatial expression. The shared thread: the body provides context that text cannot.

---

## Design Principles (Semester 1)

- Quiet observation over analysis — the AI doesn't narrate or analyze, it reflects
- Embodied data as primary language — body signals precede verbal description
- Visual feedback loops — each modality generates immediate, non-linguistic visual response
- Installation / participatory format — designed for real user interaction, not passive viewing
- Hardware integration — Arduino sensors + web technologies create tangible capture points

---

## Technical Stack Summary (Semester 1)

| Component | Technologies |
|-----------|-------------|
| Input Capture | p5.js, Arduino, TensorFlow.js (MoveNet), MediaPipe |
| Processing | Custom JS, GLSL shaders |
| Visualization | Three.js, WebGL, p5.js |
| AI Integration | LLM interpretation (Gemini, OpenAI) |
| Sensing Hardware | Arduino boards, microphone sensors, heartbeat sensors, webcam |
