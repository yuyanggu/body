'use client';

import { useState, useEffect, useRef } from 'react';
import useAppStore from '../stores/useAppStore.js';
import useExerciseStore from '../stores/useExerciseStore.js';
import { EXERCISES } from '../lib/exercises.js';
import { connectSensor, disconnectSensor, autoConnect, getStoredSensorIP, getKnownIPs } from '../lib/imu-sensor.js';
import { imuState } from '../lib/imu-sensor.js';
import ApiKeyModal from './ApiKeyModal.jsx';

export default function ExerciseOverlay({ exerciseAnalyzer, aiCompanion }) {
    const appMode = useAppStore((s) => s.appMode);
    const setAppMode = useAppStore((s) => s.setAppMode);
    const [sensorLabel, setSensorLabel] = useState('Connect Sensor');
    const autoConnectAttempted = useRef(false);

    // Auto-connect on mount if we have known IPs
    useEffect(() => {
        if (autoConnectAttempted.current) return;
        autoConnectAttempted.current = true;

        const ips = getKnownIPs();
        if (ips.length > 0) {
            setSensorLabel('Auto-connecting...');
            autoConnect().then((success) => {
                setSensorLabel(success ? 'Disconnect Sensor' : 'Connect Sensor');
            });
        }
    }, []);

    const handleExerciseClick = (exercise) => {
        setAppMode('exercise');
        exerciseAnalyzer.start(exercise);
        useExerciseStore.getState().updateFromState({
            exerciseName: exercise.name,
            repCount: 0,
            currentAngle: 0,
            formCue: '',
        }, false);
        if (aiCompanion?.hasKey) {
            aiCompanion.greet(exercise.name);
        }
    };

    const handleSensorClick = async () => {
        if (imuState.connected) {
            disconnectSensor();
            setSensorLabel('Connect Sensor');
        } else {
            // Try auto-connect first with known IPs
            setSensorLabel('Searching...');
            const found = await autoConnect();
            if (found) {
                setSensorLabel('Disconnect Sensor');
                return;
            }

            // Fallback: prompt for IP
            const storedIP = getStoredSensorIP();
            const ip = prompt(
                'Sensor not found at known IPs. Enter IP (check Arduino Serial Monitor):',
                storedIP || '192.168.1.'
            );
            if (!ip) {
                setSensorLabel('Connect Sensor');
                return;
            }

            setSensorLabel('Connecting...');
            try {
                await connectSensor(ip.trim());
                setSensorLabel('Disconnect Sensor');
            } catch (err) {
                setSensorLabel('Connect Sensor');
                console.warn('Sensor connection failed:', err);
            }
        }
    };

    if (appMode !== 'select') return null;

    return (
        <div id="exercise-overlay">
            <div className="exercise-overlay-inner">
                <div className="exercise-overlay-title">Choose Your Movement</div>
                <div className="exercise-overlay-subtitle">Select an exercise to begin your session</div>
                <div id="exercise-grid">
                    {EXERCISES.map((ex) => (
                        <div
                            key={ex.id}
                            className="exercise-card"
                            onClick={() => handleExerciseClick(ex)}
                        >
                            <div className="exercise-card-icon">{ex.icon}</div>
                            <div className="exercise-card-name">{ex.name}</div>
                            <div className="exercise-card-desc">{ex.description}</div>
                        </div>
                    ))}
                </div>
                <div className="exercise-overlay-footer">
                    <button className="control-button" onClick={handleSensorClick}>
                        <span>{sensorLabel}</span>
                    </button>
                    <ApiKeyModal aiCompanion={aiCompanion} />
                </div>
            </div>
        </div>
    );
}
