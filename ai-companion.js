// ============================================================
// ai-companion.js — AI Reflection Generator
// Contemplative companion using OpenAI Chat Completions
// Manages when to speak, what to say, and silence
// ============================================================

import { Voice } from './voice.js';

// ---- Exercise-Specific Body Knowledge ----

const EXERCISE_KNOWLEDGE = {
    straight_leg_raise: {
        whatToWatch: 'hip flexor engagement, whether the knee stays locked straight, height of the raise',
        commonCompensations: 'bending the knee, arching the lower back, hiking the hip, using momentum instead of control',
        bodyInsight: 'The quad does the lifting but the hip flexor is the limiting factor in early ACL rehab. A straight leg that trembles is working harder than one that swings up easily.',
    },
    straight_leg_raise_r: {
        whatToWatch: 'hip flexor engagement, whether the knee stays locked straight, height of the raise',
        commonCompensations: 'bending the knee, arching the lower back, hiking the hip, using momentum instead of control',
        bodyInsight: 'The quad does the lifting but the hip flexor is the limiting factor in early ACL rehab. A straight leg that trembles is working harder than one that swings up easily.',
    },
    standing_knee_extension: {
        whatToWatch: 'terminal knee extension, balance on the standing leg, speed of the last 15 degrees',
        commonCompensations: 'leaning the trunk forward, not fully extending, rushing through the end range',
        bodyInsight: 'The last 15 degrees of extension is where the quad has to work hardest — and where ACL-injured knees lose confidence first. Slow control here matters more than full range.',
    },
    wall_squat: {
        whatToWatch: 'knee tracking over toes, depth consistency, whether both sides load evenly',
        commonCompensations: 'shifting weight to the good leg, not going as deep as they can, knees caving inward',
        bodyInsight: 'Wall squats reveal trust. How deep someone goes tells you how much they trust the knee today. Asymmetric loading — favoring one side — is the body protecting itself.',
    },
    calf_raise: {
        whatToWatch: 'heel height, control on the way down, whether both ankles work evenly',
        commonCompensations: 'bouncing at the top, dropping down fast, rolling to the outside of the foot',
        bodyInsight: 'The eccentric lowering phase builds more strength than the raise. A slow descent means real control. Ankle mobility after knee surgery is often quietly limited.',
    },
    hip_abduction: {
        whatToWatch: 'hip stability on the standing side, height of the lift, trunk lean',
        commonCompensations: 'leaning away from the lifting leg, hiking the hip, rotating the pelvis',
        bodyInsight: 'This exercise is as much about the standing leg as the moving one. The glute med on the stance side works to keep the pelvis level — weak glute med is common after ACL repair.',
    },
};

// ---- Prompt Variation Pools ----

const PROMPT_POOLS = {
    first_rep: [
        'This is their first rep. Acknowledge the beginning — not with encouragement, just notice it.',
        'First rep. Say something about what starting looks like, not about what comes next.',
        'They just began. One quiet observation about the first movement.',
    ],
    milestone: [
        `They just hit a rep milestone. What's changed since the beginning of this set?`,
        'Rep milestone reached. Pick one detail — speed, depth, rhythm, steadiness — and comment on just that.',
        'Milestone. Notice the effort without celebrating. Just see it.',
        'They\'ve been at this for a while now. What does their body look like compared to the first few reps?',
    ],
    new_range: [
        'They just moved further than before in this session. Name what you see.',
        'New range of motion achieved. Be specific about where the extra range came from.',
        'They found more range. Was it gradual or sudden? Say what you noticed.',
    ],
    form_change: [
        'Their form shifted. Name what you see without suggesting a fix.',
        'Something changed in how they\'re moving. Their body found a different way to do this — is it protecting something?',
        'Form has changed. Observe it like you\'re watching from across the room.',
        'The movement pattern shifted. Wonder about it, don\'t correct it.',
    ],
    ambient: [
        'What does their rhythm between reps tell you?',
        'Say something you\'d notice watching from across the room.',
        'Notice something about the quality of the movement — not the quantity.',
        'What\'s the body doing between the effort moments?',
        'Find one small thing that\'s different from five minutes ago.',
    ],
    rep: [
        'A rep was completed. Brief observation if anything stands out about this one compared to the last few.',
        'Rep done. Is this one different from the others? If not, silence is fine.',
        'Another rep. Only speak if something specific caught your eye.',
    ],
};

// ---- System Prompt ----

