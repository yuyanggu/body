'use client';

import useAppStore from '../stores/useAppStore.js';
import useExerciseStore from '../stores/useExerciseStore.js';

export default function ControlButtons({ exerciseAnalyzer, aiCompanion, onResetCamera, showEndSession = true }) {
    const paused = useAppStore((s) => s.paused);
    const appMode = useAppStore((s) => s.appMode);
    const togglePause = useAppStore((s) => s.togglePause);
    const setAppMode = useAppStore((s) => s.setAppMode);

    const handleEndSession = () => {
        if (exerciseAnalyzer) exerciseAnalyzer.stop();
        if (aiCompanion) aiCompanion.reset();
        setAppMode('select');
        useExerciseStore.getState().reset();
    };

    return (
        <div id="control-buttons">
            <button className="control-button" onClick={togglePause}>
                <span>{paused ? 'Play' : 'Freeze'}</span>
            </button>
            {onResetCamera && (
                <button className="control-button" onClick={onResetCamera}>
                    <span>Reset</span>
                </button>
            )}
            {showEndSession && appMode === 'exercise' && (
                <button className="control-button" onClick={handleEndSession}>
                    <span>End Session</span>
                </button>
            )}
        </div>
    );
}
