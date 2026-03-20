'use client';

import { useRef, useEffect } from 'react';
import useBodyStore from '../stores/useBodyStore.js';
import useAppStore from '../stores/useAppStore.js';
import { hasDetector } from '../lib/pose-detection.js';
import { imuState } from '../lib/imu-sensor.js';

export default function WebcamPreview() {
    const isTracking = useBodyStore((s) => s.isTracking);
    const testMode = useAppStore((s) => s.testMode);

    const trackingLabel = isTracking ? 'Tracking' : (hasDetector() || testMode ? 'No body' : 'Loading...');

    return (
        <div id="webcam-preview" className="glass-panel">
            <video id="webcam-display" autoPlay playsInline muted></video>
            <div id="tracking-status">
                <span className={`status-dot ${isTracking ? 'tracking' : ''}`}></span>
                <span id="tracking-text">{trackingLabel}</span>
            </div>
            <SensorStatus />
        </div>
    );
}

function SensorStatus() {
    const isTracking = useBodyStore((s) => s.isTracking);

    return (
        <div id="sensor-status" className={imuState.connected ? '' : 'hidden'}>
            <span className={`status-dot ${imuState.connected ? 'tracking' : ''}`} id="sensor-dot"></span>
            <span id="sensor-text">IMU</span>
        </div>
    );
}
