'use client';

import { useState, useEffect, useRef } from 'react';
import useAppStore from '../stores/useAppStore.js';
import useIMUStore from '../stores/useIMUStore.js';
import { bodyState, setupCamera, setupPoseDetection, hasDetector } from '../lib/pose-detection.js';

export default function TestModePanel() {
    const [hidden, setHidden] = useState(true);
    const [simulateIMU, setSimulateIMU] = useState(false);
    const imuIntervalRef = useRef(null);
    const testMode = useAppStore((s) => s.testMode);
    const showKeypoints = useAppStore((s) => s.showKeypoints);
    const showDataOverlay = useAppStore((s) => s.showDataOverlay);
    const setTestMode = useAppStore((s) => s.setTestMode);
    const setShowKeypoints = useAppStore((s) => s.setShowKeypoints);
    const setShowDataOverlay = useAppStore((s) => s.setShowDataOverlay);

    // Dummy IMU data generator
    useEffect(() => {
        if (simulateIMU) {
            let t = 0;
            imuIntervalRef.current = setInterval(() => {
                t += 0.1;
                // Simulate knee flexion/extension cycle (~6s period)
                const kneeAngle = 45 + 40 * Math.sin(t * 1.05) + 5 * Math.sin(t * 3.7);
                // Simulate accelerometer — gravity on Y + movement noise
                const accelX = 0.3 * Math.sin(t * 2.1) + 0.1 * Math.sin(t * 7.3);
                const accelY = -9.8 + 0.5 * Math.sin(t * 1.05);
                const accelZ = 0.2 * Math.cos(t * 1.8) + 0.05 * Math.sin(t * 11.2);
                // Simulate gyroscope — angular velocity from knee movement
                const gyroX = 40 * Math.cos(t * 1.05) + 5 * Math.sin(t * 5.1);
                const gyroY = 3 * Math.sin(t * 2.3);
                const gyroZ = 2 * Math.cos(t * 3.1);
                // Tremor varies slowly
                const tremor = 0.15 + 0.12 * Math.sin(t * 0.4) + 0.05 * Math.sin(t * 2.9);

                useIMUStore.getState().updateFromIMU({
                    connected: true,
                    connecting: false,
                    accel: { x: accelX, y: accelY, z: accelZ },
                    gyro: { x: gyroX, y: gyroY, z: gyroZ },
                    tremor: Math.max(0, Math.min(1, tremor)),
                    kneeAngle: Math.max(0, kneeAngle),
                });
            }, 200); // 5Hz to match store update rate
        } else {
            if (imuIntervalRef.current) {
                clearInterval(imuIntervalRef.current);
                imuIntervalRef.current = null;
            }
            useIMUStore.getState().updateFromIMU({
                connected: false,
                connecting: false,
                accel: { x: 0, y: 0, z: 0 },
                gyro: { x: 0, y: 0, z: 0 },
                tremor: 0,
                kneeAngle: 0,
            });
        }
        return () => {
            if (imuIntervalRef.current) {
                clearInterval(imuIntervalRef.current);
            }
        };
    }, [simulateIMU]);

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
        <div id="test-mode-panel" className={`glass-panel ${hidden ? 'panel-hidden' : ''}`}>
            <button className="panel-hide-btn" onClick={() => setHidden(!hidden)} title={hidden ? 'Show panel' : 'Hide panel'}>
                {hidden ? '● ● ●' : 'hide'}
            </button>
            {!hidden && (
                <>
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
                    <div className="toggle-row">
                        <span className="toggle-label">Simulate IMU</span>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={simulateIMU}
                                onChange={(e) => setSimulateIMU(e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                </>
            )}
        </div>
    );
}
