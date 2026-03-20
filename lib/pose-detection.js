// ============================================================
// Pose Detection — camera, MoveNet, movement analysis
// ============================================================

import * as THREE from 'three';
import { config, CONFIDENCE_THRESHOLD, SMOOTHING_FACTOR, VELOCITY_HISTORY_LENGTH, WORLD_SCALE_X, WORLD_SCALE_Y } from './config.js';

// Video dimensions (updated when camera starts)
export let videoWidth = 640;
export let videoHeight = 480;

// Body tracking state
export const bodyState = {
    isTracking: false, presence: 0,
    globalJitter: 0, globalRangeOfMotion: 0, globalVelocity: 0,
    keypoints: Array.from({ length: 17 }, () => ({
        raw: { x: .5, y: .5 }, smoothed: { x: .5, y: .5 },
        position3D: new THREE.Vector3(), confidence: 0,
        velocity: 0, velocityHistory: [],
    })),
};

// Detector state
let detector = null;
let videoElement = null;
let isDetecting = false;

// ============================================================
// Keypoint → 3D Mapping
// ============================================================

function kpTo3D(nx, ny) {
    return new THREE.Vector3(
        -(nx * 2 - 1) * WORLD_SCALE_X,
        -(ny * 2 - 1) * WORLD_SCALE_Y,
        0
    );
}

// ============================================================
// Movement Analysis
// ============================================================

export function processKeypoints(raw) {
    let trackAny = false, totVel = 0, valid = 0;
    for (let i = 0; i < 17; i++) {
        const r = raw[i], kp = bodyState.keypoints[i];
        kp.confidence = r.score || 0;
        if (kp.confidence < CONFIDENCE_THRESHOLD) continue;
        trackAny = true;
        const nx = r.x / videoWidth, ny = r.y / videoHeight;
        kp.raw.x = nx; kp.raw.y = ny;
        const px = kp.smoothed.x, py = kp.smoothed.y;
        kp.smoothed.x = px * SMOOTHING_FACTOR + nx * (1 - SMOOTHING_FACTOR);
        kp.smoothed.y = py * SMOOTHING_FACTOR + ny * (1 - SMOOTHING_FACTOR);
        const dx = kp.smoothed.x - px, dy = kp.smoothed.y - py;
        kp.velocity = Math.sqrt(dx * dx + dy * dy) * 100;
        kp.velocityHistory.push(kp.velocity);
        if (kp.velocityHistory.length > VELOCITY_HISTORY_LENGTH) kp.velocityHistory.shift();
        kp.position3D = kpTo3D(kp.smoothed.x, kp.smoothed.y);
        totVel += kp.velocity; valid++;
    }
    bodyState.isTracking = trackAny;
    if (valid > 0) bodyState.globalVelocity = THREE.MathUtils.clamp(totVel / valid * config.sensitivity * .5, 0, 1);
    computeJitter(); computeRange();
}

function computeJitter() {
    let tot = 0, n = 0;
    for (const kp of bodyState.keypoints) {
        const h = kp.velocityHistory; if (h.length < 3) continue;
        const m = h.reduce((a, b) => a + b, 0) / h.length;
        tot += Math.sqrt(h.reduce((a, b) => a + (b - m) ** 2, 0) / h.length);
        n++;
    }
    if (n) bodyState.globalJitter = THREE.MathUtils.clamp(tot / n * config.sensitivity * .8, 0, 1);
}

function computeRange() {
    const ls = bodyState.keypoints[5], rs = bodyState.keypoints[6];
    if (ls.confidence < CONFIDENCE_THRESHOLD || rs.confidence < CONFIDENCE_THRESHOLD) return;
    const cx = (ls.smoothed.x + rs.smoothed.x) / 2, cy = (ls.smoothed.y + rs.smoothed.y) / 2;
    const sw = Math.sqrt((ls.smoothed.x - rs.smoothed.x) ** 2 + (ls.smoothed.y - rs.smoothed.y) ** 2);
    if (sw < .01) return;
    let mx = 0;
    for (const kp of bodyState.keypoints) {
        if (kp.confidence < CONFIDENCE_THRESHOLD) continue;
        const dx = kp.smoothed.x - cx, dy = kp.smoothed.y - cy;
        mx = Math.max(mx, Math.sqrt(dx * dx + dy * dy));
    }
    bodyState.globalRangeOfMotion = THREE.MathUtils.clamp(mx / (sw * 4) * config.sensitivity, 0, 1);
}

// ============================================================
// Camera & Pose Detection Setup
// ============================================================

export async function setupCamera() {
    videoElement = document.getElementById('webcam');
    const dv = document.getElementById('webcam-display');
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }, audio: false
    });
    videoElement.srcObject = stream; dv.srcObject = stream;
    return new Promise(r => {
        videoElement.onloadedmetadata = () => {
            videoWidth = videoElement.videoWidth; videoHeight = videoElement.videoHeight;
            videoElement.play(); dv.play(); r();
        };
    });
}

export async function setupPoseDetection() {
    if (typeof tf === 'undefined' || typeof poseDetection === 'undefined') {
        throw new Error('TensorFlow.js globals (tf, poseDetection) not loaded — check script tags');
    }
    await tf.ready();
    detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING, enableSmoothing: true }
    );
}

export async function detectPose() {
    if (isDetecting || !detector || !videoElement || videoElement.readyState < 2) return;
    isDetecting = true;
    try {
        const poses = await detector.estimatePoses(videoElement);
        if (poses.length > 0 && poses[0].keypoints) processKeypoints(poses[0].keypoints);
        else {
            bodyState.isTracking = false;
            bodyState.keypoints.forEach(kp => { kp.confidence *= .9; });
        }
    } catch (_) { /* silent */ }
    isDetecting = false;
}

export function hasDetector() { return !!detector; }
