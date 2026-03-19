'use client';

import dynamic from 'next/dynamic';

import LoadingOverlay from '../../components/LoadingOverlay.jsx';
import TestModePanel from '../../components/TestModePanel.jsx';
import ControlButtons from '../../components/ControlButtons.jsx';
import SensorHUD from '../../components/SensorHUD.jsx';
import WebcamPreview from '../../components/WebcamPreview.jsx';
import TestingStatusPanel from '../../components/TestingStatusPanel.jsx';
import ShaderControlPanel from '../../components/ShaderControlPanel.jsx';

const SceneCanvas = dynamic(() => import('../../components/SceneCanvas.jsx'), { ssr: false });

export default function TestingPage() {
    return (
        <>
            <video id="webcam" autoPlay playsInline muted style={{ display: 'none' }}></video>

            <SceneCanvas
                exerciseAnalyzer={null}
                aiCompanion={null}
                enableExercises={false}
            />

            <LoadingOverlay />
            <TestingStatusPanel />
            <ShaderControlPanel layer="a" title="Layer A" showSceneControls />
            <ShaderControlPanel layer="b" title="Layer B" showSceneControls showParticleCount />
            <TestModePanel />
            <WebcamPreview />
            <SensorHUD />

            <ControlButtons
                exerciseAnalyzer={null}
                aiCompanion={null}
                onResetCamera={() => window.dispatchEvent(new Event('reset-camera'))}
                showEndSession={false}
            />
        </>
    );
}
