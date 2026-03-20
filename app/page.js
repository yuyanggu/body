'use client';

import { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ExerciseAnalyzer } from '../lib/exercises.js';
import { AICompanion } from '../lib/ai-companion.js';
import useExerciseStore from '../stores/useExerciseStore.js';

import LoadingOverlay from '../components/LoadingOverlay.jsx';
import TestModePanel from '../components/TestModePanel.jsx';
import ControlButtons from '../components/ControlButtons.jsx';
import SensorHUD from '../components/SensorHUD.jsx';
import WebcamPreview from '../components/WebcamPreview.jsx';
import ExerciseOverlay from '../components/ExerciseOverlay.jsx';
import ExerciseHUD from '../components/ExerciseHUD.jsx';

const SceneCanvas = dynamic(() => import('../components/SceneCanvas.jsx'), { ssr: false });

export default function HomePage() {
    const exerciseAnalyzerRef = useRef(null);
    const aiCompanionRef = useRef(null);
    const controlsResetRef = useRef(null);

    if (!exerciseAnalyzerRef.current) {
        exerciseAnalyzerRef.current = new ExerciseAnalyzer();
    }
    if (!aiCompanionRef.current) {
        aiCompanionRef.current = new AICompanion();
        aiCompanionRef.current.onTextUpdate = (text) => {
            useExerciseStore.getState().setAiText(text);
        };

        const stored = typeof localStorage !== 'undefined' && localStorage.getItem('openai_api_key');
        if (stored) {
            aiCompanionRef.current.apiKey = stored;
        }
    }

    return (
        <>
            <video id="webcam" autoPlay playsInline muted style={{ display: 'none' }}></video>

            <SceneCanvas
                exerciseAnalyzer={exerciseAnalyzerRef.current}
                aiCompanion={aiCompanionRef.current}
                enableExercises={true}
            />

            <LoadingOverlay />

            <ExerciseOverlay
                exerciseAnalyzer={exerciseAnalyzerRef.current}
                aiCompanion={aiCompanionRef.current}
            />

            <ExerciseHUD />

            <TestModePanel />
            <WebcamPreview />
            <SensorHUD />

            <ControlButtons
                exerciseAnalyzer={exerciseAnalyzerRef.current}
                aiCompanion={aiCompanionRef.current}
                onResetCamera={() => {
                    // SceneCanvas exposes controls via a global-ish callback
                    // For simplicity, dispatch a custom event
                    window.dispatchEvent(new Event('reset-camera'));
                }}
            />
        </>
    );
}
