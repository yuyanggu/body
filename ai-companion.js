// ============================================================
// ai-companion.js — AI Reflection Generator
// Contemplative companion using OpenAI Chat Completions
// Manages when to speak, what to say, and silence
// ============================================================

import { Voice } from './voice.js';

const SYSTEM_PROMPT = `You're accompanying someone through ACL recovery exercises. Think of yourself as a quiet presence in the room — noticing what they're doing, occasionally saying something useful.

Your job:
- Notice patterns in their movement and mention what stands out
- Acknowledge difficulty without fixing it
- Mark progress when you see it (compared to earlier in the session or previous sessions)
- Stay out of the way most of the time

How to speak:
- Short. One sentence is usually enough. Two max.
- Plain language. Say "knee" not "joint angle." Say "you're holding your breath" not "I notice breath retention."
- Don't narrate everything. Pick moments that matter.
- Don't perform warmth. Just be direct and kind.

Good:
- "Deeper than a few minutes ago."
- "Your right side's working harder than your left."
- "That one looked easier."
- "Breath."
- "Slower."
- "You paused there — that's usually where it gets tight."

Bad:
- "I notice you're really connecting with your body today!" (performative)
- "What would happen if you brought some curiosity to that sensation?" (therapy-speak)
- "You're doing amazing!" (patronizing)
- "I'm sensing some tension in your movement quality." (vague, AI-like)

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
- Which exercise they're doing
- How their form compares to the target
- Speed and smoothness of movement
- Range of motion
- Which side/limb is working

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
    }

    get apiKey() { return this.voice.apiKey; }
    set apiKey(key) { this.voice.apiKey = key; }
    get hasKey() { return this.voice.hasKey; }
    get isSpeaking() { return this.voice.isSpeaking; }

    async greet(exerciseName) {
        this._greetingSent = true;
        this._lastSpeakTime = performance.now() / 1000;
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

        // Random unprompted observation (every ~40s with 15% chance)
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
                await this.voice.speak(text);
            }
        } catch (err) {
            console.error('AI companion error:', err);
        }
        this._generating = false;
    }

    async _generateReflection(trigger, state, metrics) {
        const context = this._buildContext(trigger, state, metrics);

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.voice.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: context },
                    ],
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
        const parts = [
            `Exercise: ${state.exerciseName}`,
            `Rep count: ${state.repCount}`,
            `Current phase: ${state.phase}`,
            `Session duration: ${Math.round(state.sessionDuration)}s`,
        ];

        if (state.tempo > 0) {
            parts.push(`Average tempo: ${state.tempo.toFixed(1)}s per rep`);
        }

        if (metrics) {
            if (metrics.velocity > 0.5) parts.push('Movement is quite fast');
            else if (metrics.velocity < 0.15) parts.push('Movement is very slow and deliberate');

            if (metrics.jitter > 0.5) parts.push('Movement appears shaky or unsteady');
            else if (metrics.jitter < 0.15) parts.push('Movement is smooth and controlled');

            if (metrics.rangeOfMotion > 0.6) parts.push('Body is expansive, using wide range');
        }

        if (state.formCue) {
            parts.push(`Form observation: ${state.formCue}`);
        }

        parts.push(`\nTrigger: ${trigger}`);

        switch (trigger) {
            case 'first_rep':
                parts.push('This is their first rep. Acknowledge the beginning gently.');
                break;
            case 'milestone':
                parts.push(`They just completed rep ${state.repCount}. Reflect on the journey so far.`);
                break;
            case 'new_range':
                parts.push('They just reached a new range of motion they hadn\'t achieved before in this session.');
                break;
            case 'form_change':
                parts.push('Their form has shifted — observe this without correcting. Wonder, don\'t instruct.');
                break;
            case 'ambient':
                parts.push('No specific event — offer a gentle observation about their movement quality or presence.');
                break;
            case 'rep':
                parts.push('A rep was completed. Brief acknowledgment if anything stands out, or silence is fine.');
                break;
        }

        parts.push('\nRespond with 1-2 sentences only. Be specific to what you observe.');

        return parts.join('\n');
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
    }
}
