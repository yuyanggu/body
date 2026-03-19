# Process Journal

**Instructions to LLMs:** This file documents the design and learning process for Residual Motion. FOLLOW THESE RULES strictly:

- You are a DESIGNER with skills in creative coding and interaction design. Remember this when documenting your work
- Write from a first-person perspective. You have to sound like a real person reflecting, not an AI summarizing. Focus your writing on your design decisions, learnings, and problems faced in an analytical and reflective manner. Document technical details, but not like an engineer, keep it relatively high-level and not code documentation.
- Keep entries concise and critical. Focus on decisions, discoveries, and tensions rather than implementation details. Do not repeat what the code already says.
- Date each entry. Entries must be sorted chronologically, with the EARLIEST first. Append new entries at the end of the file.
- Avoid common AI writing patterns: no em dashes, no short sentences then full stop (keep sentences flowing naturally), no "This is important because...", no "Interestingly,...", no bullet points that start with bolded labels followed by explanations unless genuinely listing distinct items. Vary sentence structure. Use short sentences sometimes. Let ideas breathe.
- Do not over-explain. Trust the reader to connect ideas. One good simple sentence beats three that say the same thing differently.
- Do not use phrases like "the key insight", "what's fascinating", "it's worth noting", "crucially", or "notably". Just say the thing.

---

## 9 February 2026 — Building the Body from Particles with AI

### What happened

Took an existing neural network shader I liked and asked Claude to analyze it, then rebuild it as a body-tracking particle system using MoveNet's 17 keypoints. The first pass worked: skeleton connections, nodes at each joint, movement-responsive effects. But the result was a wireframe. A stick figure made of light. It looked like a tech demo, not a body.

I shared three reference images. One was a dense Anadol-style point cloud forming a full human silhouette. Another was a geometric wireframe mesh with internal connections filling the torso. The third was an organic, flowing particle body with wispy fiber extensions. Showing images communicated in seconds what text descriptions failed to after several prompts.

The fix required rethinking how particles are distributed. The first system tethered every particle to one of 17 keypoints, so you got 17 separate clusters, not a body. The new system treats the body as a volume: the torso is a bilinear quad between shoulders and hips with gaussian depth, limbs are cylinders around each bone with anatomically scaled widths, the head is an ellipsoid. Each particle is assigned to a region and tethered to a position within that volume. This is a fundamentally different spatial sampling strategy, not a parameter change.

Later I found a compact gyroid ray-marcher shader online and asked Claude to integrate it. The shader is 3 lines of twigl-style code that creates organic bioluminescent cellular structures. Claude decomposed it correctly and adapted it so each particle runs a mini 8-step ray-march in its fragment shader, becoming a tiny portal into the cellular field. The accumulated effect across thousands of body-distributed particles should create an organic volumetric body.

The result still feels flat. The particles form the right outline but lack the density and depth of the reference images. A webcam gives you 2D coordinates. The Z-depth is faked with preset offsets per keypoint. No amount of shader magic can recover real depth from a monocular camera.

### Working with AI on visual code

This session clarified where AI helps and where it doesn't for shader work.

It is good at decomposing unfamiliar code. The gyroid shader was 3 lines of obfuscated GLSL and Claude mapped every operation correctly: the SDF, the ray-march loop, the accumulation pattern, the tone mapping. This kind of analysis is tedious by hand.

It is good at architectural changes. The body-volume particle system required new data structures, new spawning logic, and updates across half a dozen interconnected functions. Claude tracked the dependencies and kept everything consistent. I wouldn't want to do that refactor manually.

It is not good at predicting what things look like. Every visual change required running the code and checking. The alpha values, bloom strength, particle sizes, spring constants all had to be tuned by looking, not by reasoning. Claude made reasonable guesses for parameters but they were always off.

Reference images are the most efficient communication tool. Three images replaced paragraphs of description. But even with images, the AI interprets them as technical requirements rather than aesthetic targets. It built the infrastructure to achieve the look but the look itself needs manual tuning.