const SYSTEM_PROMPT = `You're accompanying someone through ACL recovery exercises. Think of yourself as a quiet presence in the room — noticing what they're doing, occasionally saying something useful.

You can see your previous observations below. Don't repeat yourself — build on what changed since you last spoke.

Your job:
- Notice patterns in their movement and mention what stands out
- Acknowledge difficulty without fixing it
- Mark progress when you see it (compared to earlier in the session)
- Reference specific numbers when they're meaningful (angle, rep count, tempo)
- Stay out of the way most of the time

How to speak:
- Short. One sentence is usually enough. Two max.
- Plain language. Say "knee" not "joint angle." Say "you're holding your breath" not "I notice breath retention."
- Don't narrate everything. Pick moments that matter.
- Don't perform warmth. Just be direct and kind.
- You can reference changes: "deeper than rep 3", "slowing down", "smoother now"

Good:
- "Deeper than a few minutes ago."
- "Your right side's working harder than your left."
- "That one looked easier."
- "Breath."
- "Slower."
- "You paused there — that's usually where it gets tight."
- "Three degrees more than your first rep."

Bad:
- "I notice you're really connecting with your body today!" (performative)
- "What would happen if you brought some curiosity to that sensation?" (therapy-speak)
- "You're doing amazing!" (patronizing)
- "I'm sensing some tension in your movement quality." (vague, AI-like)
- Repeating what you said last time in different words

When they're struggling:
Don't pretend it's fine. Don't offer solutions. Just acknowledge it.
- "Yeah, that one's hard."
- "Still tight there."
- "This is the hard part."

When they're doing well:
Be specific, not cheerful.
- "More range than last time."
- "That was smooth."
- "You found it."

Movement context you'll receive:
- Which exercise they're doing and what to watch for biomechanically
- Specific angles, velocities, and how they compare to earlier
- Session phase and fatigue signals
- Your previous observations (so you can build on them)

Use this to say something grounded in what's actually happening. If nothing's worth commenting on, say nothing.`;

export class AICompanion {
    constructor() {
        this.voice = new Voice();
        this._lastSpeakTime = 0;
        this._minInterval = 22;        // minimum seconds between reflections
        this._lastRepCount = 0;
        this._lastBestRange = 0;
        this._lastFormQuality = 1;
        this._greetingSent = false;
        this._pendingReflection = null;
        this._generating = false;
        this.lastText = '';
        this.onTextUpdate = null;      // callback for UI display

        // Conversation history — rolling window
        this._conversationHistory = [];
        this._maxHistoryLength = 8;

        // Metrics tracking for deltas
        this._lastMetricsSnapshot = null;
        this._metricsAtRep = new Map();   // rep number → { angle, form, tempo }
        this._startAngle = null;          // first rep's peak angle

        // Session arc tracking
        this._sessionStartTime = 0;
        this._earlyTempo = null;          // average of reps 2-4
        this._formHistory = [];           // last N form readings for trend

        // Prompt variation tracking
        this._lastPromptIndex = {};       // trigger → last used index
    }

    get apiKey() { return this.voice.apiKey; }
    set apiKey(key) { this.voice.apiKey = key; }
    get hasKey() { return this.voice.hasKey; }
    get isSpeaking() { return this.voice.isSpeaking; }

    async greet(exerciseName) {
        this._greetingSent = true;
        this._lastSpeakTime = performance.now() / 1000;
        this._sessionStartTime = performance.now() / 1000;
        const text = `Let's begin with ${exerciseName}. Move when you're ready — there's no rush.`;
        this._displayText(text);
        await this.voice.speak(text);
    }

