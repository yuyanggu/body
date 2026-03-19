// ============================================================
// Test Mode — synthetic animated body for development
// ============================================================

import { videoWidth, videoHeight } from './pose-detection.js';

const TEST_POSE = [
    { x: 0.50, y: 0.15 },  // 0 nose
    { x: 0.48, y: 0.14 },  // 1 left_eye
    { x: 0.52, y: 0.14 },  // 2 right_eye
    { x: 0.45, y: 0.15 },  // 3 left_ear
    { x: 0.55, y: 0.15 },  // 4 right_ear
    { x: 0.38, y: 0.30 },  // 5 left_shoulder
    { x: 0.62, y: 0.30 },  // 6 right_shoulder
    { x: 0.32, y: 0.45 },  // 7 left_elbow
    { x: 0.68, y: 0.45 },  // 8 right_elbow
    { x: 0.30, y: 0.58 },  // 9 left_wrist
    { x: 0.70, y: 0.58 },  // 10 right_wrist
    { x: 0.42, y: 0.55 },  // 11 left_hip
    { x: 0.58, y: 0.55 },  // 12 right_hip
    { x: 0.41, y: 0.72 },  // 13 left_knee
    { x: 0.59, y: 0.72 },  // 14 right_knee
    { x: 0.40, y: 0.88 },  // 15 left_ankle
    { x: 0.60, y: 0.88 },  // 16 right_ankle
];

const TEST_ANIM = TEST_POSE.map((_, i) => ({
    ampX: 0.01 + Math.sin(i * 1.7) * 0.008,
    ampY: 0.005 + Math.cos(i * 2.3) * 0.005,
    freqX: 0.3 + i * 0.07,
    freqY: 0.4 + i * 0.05,
}));

export function generateTestKeypoints(t) {
    const keypoints = [];
    for (let i = 0; i < 17; i++) {
        const base = TEST_POSE[i];
        const anim = TEST_ANIM[i];
        keypoints.push({
            x: (base.x + Math.sin(t * anim.freqX) * anim.ampX) * videoWidth,
            y: (base.y + Math.sin(t * anim.freqY + i) * anim.ampY) * videoHeight,
            score: 1.0,
        });
    }
    return keypoints;
}