### What I learned

Describing visuals in text is almost always the wrong approach. Show an image. Even better, build a control panel and tune it yourself. The AI should build the tools and infrastructure. The aesthetic decisions should happen through direct manipulation with real-time feedback.

The monocular depth problem is real. MoveNet gives you X and Y from the webcam. Z is guesswork. I'm using static offsets per keypoint which creates a fixed depth profile regardless of actual pose. This is why the body looks flat from certain angles.

Each iteration reveals the next problem. First it was "skeletal outline, not a body." Then "particles cluster at joints." Then "the torso is hollow." Then "it's flat." Each fix is real progress but surfaces a deeper issue. This is normal for creative-technical work and AI doesn't shortcut this process. It accelerates each fix but doesn't skip the sequence.

---

## 17 February 2026 — Adding the AI Companion: When to Speak, When to Stay Quiet

### What happened

The visualization already responded to the body through velocity, jitter, and range of motion driving shader parameters. But it had nothing to say back. I added the exercise system and AI companion: six ACL exercises with angle tracking and rep counting, GPT-4o-mini reflections with silence management, and OpenAI TTS for voice. An app mode state machine routes between exercise selection and active exercise.

### Design decisions

The user never types. The body is the only prompt. This sounds obvious given the project thesis, but it required actively resisting the chatbot default. Removing the text box keeps attention on the body, not the screen.

Silence is the default. Minimum 22 seconds between reflections. The AI speaks on meaningful triggers like first rep, every 5th milestone, new range, or form quality drops, and has a low random ambient chance. Mostly it's quiet. If it spoke after every rep it would become noise, and the silence makes each observation land.

When form quality drops, the prompt tells the LLM to observe without correcting. The system prompt uses "I notice..." rather than "You should..." This is the concept doc's "extension not correction" principle in code.

Data becomes language before the LLM sees it. `velocity > 0.5` becomes "Movement is quite fast." The translation layer is where the companion's character lives.

On rep completion, `triggerPulse()` fires from the centroid of the exercise's target keypoints. No new shader code needed. The visual reward is spatially grounded in the body part being worked.

### What I learned

The when-to-speak logic (22s minimum, event-based, random ambient) determines the rhythm of the human-AI relationship more than the content of what it says. These numbers are first guesses that need tuning through use.

The hardest decision is what to leave out. Text input, conversation memory, coaching, gamification: all easy to add, all would pull the interaction toward conventional utility. The companion is a witness, not an assistant. That only works if you resist adding more.

---

## 8 March 2026 — Scoping Down with Dhyiah + Claude as Brainstorming Partner

### What happened

Met with Dhyiah to discuss his MA project, a surf balance training system using an IMU sensor and PoseNet for real-time visual feedback. His project went through a similar arc to mine: started technical, pivoted away from healthcare accuracy, landed on engagement over precision. Three things from his work stuck with me.

First, his advisor pushed him away from medical-grade accuracy toward design-driven experimentation. The tool doesn't need to be scientifically rigorous, it needs to be engaging enough that people actually use it. He called it citizen science, not clinical science. This reframing changes what you optimise for.

Second, the IMU gives you what the camera can't. PoseNet/MoveNet sees the body from outside. An IMU strapped to the knee feels the body from inside: micro-tremors, rotational instability, impact forces. These are invisible to the camera but central to ACL recovery. Two scales of perception, macro and micro.

Third, his healthcare pivot failed because the accuracy requirements were impossible to meet without clinical-grade equipment, but the visualisation was effective as a training tool regardless. The feedback doesn't need to be medically valid. It needs to make the person more aware of their body.

### Using Claude as a brainstorming partner

After the meeting I brought Dhyiah's learnings into a Claude session to scope down the final prototype. Instead of diving into implementation, I used Claude to ask me questions, treating it as a design crit partner rather than a code generator.

This worked well. Claude asked things like: "Are you imagining the sensor as input to the visuals or haptic output?" and "Should the exercise structure remain visible or become ambient?" These weren't questions I'd asked myself yet. The structured multiple-choice format forced decisions I'd been deferring.

