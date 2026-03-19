'use client';

import useAppStore from '../stores/useAppStore.js';
import { bodyState, setupCamera, setupPoseDetection, hasDetector } from '../lib/pose-detection.js';

export default function TestModePanel() {
    const testMode = useAppStore((s) => s.testMode);
    const showKeypoints = useAppStore((s) => s.showKeypoints);
    const showDataOverlay = useAppStore((s) => s.showDataOverlay);
    const setTestMode = useAppStore((s) => s.setTestMode);
    const setShowKeypoints = useAppStore((s) => s.setShowKeypoints);
    const setShowDataOverlay = useAppStore((s) => s.setShowDataOverlay);

    const handleTestModeChange = (e) => {
        const checked = e.target.checked;
        setTestMode(checked);
        if (checked) {
            bodyState.isTracking = true;
            bodyState.presence = 1.0;
        } else {
            bodyState.isTracking = false;
            bodyState.presence = 0;
            if (!hasDetector()) {
                setupCamera().then(() => setupPoseDetection()).catch(err => {
                    console.warn('Camera setup failed:', err);
                });
            }
        }
    };

    return (
        <div id="test-mode-panel" className="glass-panel">
            <div id="test-mode-title">Test Skeleton</div>
            <div className="toggle-row">
                <span className="toggle-label">Synthetic Body</span>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={testMode}
                        onChange={handleTestModeChange}
                    />
                    <span className="toggle-slider"></span>
                </label>
            </div>
            <div className="toggle-row">
                <span className="toggle-label">Show Keypoints</span>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={showKeypoints}
                        onChange={(e) => setShowKeypoints(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                </label>
            </div>
            <div className="toggle-row">
                <span className="toggle-label">Data Overlay</span>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={showDataOverlay}
                        onChange={(e) => setShowDataOverlay(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                </label>
            </div>
        </div>
    );
}
