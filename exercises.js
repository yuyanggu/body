// ============================================================
// exercises.js — Exercise Library & Movement Analyzer
// ACL recovery physiotherapy exercises with angle tracking,
// rep counting, and form quality analysis
// ============================================================

// ---- Joint Angle Utility ----

export function computeAngle(kpA, kpB, kpC) {
    // Angle at kpB formed by segments BA and BC (in degrees)
    const ax = kpA.x - kpB.x, ay = kpA.y - kpB.y;
    const cx = kpC.x - kpB.x, cy = kpC.y - kpB.y;
    const dot = ax * cx + ay * cy;
    const cross = ax * cy - ay * cx;
    const angle = Math.atan2(Math.abs(cross), dot);
    return angle * (180 / Math.PI);
}

// ---- Exercise Library ----

export const EXERCISES = [
    {
        id: 'straight_leg_raise',
        name: 'Straight Leg Raise',
        description: 'Lying or seated, raise your straight leg slowly. Focus on control and the edge of your range.',
        side: 'left',  // which leg — user can switch
        primaryAngle: { a: 5, b: 11, c: 13 },  // shoulder-hip-knee (hip flexion proxy)
        repPhases: {
            restAngle: { min: 155, max: 180 },   // leg mostly down
            peakAngle: { min: 90, max: 155 },     // leg raised
        },
        formCheck: {
            label: 'Knee extension',
            joint: { a: 11, b: 13, c: 15 },  // hip-knee-ankle
            goodRange: { min: 160, max: 180 },
            cue: 'Try to keep your knee straight',
        },
        targetKeypoints: [11, 13, 15],
        icon: '🦵',
    },
    {
        id: 'straight_leg_raise_r',
        name: 'Straight Leg Raise (Right)',
        description: 'Raise your right leg slowly while keeping it straight. Notice where resistance appears.',
        side: 'right',
        primaryAngle: { a: 6, b: 12, c: 14 },
        repPhases: {
            restAngle: { min: 155, max: 180 },
            peakAngle: { min: 90, max: 155 },
        },
        formCheck: {
            label: 'Knee extension',
            joint: { a: 12, b: 14, c: 16 },
            goodRange: { min: 160, max: 180 },
            cue: 'Try to keep your knee straight',
        },
        targetKeypoints: [12, 14, 16],
        icon: '🦵',
    },
    {
        id: 'standing_knee_extension',
        name: 'Standing Knee Extension',
        description: 'Standing on one leg, slowly extend the other knee forward. Find your comfortable range.',
        side: 'left',
        primaryAngle: { a: 11, b: 13, c: 15 },  // hip-knee-ankle
        repPhases: {
            restAngle: { min: 60, max: 110 },   // knee bent
            peakAngle: { min: 140, max: 180 },   // knee extended
        },
        formCheck: null,
        targetKeypoints: [11, 13, 15],
        icon: '🧘',
    },
    {
        id: 'wall_squat',
        name: 'Wall Squat',
        description: 'Lean against a wall and slowly lower into a partial squat. Explore how deep feels right today.',
        side: 'both',
        primaryAngle: { a: 12, b: 14, c: 16 },  // hip-knee-ankle (right side)
        repPhases: {
            restAngle: { min: 155, max: 180 },   // standing
            peakAngle: { min: 80, max: 155 },     // squatted
        },
        formCheck: {
            label: 'Knee alignment',
            joint: { a: 11, b: 13, c: 15 },  // left side mirror
            goodRange: { min: 80, max: 180 },
            cue: 'Keep both knees tracking evenly',
        },
        targetKeypoints: [11, 12, 13, 14, 15, 16],
        icon: '🏋️',
    },
    {
        id: 'calf_raise',
        name: 'Calf Raises',
        description: 'Rise onto your toes slowly, then lower with control. Feel the full motion.',
        side: 'both',
        primaryAngle: { a: 14, b: 16, c: 12 },  // knee-ankle-hip (ankle flexion proxy)
        repPhases: {
            restAngle: { min: 70, max: 120 },
            peakAngle: { min: 120, max: 180 },
        },
        formCheck: null,
        targetKeypoints: [13, 14, 15, 16],
        icon: '🦶',
    },
    {
        id: 'hip_abduction',
        name: 'Side Leg Raise',
        description: 'Standing, lift your leg to the side. Move slowly and notice your balance.',
        side: 'left',
        primaryAngle: { a: 12, b: 11, c: 13 },  // right_hip - left_hip - left_knee
        repPhases: {
            restAngle: { min: 155, max: 180 },
            peakAngle: { min: 100, max: 155 },
        },
        formCheck: null,
        targetKeypoints: [11, 12, 13],
        icon: '🧍',
    },
];

// ---- Exercise Analyzer ----

export class ExerciseAnalyzer {
    constructor() {
        this.exercise = null;
        this.repCount = 0;
        this.phase = 'rest';       // 'rest' | 'active' | 'returning'
        this.currentAngle = 0;
        this.formAngle = 0;
        this.formQuality = 1;      // 0-1
        this.formCue = '';
        this.peakAngle = 0;        // best angle reached in current rep
        this.bestRange = 0;        // best range achieved this session
        this.sessionStart = 0;
        this.lastRepTime = 0;
        this.tempo = 0;            // seconds per rep (moving average)
        this._repStartTime = 0;
        this._tempoHistory = [];
        this._prevAngle = 0;
        this._smoothAngle = 0;
        this._phaseHistory = [];   // for detecting transitions
    }

