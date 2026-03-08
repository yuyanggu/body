import test from 'node:test';
import assert from 'node:assert/strict';

import {
    computeAnatomicalMotionState,
    computeAtmosphereState,
} from '../visualization-metrics.js';

function makeKeypoint({ x = 0, y = 0, velocity = 0, confidence = 1 } = {}) {
    return {
        smoothed: { x, y },
        velocity,
        confidence,
    };
}

function makeFrame(overrides = {}) {
    const keypoints = Array.from({ length: 17 }, () => makeKeypoint());
    Object.entries(overrides).forEach(([idx, value]) => {
        keypoints[Number(idx)] = makeKeypoint(value);
    });
    return keypoints;
}

test('returns a cohesive silhouette when the torso is steady and limbs are quiet', () => {
    const keypoints = makeFrame({
        5: { x: 0.42, y: 0.28, velocity: 0.02 },
        6: { x: 0.58, y: 0.28, velocity: 0.02 },
        11: { x: 0.45, y: 0.55, velocity: 0.03 },
        12: { x: 0.55, y: 0.55, velocity: 0.03 },
        13: { x: 0.47, y: 0.76, velocity: 0.04 },
        14: { x: 0.53, y: 0.76, velocity: 0.04 },
        15: { x: 0.46, y: 0.93, velocity: 0.04 },
        16: { x: 0.54, y: 0.93, velocity: 0.04 },
    });

    const state = computeAnatomicalMotionState(keypoints, 0.3);

    assert.equal(state.hasTorso, true);
    assert.ok(state.silhouetteCohesion > 0.8);
    assert.ok(state.haloIntensity < 0.25);
    assert.ok(state.kneeEmphasis < 0.2);
});

test('pushes attention toward the knees when knee motion is dominant', () => {
    const keypoints = makeFrame({
        5: { x: 0.42, y: 0.28, velocity: 0.05 },
        6: { x: 0.58, y: 0.28, velocity: 0.05 },
        11: { x: 0.45, y: 0.55, velocity: 0.08 },
        12: { x: 0.55, y: 0.55, velocity: 0.08 },
        13: { x: 0.43, y: 0.77, velocity: 0.95 },
        14: { x: 0.57, y: 0.77, velocity: 0.85 },
        15: { x: 0.41, y: 0.94, velocity: 0.3 },
        16: { x: 0.59, y: 0.94, velocity: 0.3 },
    });

    const state = computeAnatomicalMotionState(keypoints, 0.3);

    assert.ok(state.kneeEmphasis > 0.65);
    assert.ok(state.haloIntensity > 0.35);
    assert.ok(state.limbActivity > 0.45);
});

test('falls back gracefully when the torso keypoints are not confidently tracked', () => {
    const keypoints = makeFrame({
        5: { confidence: 0.1 },
        6: { confidence: 0.1 },
        11: { confidence: 0.1 },
        12: { confidence: 0.1 },
    });

    const state = computeAnatomicalMotionState(keypoints, 0.3);

    assert.equal(state.hasTorso, false);
    assert.equal(state.silhouetteCohesion, 0.35);
    assert.equal(state.haloIntensity, 0);
    assert.equal(state.kneeEmphasis, 0);
});

test('degrades softly when only part of the torso is confidently tracked', () => {
    const keypoints = makeFrame({
        5: { x: 0.42, y: 0.28, velocity: 0.05, confidence: 1 },
        6: { x: 0.58, y: 0.28, velocity: 0.05, confidence: 1 },
        11: { x: 0.45, y: 0.55, velocity: 0.12, confidence: 1 },
        12: { x: 0.55, y: 0.55, velocity: 0.12, confidence: 0.15 },
        13: { x: 0.43, y: 0.77, velocity: 0.55, confidence: 1 },
        14: { x: 0.57, y: 0.77, velocity: 0.45, confidence: 1 },
    });

    const state = computeAnatomicalMotionState(keypoints, 0.3);

    assert.equal(state.hasTorso, true);
    assert.ok(state.silhouetteCohesion > 0.45);
    assert.ok(state.haloIntensity > 0.15);
    assert.ok(state.torsoStability > 0.5);
});

test('keeps the post stack restrained when the body is calm and cohesive', () => {
    const atmosphere = computeAtmosphereState({
        silhouetteCohesion: 0.9,
        haloIntensity: 0.1,
        kneeEmphasis: 0.05,
        limbActivity: 0.12,
    }, {
        velocity: 0.08,
        jitter: 0.1,
        rangeOfMotion: 0.18,
        presence: 0.95,
    });

    assert.ok(atmosphere.bloomStrength >= 0.55 && atmosphere.bloomStrength <= 0.9);
    assert.ok(atmosphere.afterimageDamp > 0.82);
    assert.ok(atmosphere.fogDensity > 0.0015);
    assert.ok(atmosphere.vignetteStrength > 0.15);
});

test('opens the atmosphere when motion and halo intensity rise', () => {
    const atmosphere = computeAtmosphereState({
        silhouetteCohesion: 0.45,
        haloIntensity: 0.75,
        kneeEmphasis: 0.8,
        limbActivity: 0.7,
    }, {
        velocity: 0.72,
        jitter: 0.55,
        rangeOfMotion: 0.8,
        presence: 1,
    });

    assert.ok(atmosphere.bloomStrength > 1.05);
    assert.ok(atmosphere.afterimageDamp < 0.82);
    assert.ok(atmosphere.fogDensity > 0.0025);
    assert.ok(atmosphere.vignetteStrength > 0.24);
});
