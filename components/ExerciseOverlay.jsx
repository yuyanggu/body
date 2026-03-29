'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAppStore from '../stores/useAppStore.js';
import useExerciseStore from '../stores/useExerciseStore.js';
import { EXERCISES } from '../lib/exercises.js';
import { connectSensor, disconnectSensor, autoConnect, getStoredSensorIP, getKnownIPs } from '../lib/imu-sensor.js';
import { imuState } from '../lib/imu-sensor.js';
import ApiKeyModal from './ApiKeyModal.jsx';

const VIDEO_ID = 'I8JUDhA6rXM';
const SPRING = { type: 'spring', stiffness: 200, damping: 28 };

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

    const [videoOpen, setVideoOpen] = useState(false);

    if (appMode !== 'select') return null;

    return (
        <div id="exercise-overlay">
            <div className="exercise-overlay-inner">
                <div className="exercise-overlay-title">Residual Motion</div>
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

            <AnimatePresence>
                {!videoOpen && (
                    <motion.div
                        className="video-card"
                        layoutId="video-player"
                        transition={SPRING}
                        onClick={() => setVideoOpen(true)}
                        style={{ overflow: 'visible' }}
                    >
                        <motion.img
                            className="video-card-thumb"
                            src={`https://img.youtube.com/vi/${VIDEO_ID}/mqdefault.jpg`}
                            alt="See how it works"
                            layoutId="video-thumb"
                            transition={SPRING}
                        />
                        <motion.div
                            className="video-card-label"
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.1 } }}
                        >
                            See how it works
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {videoOpen && (
                    <>
                        <motion.div
                            className="video-modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => setVideoOpen(false)}
                        />
                        <motion.div
                            className="video-modal-glass"
                            layoutId="video-player"
                            transition={SPRING}
                            onClick={(e) => e.stopPropagation()}
                            style={{ overflow: 'visible' }}
                        >
                            <motion.div
                                className="video-modal-close"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ delay: 0.15, duration: 0.2 }}
                                onClick={() => setVideoOpen(false)}
                            >
                                ✕
                            </motion.div>
                            <div className="video-modal-frame">
                                <motion.img
                                    className="video-card-thumb"
                                    src={`https://img.youtube.com/vi/${VIDEO_ID}/mqdefault.jpg`}
                                    alt=""
                                    layoutId="video-thumb"
                                    transition={SPRING}
                                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
                                />
                                <motion.iframe
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.35, duration: 0.3 }}
                                    src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&loop=1&playlist=${VIDEO_ID}&controls=0&modestbranding=1&rel=0&showinfo=0&vq=hd1080`}
                                    allow="autoplay; encrypted-media"
                                    allowFullScreen
                                    style={{ position: 'relative', zIndex: 1 }}
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