    start(exercise) {
        this.exercise = exercise;
        this.repCount = 0;
        this.phase = 'rest';
        this.currentAngle = 0;
        this.formAngle = 0;
        this.formQuality = 1;
        this.formCue = '';
        this.peakAngle = 0;
        this.bestRange = 0;
        this.sessionStart = performance.now() / 1000;
        this.lastRepTime = 0;
        this.tempo = 0;
        this._repStartTime = 0;
        this._tempoHistory = [];
        this._prevAngle = 0;
        this._smoothAngle = 0;
        this._phaseHistory = [];
    }

    get sessionDuration() {
        return performance.now() / 1000 - this.sessionStart;
    }

    get isNewRange() {
        return this.peakAngle > this.bestRange - 2;
    }

    // Call every frame with bodyState
    update(bodyState) {
        if (!this.exercise) return null;
        const ex = this.exercise;
        const kps = bodyState.keypoints;

        // Check confidence of primary angle keypoints
        const { a, b, c } = ex.primaryAngle;
        if (kps[a].confidence < 0.3 || kps[b].confidence < 0.3 || kps[c].confidence < 0.3) {
            return this.getState();
        }

        // Compute primary angle
        const rawAngle = computeAngle(kps[a].smoothed, kps[b].smoothed, kps[c].smoothed);
        // Smooth the angle
        this._smoothAngle = this._smoothAngle * 0.7 + rawAngle * 0.3;
        this.currentAngle = Math.round(this._smoothAngle);
        this._prevAngle = rawAngle;

        // Phase detection
        const { restAngle, peakAngle } = ex.repPhases;
        const inRest = this.currentAngle >= restAngle.min && this.currentAngle <= restAngle.max;
        const inPeak = this.currentAngle >= peakAngle.min && this.currentAngle <= peakAngle.max;

        let repCompleted = false;

        if (this.phase === 'rest' && inPeak) {
            // Started moving into active range
            this.phase = 'active';
            this._repStartTime = performance.now() / 1000;
        } else if (this.phase === 'active') {
            // Track peak angle within active phase
            // For exercises where peak is lower angle (like squat), track min
            if (peakAngle.max < restAngle.min) {
                // Peak is lower than rest (e.g., squat goes from 170 to 90)
                if (this.currentAngle < this.peakAngle || this.peakAngle === 0) {
                    this.peakAngle = this.currentAngle;
                }
            } else {
                // Peak is higher than rest (e.g., knee extension goes from 80 to 170)
                if (this.currentAngle > this.peakAngle) {
                    this.peakAngle = this.currentAngle;
                }
            }

            if (inRest) {
                // Returned to rest → rep complete
                this.phase = 'returning';
            }
        } else if (this.phase === 'returning') {
            if (inRest) {
                repCompleted = true;
                this.repCount++;
                this.lastRepTime = performance.now() / 1000;

                // Update tempo
                const repDuration = this.lastRepTime - this._repStartTime;
                this._tempoHistory.push(repDuration);
                if (this._tempoHistory.length > 5) this._tempoHistory.shift();
                this.tempo = this._tempoHistory.reduce((a, b) => a + b, 0) / this._tempoHistory.length;

                // Update best range
                if (this.peakAngle > this.bestRange) {
                    this.bestRange = this.peakAngle;
                }

                // Reset for next rep
                this.peakAngle = 0;
                this.phase = 'rest';
            }
        }

        // Form check
        if (ex.formCheck) {
            const fc = ex.formCheck;
            const fa = kps[fc.joint.a]?.smoothed;
            const fb = kps[fc.joint.b]?.smoothed;
            const fcc = kps[fc.joint.c]?.smoothed;
            if (fa && fb && fcc) {
                this.formAngle = computeAngle(fa, fb, fcc);
                const inGoodForm = this.formAngle >= fc.goodRange.min && this.formAngle <= fc.goodRange.max;
                // Smooth form quality
                this.formQuality = this.formQuality * 0.95 + (inGoodForm ? 1 : 0.3) * 0.05;
                this.formCue = inGoodForm ? '' : fc.cue;
            }
        } else {
            this.formQuality = 1;
            this.formCue = '';
        }

        return { ...this.getState(), repCompleted };
    }

    getState() {
        return {
            exerciseId: this.exercise?.id,
            exerciseName: this.exercise?.name,
            repCount: this.repCount,
            phase: this.phase,
            currentAngle: this.currentAngle,
            formQuality: this.formQuality,
            formCue: this.formCue,
            peakAngle: this.peakAngle,
            bestRange: this.bestRange,
            tempo: this.tempo,
            sessionDuration: this.sessionDuration,
            isNewRange: this.isNewRange,
        };
    }

    stop() {
        const summary = {
            exercise: this.exercise?.name,
            totalReps: this.repCount,
            bestRange: this.bestRange,
            avgTempo: this.tempo,
            duration: this.sessionDuration,
        };
        this.exercise = null;
        return summary;
    }
}
