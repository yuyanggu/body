'use client';

import { useRef, useEffect, useCallback } from 'react';
import useBodyStore from '../stores/useBodyStore.js';
import useIMUStore from '../stores/useIMUStore.js';

// Ring buffer for rolling graph (~10 sec at 5Hz store updates)
const GRAPH_BUFFER_SIZE = 50;

function AngleGauge({ angle }) {
    // Arc gauge from 0-135 degrees
    const maxAngle = 135;
    const clamped = Math.min(angle, maxAngle);
    const radius = 28;
    const cx = 36;
    const cy = 38;

    // Arc starts at bottom-left (225°) sweeps to bottom-right (315°) = 90° visual arc
    // Map knee angle 0-135 to sweep 0-180°
    const startAngleRad = (Math.PI * 3) / 4; // 135° from right (bottom-left)
    const sweepFraction = clamped / maxAngle;
    const endAngleRad = startAngleRad + sweepFraction * Math.PI;

    const x1 = cx + radius * Math.cos(startAngleRad);
    const y1 = cy + radius * Math.sin(startAngleRad);
    const x2 = cx + radius * Math.cos(endAngleRad);
    const y2 = cy + radius * Math.sin(endAngleRad);

    const largeArc = sweepFraction > 0.5 ? 1 : 0;

    // Background arc (full range)
    const bgEndRad = startAngleRad + Math.PI;
    const bgX2 = cx + radius * Math.cos(bgEndRad);
    const bgY2 = cy + radius * Math.sin(bgEndRad);

    return (
        <div className="imu-angle-gauge">
            <svg width="72" height="48" viewBox="0 0 72 48">
                {/* Background arc */}
                <path
                    d={`M ${x1} ${y1} A ${radius} ${radius} 0 1 1 ${bgX2} ${bgY2}`}
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
                {/* Active arc */}
                {clamped > 0.5 && (
                    <path
                        d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
                        fill="none"
                        stroke="url(#angleGradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                )}
                <defs>
                    <linearGradient id="angleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#667eea" />
                        <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="imu-angle-value">
                <span className="imu-angle-number">{Math.round(angle)}</span>
                <span className="imu-angle-unit">°</span>
            </div>
        </div>
    );
}

function RollingGraph({ bufferRef }) {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const buf = bufferRef.current;
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        if (buf.length < 2) {
            rafRef.current = requestAnimationFrame(draw);
            return;
        }

        // Find range for auto-scaling
        let min = Infinity, max = -Infinity;
        for (let i = 0; i < buf.length; i++) {
            if (buf[i] < min) min = buf[i];
            if (buf[i] > max) max = buf[i];
        }
        // Ensure minimum range
        if (max - min < 5) {
            const mid = (max + min) / 2;
            min = mid - 2.5;
            max = mid + 2.5;
        }

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            const gy = (h / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(w, gy);
            ctx.stroke();
        }

        // Draw line
        ctx.beginPath();
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';

        const padding = 4;
        const drawH = h - padding * 2;

        for (let i = 0; i < buf.length; i++) {
            const x = (i / (GRAPH_BUFFER_SIZE - 1)) * w;
            const norm = (buf[i] - min) / (max - min);
            const y = padding + drawH * (1 - norm);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Glow effect
        ctx.strokeStyle = 'rgba(102, 126, 234, 0.3)';
        ctx.lineWidth = 4;
        ctx.stroke();

        rafRef.current = requestAnimationFrame(draw);
    }, [bufferRef]);

    useEffect(() => {
        rafRef.current = requestAnimationFrame(draw);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [draw]);

    return (
        <canvas
            ref={canvasRef}
            className="imu-rolling-graph"
            width={280}
            height={60}
        />
    );
}

export default function SensorHUD() {
    const velocity = useBodyStore((s) => s.globalVelocity);
    const range = useBodyStore((s) => s.globalRangeOfMotion);
    const jitter = useBodyStore((s) => s.globalJitter);

    const connected = useIMUStore((s) => s.connected);
    const accelX = useIMUStore((s) => s.accelX);
    const accelY = useIMUStore((s) => s.accelY);
    const accelZ = useIMUStore((s) => s.accelZ);
    const gyroX = useIMUStore((s) => s.gyroX);
    const gyroY = useIMUStore((s) => s.gyroY);
    const gyroZ = useIMUStore((s) => s.gyroZ);
    const tremor = useIMUStore((s) => s.tremor);
    const kneeAngle = useIMUStore((s) => s.kneeAngle);

    // Rolling graph buffer
    const angleBufferRef = useRef([]);

    // Push angle into buffer on each store update
    useEffect(() => {
        if (!connected) {
            angleBufferRef.current = [];
            return;
        }
        angleBufferRef.current.push(kneeAngle);
        if (angleBufferRef.current.length > GRAPH_BUFFER_SIZE) {
            angleBufferRef.current.shift();
        }
    }, [kneeAngle, connected]);

    // Tremor color: green → yellow → red
    const tremorColor = tremor < 0.33
        ? '#4ade80'
        : tremor < 0.66
            ? '#facc15'
            : '#ef4444';

    const fmt = (v) => (v >= 0 ? '+' : '') + v.toFixed(2);

    return (
        <div id="sensor-hud">
            {/* Body metrics — always visible */}
            <div className="sensor-hud-section">
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

            {/* IMU section — only when connected */}
            {connected && (
                <>
                    <div className="sensor-hud-divider"></div>

                    <div className="sensor-hud-section">
                        <div className="imu-header">
                            <span className="imu-dot"></span>
                            <span>KNEE IMU</span>
                        </div>

                        {/* Angle gauge + tremor */}
                        <div className="imu-main-row">
                            <AngleGauge angle={kneeAngle} />
                            <div className="imu-tremor-block">
                                <span className="imu-label">Tremor</span>
                                <div className="metric-bar imu-tremor-bar">
                                    <div
                                        className="metric-fill imu-tremor-fill"
                                        style={{
                                            width: `${tremor * 100}%`,
                                            background: tremorColor,
                                        }}
                                    ></div>
                                </div>
                                <span className="imu-tremor-value">{(tremor * 100).toFixed(0)}%</span>
                            </div>
                        </div>

                        {/* Raw data */}
                        <div className="imu-raw-grid">
                            <div className="imu-raw-col">
                                <span className="imu-raw-label">ACCEL</span>
                                <span className="imu-raw-val">{fmt(accelX)}</span>
                                <span className="imu-raw-val">{fmt(accelY)}</span>
                                <span className="imu-raw-val">{fmt(accelZ)}</span>
                            </div>
                            <div className="imu-raw-col">
                                <span className="imu-raw-label">GYRO</span>
                                <span className="imu-raw-val">{fmt(gyroX)}</span>
                                <span className="imu-raw-val">{fmt(gyroY)}</span>
                                <span className="imu-raw-val">{fmt(gyroZ)}</span>
                            </div>
                        </div>

                        {/* Rolling graph */}
                        <div className="imu-graph-section">
                            <span className="imu-label">Angle History</span>
                            <RollingGraph bufferRef={angleBufferRef} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
