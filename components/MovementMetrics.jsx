'use client';

import useBodyStore from '../stores/useBodyStore.js';

export default function MovementMetrics() {
    const velocity = useBodyStore((s) => s.globalVelocity);
    const range = useBodyStore((s) => s.globalRangeOfMotion);
    const jitter = useBodyStore((s) => s.globalJitter);

    return (
        <div id="movement-metrics">
            <div className="metric">
                <span>Motion</span>
                <div className="metric-bar">
                    <div className="metric-fill" style={{ width: `${velocity * 100}%` }}></div>
                </div>
            </div>
            <div className="metric">
                <span>Range</span>
                <div className="metric-bar">
                    <div className="metric-fill" style={{ width: `${range * 100}%` }}></div>
                </div>
            </div>
            <div className="metric">
                <span>Energy</span>
                <div className="metric-bar">
                    <div className="metric-fill" style={{ width: `${jitter * 100}%` }}></div>
                </div>
            </div>
        </div>
    );
}