What came out of it: a bidirectional sensor loop where the IMU feeds the particle system and haptic vibration feeds back to the body. The body shapes the image, and the image touches back. The exercises stay but become ambient, with the visual/haptic experience primary rather than the rep counter. And the AI gains proprioceptive language, referencing what it "feels" through the sensor rather than just what it "sees" through the camera.

### The design statement

Also used Claude to iterate on the design statement. Started with a 100-word draft that was too focused on the technical solution. Through a few rounds of questioning (What does the body give the AI that text can't? How should biomechanics be positioned?) it tightened into something that foregrounds the research argument: the body provides continuous, unprompted context to AI without typing. The AI is not a physiotherapist but a presence. The biomechanics approach is citizen science, design-driven rather than clinical-grade.

The project got a name: Residual Motion. "Residual" works on two levels, remaining function after injury and what the body holds onto.

### What I learned

Claude is better at asking questions than answering them, at least for design work. When I use it to generate solutions, the output is generic. When I use it to interrogate my assumptions, I get decisions I actually commit to. The brainstorming worked because it surfaced choices I hadn't articulated: bidirectional vs. unidirectional, ambient vs. structured, proprioceptive vs. visual.

Scoping down is a design decision, not a compromise. Dhyiah's project improved when he stopped chasing medical accuracy. Mine improved when I stopped trying to build everything and focused on the closed loop: body to screen to haptic to body.

The framing changes what you build. Calling this "citizen science" rather than "medical device" doesn't just affect the writeup. It changes which technical decisions matter. Accuracy becomes less important than responsiveness. Calibration matters less than felt experience.

---

## 15 March 2026 — Shader Control Panel & Dual Particle Layers

### The problem with prompting for visuals

I spent the early part of this session trying to get the particle system to look a certain way by describing it in words. This does not work well. Telling an AI "make the particles more diffuse" or "reduce the glow" produces changes that are technically correct but aesthetically wrong. The gap between language and visual outcome is too wide. You end up in a loop of prompting, waiting, checking, re-prompting, and each cycle costs time without converging on something you actually want.

Shader tuning is fundamentally a real-time feedback process. You need to see the result as you change a value, not after a build-prompt-review cycle. Designers working in TouchDesigner or Houdini would never type a number and wait. They drag a slider and watch.

### Building the control panel

So instead of prompting for visual changes, I built the tool to make them myself. A frosted-glass slider panel on the testing page that writes directly to the GPU uniforms in real time. Every parameter that matters is exposed: particle speed, curl noise frequency, attraction strength, point size, wind vector, shadow density, bloom, body activity override, grid spacing.

This changed the workflow entirely. I could explore the parameter space by feel, watching the particles respond as I dragged. Within a few minutes of sliding I found a configuration I liked (tiny dense particles, high curl, low wind, strong shadow) that I never would have arrived at through text prompts.

### The copy-paste loop

To close the loop between exploration and persistence, I added a copy button to the control panel. It diffs the current slider state against defaults and copies a structured summary to the clipboard. I paste that directly into chat and the AI applies the changes to the codebase. This is much faster and more precise than describing what changed. The AI is good at applying structured parameter changes. It is not good at guessing what "more ethereal" means in terms of curl noise frequency.

### Splitting into two particle layers

Once the control panel existed, the next question was whether a single particle system was enough. I wanted to layer two different particle behaviours on the same body, for example a tight skeletal wireframe underneath a diffuse cloud.

The architecture already supported this cleanly. The `ParticleSystem` class is self-contained, so I instantiated it twice, gave each its own control panel, and routed events through namespaced channels. Layer A uses the full 256-slot body-fill sampler with torso grids, limb interpolation, and depth offsets. Layer B uses a raw skeleton sampler that only packs the 17 MoveNet keypoints plus interpolated points along the bone connections. Layer B particles trace the skeleton wireframe while Layer A fills the body volume. They share the same pose data but respond to completely independent parameter sets.

Layer B also got a particle count slider that rebuilds the entire GPU pipeline on the fly, from 1,024 particles for sparse joint markers up to 262,144 for full density.

### What I learned

AI is better as a tool-builder than a visual designer. When I asked for direct visual changes, the results were hit-or-miss. When I asked it to build me the infrastructure to make my own changes, it was excellent. The shader control panel, the event routing, the dual-layer architecture: all engineering tasks that AI handles well. The actual aesthetic decisions stayed with me.

Real-time feedback changes what you make. Parameters I never would have tried through prompting (curl size maxed out, point size at 100, wind nearly zero) turned out to produce the most interesting results. Exploration needs low friction.

Structured communication beats natural language for parameter changes. The copy button output ("Speed: 1.7, was 2. Curl Size: 0.1, was 0.0175") is unambiguous. Natural language ("make the particles slower and more turbulent") is not.

Separating the body-fill particles from the skeleton-only particles made the MoveNet keypoint structure visible as a design element rather than hidden infrastructure. The raw joint positions and bone lines have their own visual quality that gets lost when everything is interpolated into a smooth body volume.

---

## 15 March 2026 — Getting the Knee IMU Working (XIAO ESP32S3 + MPU-6050)

### The setup

The knee IMU is a small wearable sensor: an MPU-6050 inertial measurement unit wired to a Seeed XIAO ESP32S3 microcontroller. It streams accelerometer and gyroscope data over BLE to the web app, capturing micro-tremor and knee flexion signals that the camera can't see.

Hardware is two breakout boards with pre-soldered headers, connected by four dupont jumper wires. Simple in theory.

### What went wrong

The existing BLE sketch used the Adafruit MPU6050 library and wouldn't find the sensor. The I2C scan came back empty every time. The power LED was on, the wiring looked correct, but nothing on the bus.

I went through a systematic debugging process, starting by writing a minimal test sketch with no BLE, no Adafruit library, just raw I2C. A simple scanner that tries to talk to address `0x68` and prints what it finds. Strip everything away and test the most basic thing first.

The scan still failed, and I discovered the XIAO ESP32S3 has confusing pin labelling where the silk-screened "D4" and "D5" labels don't map to the GPIO numbers you'd expect. Different documentation sources disagree. So I turned the test sketch into a pin finder that tries every possible GPIO combination as SDA/SCL. It found the sensor immediately: `SDA = D4(GPIO5), SCL = D5(GPIO6)`. The original sketch was using `GPIO6`/`GPIO7`, one off on each. This is the kind of error you can stare at for hours because the labels seem right but the numbers underneath are shifted.

After fixing the pins, the I2C scan found the device but `mpu.begin()` from the Adafruit library still failed. The library calls `Wire.begin()` internally, which likely re-initialises I2C and overwrites the explicit pin configuration. The solution was to drop the library entirely and use raw I2C register reads. Less ergonomic but no hidden state.

With raw I2C working, the WHO_AM_I register returned `0x72` instead of the expected `0x68`. A compatible clone chip, common with cheap breakout boards. The Adafruit library would have rejected it. Raw register access doesn't care because the registers are the same and the data format is identical, it just identifies differently. I removed the strict identity check.

Even after all this, one debugging session produced zero results across all pin combos. The cause turned out to be a faulty dupont wire. Replaced it and the sensor appeared immediately. The code was perfect and the problem was a $0.05 wire.

### What I learned

Start with the simplest possible test. The BLE sketch had too many moving parts to diagnose a wiring issue. A 30-line I2C scanner would have found the pin problem in seconds.

Don't trust pin labels. The only authoritative source is scanning every pin and seeing what responds. The pin finder sketch is more reliable than any datasheet because it tests the actual hardware in front of you.

Libraries hide state. The Adafruit library calls `Wire.begin()` internally, which silently overwrites your pin configuration on an ESP32. Raw register access is more code but no surprises.

Clone chips are everywhere. Cheap breakout boards almost never have genuine InvenSense chips. The register interface is compatible and the data is fine, but the WHO_AM_I value differs. Any code that does a strict identity check will reject them.

Hardware debugging has a physical layer. After all the software investigation, the actual blocker was a bad wire. Always have spare cables and try swapping them before assuming the code is wrong.

---

## 15 March 2026 — BLE Frustrations and the Switch to WiFi

### Connecting the sensor to the app

With the Arduino sketch streaming data to the serial monitor, the next step was getting it into the browser. I built a Sensor HUD to display the IMU data: raw accel/gyro values, a knee angle arc gauge, a tremor bar that shifts green to red, and a rolling 10-second line graph of the angle. It replaced the old Movement Metrics panel, absorbing those bars into a unified bottom-left display that expands when the sensor connects.

That part went smoothly. A new Zustand store mirrors the mutable `imuState` object at 5Hz, same pattern as the body store. No new patterns needed, just applying existing ones.

### BLE kept dropping

The BLE connection would drop every 30 to 60 seconds. The Arduino serial monitor would print "BLE client disconnected" while Chrome still showed the device as paired. Auto-reconnect would re-establish the connection, but a few seconds of data loss every minute is not usable for real-time visualization.

I tried adjusting the connection interval parameters. The default was requesting a 7.5ms interval, extremely aggressive for a 50Hz data stream. Bumping it to 22.5-45ms helped slightly but didn't solve it.

The real issue was physical. Holding the board in my hand covered the PCB antenna on the XIAO ESP32S3. The moment I gripped it, the signal degraded and the connection dropped within seconds. Let go and it stayed connected longer. This exposed a fundamental fragility. BLE on this board is sensitive to proximity and orientation in ways that make debugging miserable, because you're constantly touching the thing you're debugging.

### Switching to WiFi WebSocket

The ESP32S3 can run WiFi and BLE simultaneously, but they share the same 2.4GHz radio and degrade each other. Since the sensor is USB-powered, WiFi's higher power draw doesn't matter. And WebSocket from the browser is far more reliable than Web Bluetooth.

I built a parallel WiFi sketch. Same IMU reading code, same 12-byte packet format, but instead of BLE notifications it runs a WebSocket server on port 81. The web side connects and parses the binary frames identically. Only the transport changed.

I kept all the BLE code intact as a fallback. Reverting is a two-step process: flash the BLE sketch, copy the backup web module.

The WiFi connection is immediately more stable. No drops from hand proximity, no advertising restarts. The WebSocket just stays open.

### The IP address problem

WiFi introduces a new friction: the ESP32 gets a dynamic IP from the router, and the browser needs to know it. I hardcoded the current IP into a known-IPs list at the top of the sensor module. On page load, the app tries each known IP with a 2-second timeout probe. If the sensor is on, it connects automatically. If I change networks, I add a new line to the list and update the Arduino sketch's credentials.

This is simple and works. mDNS would be more elegant but adds complexity for a problem I don't actually have. The IP list is fine for one person using one or two networks.

### Physical prototype considerations

The current setup has the ESP32 connected to my laptop via USB for power and serial monitoring. For the actual wearable, a few open questions remain.

A small USB power bank is probably the right first step for untethered power. It keeps the USB-C port free for flashing and avoids battery management complexity.

The dupont wire connections are fragile and pulled loose multiple times during this session alone. For a knee-mounted prototype that moves with the body, these need to be soldered or at minimum secured with hot glue. A disconnected VCC wire was the first thing that went wrong today, and it produced confusing phantom I2C responses that looked like real devices at wrong addresses.

Weight and bulk matter for a knee sensor. The XIAO is tiny but the MPU-6050 breakout and a power bank add up. Mounting, strain relief, and orientation relative to the body all need thought, since the IMU's axes map to knee flexion based on mounting angle.

---

## 16 March 2026 — Designing the Sensor HUD: What the Body Tells You That Numbers Don't

### Deciding what to show

Once the sensor was connected and streaming, the question shifted from "can I get the data?" to "what do I do with it?" The MPU-6050 gives you six channels of acceleration and angular velocity. Showing all of them raw would be honest but useless. The challenge was figuring out which derived metrics actually matter for ACL recovery, and how to present them so they're felt rather than read.

I used Claude to research what biomechanical signals are relevant to knee rehabilitation. Knee flexion angle is the primary measure physiotherapists track during recovery, with range of motion at specific week milestones determining whether rehab is progressing. Tremor and micro-instability indicate neuromuscular control, harder to see with the naked eye but correlated with re-injury risk. Movement smoothness distinguishes confident, recovered movement from hesitant, compensatory patterns.

I didn't try to implement all of these. The citizen science framing from the Dhyiah conversation gave me permission to pick the ones that were computationally simple and visually communicative rather than clinically precise. I landed on three: knee angle, tremor, and a rolling time-series graph.

### The three metrics

Knee angle comes from a complementary filter that fuses gyroscope integration (fast, drifts) with accelerometer-derived pitch (noisy, stable long-term). A calibration phase at connection time captures the standing-straight offset so the displayed angle is relative to the user's neutral position. Standard IMU practice, nothing novel, but an uncalibrated angle reading is meaningless so getting it right matters.

Tremor uses the standard deviation of accelerometer magnitude over a one-second sliding window. High variance means the joint is shaking. I map it to a 0-1 range displayed as a bar that shifts from green through yellow to red. A clinical tremor analysis would use frequency-domain decomposition to separate voluntary from involuntary oscillation, but I'm after a felt sense of "steady vs. shaky" rather than diagnosis.

The rolling graph draws the last ten seconds of knee angle as a continuous line on a small canvas. No axes, no labels, no grid. Just the trace. This was a deliberate choice against the instinct to add more information. The graph's value is temporal pattern recognition: you can see whether your reps are consistent, whether your range is increasing, whether there are sudden jerks. A number tells you "45 degrees now." A graph tells you "your last five reps peaked at 45, 43, 47, 44, 46 and the transitions were smooth." The graph communicates rhythm. Numbers communicate state.

### Merging with the existing UI

Rather than adding a separate IMU panel, I merged everything into a single Sensor HUD that always shows the camera-based metrics and expands to include IMU data when the sensor connects. The two data sources are complementary: the camera sees the whole body at low spatial resolution, the sensor feels one joint at high temporal resolution. Putting them side by side makes the multi-scale nature of the system visible.

### What I learned

Derived metrics beat raw data for body awareness. Six channels of accelerometer and gyroscope numbers are meaningless to a person doing knee exercises. Knee angle and tremor compress those channels into signals that map to felt experience. The compression is where the design lives.

The graph communicates what numbers can't. A single angle value tells you nothing about consistency, rhythm, or trend. The rolling graph does all three without any annotation.

Merging the camera and IMU data into one panel makes the project's thesis visible in the interface itself: the body is sensed at two scales, and both feed the AI companion. The HUD isn't just a display. It's an argument about what embodied data looks like.

---

## 16 March 2026 — The Repo as Shared Brain: Embracing Agentic AI

### How I was working before

Last semester I used Claude Code purely as a code generator. I'd been building prototypes for the "Prompted by the Body" series, projects exploring breath and heart rate as AI input, and my workflow was essentially the same as a chat window. I'd describe what I wanted, get code back, paste it in. The Arduino sketches for those earlier prototypes were refined entirely within Claude's chat interface, disconnected from the actual project files. The AI never saw my directory structure, never read the surrounding code, never understood how one module depended on another. It just received whatever fragment I chose to paste in and responded to that fragment alone.

This worked well enough for isolated problems. Fixing an I2C read, getting BLE notifications formatted correctly, writing a complementary filter. But the moment I needed changes that spanned multiple files or depended on architectural decisions made weeks ago, the process fell apart. I'd re-explain the same context every session. Sometimes I'd forget to mention a constraint, and the AI would produce code that contradicted something I'd already solved. The knowledge about the project lived in my head, and every conversation started from scratch.

I also used Cursor for a while, which was better because it could read open files. But it still only saw what was in front of it. The code without the reasoning. It didn't know that I'd chosen CDN imports for TensorFlow.js because the npm bundle breaks @mediapipe/pose, or that the mutable state singletons in lib/ were deliberate rather than sloppy. It would occasionally try to "fix" things that were intentional.

### What changed

This semester I started treating the repository itself as the shared workspace between me and the AI. Not just a place where code lives, but a place where context accumulates. The shift happened gradually. I was already using Claude Code, but I was using it the way I'd used every AI tool before: as something I talked to, not something that lived inside the project.

The CLAUDE.md was the turning point. It started as a standard readme, but I began growing it into something more like a design document that happens to be machine-readable. The architecture, state flow, shader pipeline, uniform defaults, keypoint slot assignments, integration points. When a new Claude Code session starts, it reads this file and arrives already understanding the project. The ten minutes I used to spend re-explaining the dual particle layers or the sampler structure just disappeared.

This changes what documentation is for. Before, I wrote it for other humans or my future self. Now it's also for the AI that will continue the work tomorrow. The CLAUDE.md isn't just describing the system, it's training the next session's collaborator. When I add a module, I update the file table. When I change the shader pipeline, I update the architecture section. The maintenance cost is real, but it pays back immediately because every session starts competent rather than confused.

### The Next.js migration as a test case

The migration from vanilla JS to Next.js App Router was the first large task where I felt the difference clearly. It touched every file, required understanding the dependency graph between modules, needed SSR guards on anything touching WebGL or the camera, and involved restructuring the entire directory layout. In my old workflow, this would have meant days of copying files between chat and editor, losing context at every step.

Instead, the agent read the codebase, understood the module boundaries from the documentation, and executed the migration with the architecture intact. It created the app directory, split components into their own files, set up Zustand stores to replace global mutable objects, added "use client" directives where needed, and preserved the imperative core in lib/ without trying to React-ify it. I reviewed and directed, but I wasn't the context bridge anymore.

The migration also showed where my documentation had gaps. The agent tried to bundle TensorFlow.js through npm, which I'd already learned triggers a compatibility nightmare. That decision wasn't written down anywhere. After catching it, I added it to the CLAUDE.md. The documentation grows through failures, not just planning, and each failure that gets documented is one that never repeats.

### What this means for the project

There's something fitting about this workflow shift happening in a project about embodied AI interaction. The thesis of Residual Motion is that the body can provide continuous, unprompted context to an AI. The CLAUDE.md does something analogous for the development process: the repository provides continuous, structured context to the AI without me having to narrate it each time. In both cases, the interaction gets richer when the AI has access to persistent state rather than starting from a blank prompt.

The contrast with last semester's prototypes is stark. Those projects produced working code but the knowledge about them was scattered across dozens of chat transcripts that I'll never reopen. This project's knowledge lives in the repo. If I step away for a month, the next session can pick up where I left off because the context is in the files, not in my memory.

### What I learned

The cost of maintaining documentation for AI is lower than the cost of re-explaining context every session. This only works if the documentation reflects the system's actual state rather than its aspirational one, and if you update it when things change. Stale documentation is worse than none because the AI trusts it completely.

The difference between using AI as a chat tool and using it as an agent inside your project is not just convenience. It changes what's possible. The chat workflow caps out at problems that fit inside a single conversation's context window. The agentic workflow, with the repo as shared memory, scales to the size of the project. The Next.js migration would have been impractical in chat. With the agent reading the full codebase and the CLAUDE.md providing architectural intent, it was straightforward.

Context loss was the biggest hidden cost of my previous workflow, and I didn't even recognise it as a cost because re-explaining felt like a normal part of starting a session. It's like the monocular depth problem from the first entry in this journal: you don't know what you're missing until you have the other signal. Persistent, structured project documentation is the depth channel for AI collaboration.

---

## 19 March 2026 — Consult Feedback: The App Works, the Presentation Doesn't

### What happened

Had a consult review today. The technical system is in a reasonable place: movement tracking, rep counting, angle measurement, form feedback, IMU integration, dual-layer particles, AI companion. But the conversation barely touched any of that. Almost the entire session was about what surrounds the app, and how little of it exists.

The wall display has no visual hierarchy. It reads as a collection of screenshots and code fragments without a through-line. Someone walking up to it at OpenStudio wouldn't know what the project is, why it exists, or what they're looking at. There's no introduction, no design statement on the wall, no diagram explaining how the pieces fit together, no video that works without me standing there narrating.

The physiotherapist consultation was flagged as thin. I did a brief 5-10 minute interview early on, but there's limited documentation from it and no follow-up planned. The concern is legitimate: I'm building a tool that sits adjacent to healthcare without evidence that I consulted healthcare professionals seriously. Even with the citizen science framing, the gap between "I had my own ACL injury" and "I spoke to experts about safe exercise design" needs to be smaller and better documented. Scheduling another physio appointment before the showcase isn't realistic at this point, so I need to work with what I have and present it honestly rather than pretend the consultation was deeper than it was.

### What needs to happen for OpenStudio

The feedback was clear: stop refining the application and start building everything around it. The app is the artefact, but the showcase is a communication problem. Five things need to exist that don't yet.

**A design statement on the wall.** The one in the CLAUDE.md is close, but it needs to be printed, mounted, and positioned as the first thing someone reads. It frames the entire project: body as AI input, recovery as context, citizen science not clinical device. Without it, people see a particle visualisation with a webcam and have no entry point.

**An explainer video.** Not a screen recording of me using the app, but a short piece that communicates the concept to someone who isn't there. It should show the body-to-particle relationship, the sensor feeding tremor data, the AI companion responding to movement. It needs to work on a loop without narration, or with minimal text overlay. The current documentation is all written. Nothing moves.

**A technical diagram.** Something that shows the flow from camera and IMU sensor through pose detection and signal processing into the particle system and AI companion, and back through voice and haptics. The system has four or five distinct technical layers and none of them are visible to a viewer. A single well-designed diagram, printed large, makes the engineering legible without requiring someone to read code.

**Narrative structure on the wall.** The physical display needs to read left to right with a clear arc. Design statement and context on the left. Technical diagram and process documentation in the middle. The running application on the right. The current layout is scattered, screenshots placed wherever they fit, with no visual flow guiding the eye.

**Printed materials with proper production quality.** Typography, mounting, consistent formatting. The difference between pinned A4 printouts and properly produced display materials is enormous at a showcase. This isn't about being precious, it's about communicating that the work was taken seriously.

### Reframing what matters now

The instinct up to this point has been to keep improving the app. Better particle behaviour, more responsive AI, tighter IMU integration. That instinct is wrong for where I am in the timeline. The application is functional and demonstrates the thesis. What's missing is every layer of communication that makes that thesis accessible to someone who walks up cold.

This is a different kind of design work. The app is interaction design and creative coding. The showcase is information design and spatial narrative. They require different skills and the second one hasn't started.

The AI tool usage documentation also needs to be visible. The process journal captures it, but the wall should make it explicit: how Claude was used for brainstorming vs. code generation vs. architecture, the copy-paste shader tuning loop, the CLAUDE.md as shared context. This is part of the project's contribution, not just backstory.

### What I learned

A working prototype and a convincing showcase are two completely different deliverables. I've been optimising for the first one. The consult made it obvious I need to shift entirely to the second. The app doesn't need to be better, it needs to be understood.

The expert consultation gap is a real weakness, and trying to paper over it would be worse than addressing it directly. Framing the project honestly as personal experience plus citizen science approach, with a brief but genuine physio consultation informing the exercise design, is more credible than inflating a 10-minute conversation into something it wasn't.

Presentation design is design. It's not a lesser activity bolted on after the real work. The wall, the video, the diagram: these are design artefacts with their own constraints, and they deserve the same intentionality as the shader pipeline or the HUD layout.
