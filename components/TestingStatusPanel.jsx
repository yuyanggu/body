'use client';

import { useState, useEffect } from 'react';
import useBodyStore from '../stores/useBodyStore.js';
import useAppStore from '../stores/useAppStore.js';
import { hasDetector } from '../lib/pose-detection.js';
import { PARTICLE_SIZE } from '../lib/config.js';

export default function TestingStatusPanel() {
    const isTracking = useBodyStore((s) => s.isTracking);
    const testMode = useAppStore((s) => s.testMode);
    const [fps, setFps] = useState(0);

    useEffect(() => {
        let frameCount = 0;
        let lastTime = performance.now();
        let rafId;

        function countFrame() {
            frameCount++;
            const now = performance.now();
            if (now - lastTime >= 1000) {
                setFps(Math.round(frameCount / ((now - lastTime) / 1000)));
                frameCount = 0;
                lastTime = now;
            }
            rafId = requestAnimationFrame(countFrame);
        }
        rafId = requestAnimationFrame(countFrame);

        return () => cancelAnimationFrame(rafId);
    }, []);

    const cameraStatus = testMode ? 'Synthetic' : (hasDetector() ? 'Active' : 'Loading...');
    const particleCount = `${PARTICLE_SIZE}x${PARTICLE_SIZE} (${(PARTICLE_SIZE * PARTICLE_SIZE).toLocaleString()})`;

    return (
        <div id="testing-status" className="glass-panel">
            <div className="title">Testing</div>
            <div className="status-line">Camera: <span>{cameraStatus}</span></div>
            <div className="status-line">Tracking: <span>{isTracking ? 'Yes' : 'No'}</span></div>
            <div className="status-line">Particles: <span>{particleCount}</span></div>
            <div className="status-line">FPS: <span>{fps || '—'}</span></div>
        </div>
    );
}