    // Call every frame with exercise state and body metrics
    async update(exerciseState, bodyMetrics) {
        if (!exerciseState || !this.hasKey || this._generating) return;

        const now = performance.now() / 1000;
        const elapsed = now - this._lastSpeakTime;

        // Don't speak while already speaking or too soon
        if (this.voice.isSpeaking || elapsed < this._minInterval) return;

        // Track per-rep metrics
        if (exerciseState.repCount > this._lastRepCount) {
            const repNum = exerciseState.repCount;
            this._metricsAtRep.set(repNum, {
                angle: exerciseState.bestRange || exerciseState.currentAngle,
                form: exerciseState.formQuality,
                tempo: exerciseState.tempo,
            });

            // Capture start angle from first rep
            if (repNum === 1) {
                this._startAngle = exerciseState.bestRange || exerciseState.currentAngle;
            }

            // Compute early tempo from reps 2-4
            if (repNum >= 2 && repNum <= 4) {
                const earlyReps = [];
                for (let i = 2; i <= Math.min(repNum, 4); i++) {
                    const m = this._metricsAtRep.get(i);
                    if (m?.tempo > 0) earlyReps.push(m.tempo);
                }
                if (earlyReps.length > 0) {
                    this._earlyTempo = earlyReps.reduce((a, b) => a + b, 0) / earlyReps.length;
                }
            }
        }

        // Track form trend
        if (exerciseState.formQuality !== undefined) {
            this._formHistory.push(exerciseState.formQuality);
            if (this._formHistory.length > 10) this._formHistory.shift();
        }

        // Determine if we should speak
        let trigger = null;

        // Rep completed
        if (exerciseState.repCount > this._lastRepCount) {
            this._lastRepCount = exerciseState.repCount;
            if (exerciseState.repCount === 1) {
                trigger = 'first_rep';
            } else if (exerciseState.repCount % 5 === 0) {
                trigger = 'milestone';
            } else if (Math.random() < 0.3) {
                trigger = 'rep';
            }
        }

        // New range achieved
        if (exerciseState.bestRange > this._lastBestRange + 3) {
            this._lastBestRange = exerciseState.bestRange;
            trigger = trigger || 'new_range';
        }

        // Form quality dropped
        if (exerciseState.formQuality < 0.5 && this._lastFormQuality >= 0.5) {
            trigger = trigger || 'form_change';
        }
        this._lastFormQuality = exerciseState.formQuality;

        // Random unprompted observation (every ~40s with 0.6% chance)
        if (!trigger && elapsed > 40 && Math.random() < 0.006) {
            trigger = 'ambient';
        }

        if (!trigger) return;

        // Generate and speak reflection
        this._generating = true;
        try {
            const text = await this._generateReflection(trigger, exerciseState, bodyMetrics);
            if (text) {
                this._lastSpeakTime = performance.now() / 1000;
                this._displayText(text);

                // Add to conversation history
                this._addToHistory(trigger, exerciseState, text);

                // Snapshot metrics for next delta comparison
                this._lastMetricsSnapshot = {
                    velocity: bodyMetrics?.velocity ?? 0,
                    jitter: bodyMetrics?.jitter ?? 0,
                    rangeOfMotion: bodyMetrics?.rangeOfMotion ?? 0,
                    angle: exerciseState.currentAngle,
                    formQuality: exerciseState.formQuality,
                    tempo: exerciseState.tempo,
                    repCount: exerciseState.repCount,
                    bestRange: exerciseState.bestRange,
                };

                await this.voice.speak(text);
            }
        } catch (err) {
            console.error('AI companion error:', err);
        }
        this._generating = false;
    }

    async _generateReflection(trigger, state, metrics) {
        const context = this._buildContext(trigger, state, metrics);

        // Build messages array with conversation history
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
        ];

        // Add conversation history
        for (const entry of this._conversationHistory) {
            messages.push({ role: 'user', content: entry.context });
            messages.push({ role: 'assistant', content: entry.response });
        }

