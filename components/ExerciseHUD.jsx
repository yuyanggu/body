'use client';

import useAppStore from '../stores/useAppStore.js';
import useExerciseStore from '../stores/useExerciseStore.js';
import AudioVisualizerGrid from './AudioVisualizerGrid.jsx';

export default function ExerciseHUD() {
    const appMode = useAppStore((s) => s.appMode);
    const exerciseName = useExerciseStore((s) => s.exerciseName);
    const repCount = useExerciseStore((s) => s.repCount);
    const currentAngle = useExerciseStore((s) => s.currentAngle);
    const formCue = useExerciseStore((s) => s.formCue);
    const aiText = useExerciseStore((s) => s.aiText);
    const isSpeaking = useExerciseStore((s) => s.isSpeaking);
    const voiceAnalyser = useExerciseStore((s) => s.voiceAnalyser);

    if (appMode !== 'exercise') return null;

    return (
        <div id="exercise-hud" className="glass-panel">
            <div id="hud-exercise-name">{exerciseName}</div>
            <div id="hud-rep-count">
                <span className="hud-label">Reps</span>
                <span id="hud-reps">{repCount}</span>
            </div>
            <div id="hud-angle-display">
                <span className="hud-label">Range</span>
                <span id="hud-angle">{currentAngle > 0 ? `${currentAngle}°` : '—'}</span>
            </div>
            <div id="hud-form-cue">{formCue}</div>
            <div id="hud-ai-text">{aiText}</div>
            <div id="hud-voice-indicator">
                <AudioVisualizerGrid
                    analyser={voiceAnalyser}
                    state={isSpeaking ? 'speaking' : 'thinking'}
                    rowCount={7}
                    columnCount={20}
                    radius={20}
                    interval={120}
                    color="#a78bfa"
                />
            </div>
        </div>
    );
}
