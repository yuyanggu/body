# Skill: AI Companion Edit

Use this skill when modifying how the AI companion decides when to speak, what context it sends to GPT-4o-mini, or how it frames its reflections.

## Design Principle

The AI companion is a **presence, not a physiotherapist**. It observes and reflects — it does not correct, prescribe, diagnose, or motivate. Its authority comes from the body data it receives, not from clinical knowledge. A good reflection sounds like something a thoughtful person in the room would say after watching quietly for a while.

The companion's value in this project is specific: it demonstrates that the body provides richer, more continuous context to AI than typed text. Every reflection the AI makes is grounded in real biomechanical signals (velocity, jitter, range, form quality) — not self-reported data.

## File: `ai-companion.js`

### Key Constants (~line 50)
```js
const MIN_SILENCE = 22000;   // ms — minimum gap between any two reflections
const AMBIENT_CHANCE = 0.006; // per-frame probability of ambient observation
```

### Trigger Types
Triggers fire in `update()` and are passed to `_buildContext()`:

| Trigger | Condition |
|---|---|
| `first_rep` | repCount goes from 0 to 1 |
| `milestone` | repCount is a multiple of 5 |
| `new_range` | peak angle exceeds session best by 3+ degrees |
| `form_change` | formQuality drops below 0.5 |
| `ambient` | AMBIENT_CHANCE random check passes |
| `rep` | any other rep completion (lower priority) |

To add a new trigger: add a condition in `update()` and a case in `_buildContext()`.

### Context Building (`_buildContext()`, line 179)

Context is a plain-text string sent as the user message to GPT-4o-mini. It includes:
- Exercise name, rep count, current phase, session duration
- Movement metrics (velocity, jitter, range) translated into plain English
- Form observation (if any)
- Trigger type + trigger-specific instruction

**To add sensor context** (future IMU integration): append sensor observations to `parts[]` before the trigger line. Use plain language, not numbers:
```js
if (sensorMetrics?.kneeStability < 0.3)
    parts.push('Knee sensor: unstable, micro-tremors present');
```

### System Prompt (line 9)

The system prompt establishes the companion's voice. Key instructions:
- Short (1-2 sentences max)
- Plain language — "knee" not "joint angle"
- Don't narrate everything — only speak when something stands out
- Don't perform warmth — direct and kind, not cheerful

**When extending the system prompt** for sensor awareness, add a paragraph explaining the companion can reference what it "feels" through the sensor — using language like "Your knee is steadier now" rather than "sensor reading: 0.7".

### Voice Output

Text from GPT-4o-mini is passed directly to `voice.js` → OpenAI TTS (Nova, 0.98x speed). Keep reflections to 1-2 short sentences. Longer text creates awkward pauses during exercise.

### What Not to Change

- Do not make the companion more frequent — silence is intentional
- Do not add clinical language or rep-counting narration to the system prompt
- Do not make the companion respond to user questions — it is not a chatbot
- Do not remove the rate limiting (MIN_SILENCE) — it prevents the experience from feeling supervised