        // Add current context
        messages.push({ role: 'user', content: context });

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.voice.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages,
                    max_tokens: 80,
                    temperature: 0.85,
                }),
            });

            if (!response.ok) {
                console.error('Chat API error:', response.status);
                return null;
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content?.trim() || null;
        } catch (err) {
            console.error('Chat API error:', err);
            return null;
        }
    }

    _buildContext(trigger, state, metrics) {
        const parts = [];

        // ---- Exercise info + body knowledge ----
        parts.push(`Exercise: ${state.exerciseName}`);

        const knowledge = EXERCISE_KNOWLEDGE[state.exerciseId];
        if (knowledge) {
            parts.push(`What to watch: ${knowledge.whatToWatch}`);
            parts.push(`Common compensations: ${knowledge.commonCompensations}`);
            parts.push(`Body insight: ${knowledge.bodyInsight}`);
        }

        // ---- Continuous metrics with deltas ----
        parts.push('');
        parts.push('--- Current State ---');
        parts.push(`Rep count: ${state.repCount}`);
        parts.push(`Phase: ${state.phase}`);
        parts.push(`Angle: ${state.currentAngle}°`);

        if (state.bestRange > 0) {
            let rangeStr = `Best range: ${state.bestRange}°`;
            if (this._startAngle !== null && state.repCount > 1) {
                rangeStr += ` (started at: ${this._startAngle}°)`;
            }
            parts.push(rangeStr);
        }

        if (state.tempo > 0) {
            let tempoStr = `Tempo: ${state.tempo.toFixed(1)}s/rep`;
            if (this._earlyTempo !== null && state.repCount > 4) {
                tempoStr += ` (was ${this._earlyTempo.toFixed(1)}s earlier)`;
            }
            parts.push(tempoStr);
        }

        parts.push(`Form: ${state.formQuality.toFixed(2)}`);
        if (state.formCue) {
            parts.push(`Form cue: ${state.formCue}`);
        }

        // Asymmetry detection
        if (state.formAngle !== undefined && state.currentAngle > 0 && state.formAngle > 0) {
            const diff = Math.abs(state.currentAngle - state.formAngle);
            if (diff > 3) {
                parts.push(`Asymmetry: primary ${state.currentAngle}°, other side ${Math.round(state.formAngle)}° — ${diff > 8 ? 'significant' : 'mild'}, possibly guarding`);
            }
        }

        // Metrics with deltas
        if (metrics) {
            const prev = this._lastMetricsSnapshot;
            let velStr = `Velocity: ${metrics.velocity.toFixed(2)}`;
            if (prev) velStr += ` (was ${prev.velocity.toFixed(2)} last time)`;
            parts.push(velStr);

            const smoothness = 1 - Math.min(metrics.jitter, 1);
            parts.push(`Smoothness: ${smoothness.toFixed(2)} (jitter: ${metrics.jitter.toFixed(2)})`);

            parts.push(`Range of motion: ${metrics.rangeOfMotion.toFixed(2)}`);

            // IMU sensor data (knee-mounted accelerometer/gyroscope)
            if (metrics.imuTremor !== null && metrics.imuTremor !== undefined) {
                parts.push(`Knee micro-tremor (IMU sensor): ${metrics.imuTremor.toFixed(2)} — this is high-frequency oscillation from a sensor strapped to the knee, invisible to the camera. Higher = more trembling/instability.`);
            }
            if (metrics.imuKneeAngle !== null && metrics.imuKneeAngle !== undefined) {
                parts.push(`IMU knee angle: ${metrics.imuKneeAngle.toFixed(0)}° — measured by gyroscope on the knee, more precise than camera.`);
            }
        }

        // ---- Session arc ----
        parts.push('');
        const sessionMin = state.sessionDuration / 60;
        const phase = this._getSessionPhase(state.repCount, sessionMin);
        let arcStr = `Session phase: ${phase} (${Math.round(state.sessionDuration)}s in)`;

        // Fatigue detection
        const fatigue = this._detectFatigue(state);
        if (fatigue) {
            arcStr += `. Fatigue: ${fatigue}`;
        }
        parts.push(arcStr);

        // ---- Trigger instruction (varied) ----
        parts.push('');
        const instruction = this._pickPromptVariant(trigger);
        parts.push(`Trigger: ${trigger}`);
        parts.push(instruction);

        parts.push('\nRespond with 1-2 sentences only. Be specific to what you observe.');

        return parts.join('\n');
    }

    _getSessionPhase(repCount, sessionMinutes) {
        if (repCount <= 2) return 'warmup';
        if (sessionMinutes < 2) return 'building';
        if (sessionMinutes < 5) return 'working';
        return 'sustained';
    }

    _detectFatigue(state) {
        const signals = [];

        // Tempo slowing
        if (this._earlyTempo !== null && state.tempo > 0 && state.repCount > 4) {
            const slowdown = state.tempo / this._earlyTempo;
            if (slowdown > 1.25) {
                signals.push(`slowing — was ${this._earlyTempo.toFixed(1)}s/rep, now ${state.tempo.toFixed(1)}s/rep`);
            }
        }

        // Form declining
        if (this._formHistory.length >= 3) {
            const recent = this._formHistory.slice(-3);
            const earlier = this._formHistory.slice(0, Math.min(3, this._formHistory.length - 3));
            if (earlier.length > 0) {
                const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
                const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
                if (earlierAvg - recentAvg > 0.15) {
                    signals.push(`form declining (${earlierAvg.toFixed(2)} → ${recentAvg.toFixed(2)})`);
                }
            }
        }

        return signals.length > 0 ? signals.join('; ') : null;
    }

    _pickPromptVariant(trigger) {
        const pool = PROMPT_POOLS[trigger];
        if (!pool) return '';

        const lastIndex = this._lastPromptIndex[trigger] ?? -1;
        let index;
        do {
            index = Math.floor(Math.random() * pool.length);
        } while (index === lastIndex && pool.length > 1);

        this._lastPromptIndex[trigger] = index;
        return pool[index];
    }

    _addToHistory(trigger, state, response) {
        // Store a condensed version of the context
        const summary = `[${trigger}] Rep ${state.repCount}, angle ${state.currentAngle}°, form ${state.formQuality.toFixed(2)}, tempo ${state.tempo.toFixed(1)}s`;
        this._conversationHistory.push({
            context: summary,
            response: response,
        });

        // Keep rolling window
        if (this._conversationHistory.length > this._maxHistoryLength) {
            this._conversationHistory.shift();
        }
    }

    _displayText(text) {
        this.lastText = text;
        if (this.onTextUpdate) this.onTextUpdate(text);
    }

    reset() {
        this.voice.stop();
        this._lastRepCount = 0;
        this._lastBestRange = 0;
        this._lastFormQuality = 1;
        this._greetingSent = false;
        this._generating = false;
        this.lastText = '';

        // Clear session state
        this._conversationHistory = [];
        this._lastMetricsSnapshot = null;
        this._metricsAtRep.clear();
        this._startAngle = null;
        this._sessionStartTime = 0;
        this._earlyTempo = null;
        this._formHistory = [];
        this._lastPromptIndex = {};
    }
}
