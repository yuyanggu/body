// ============================================================
// Constants & Configuration
// ============================================================

import * as THREE from 'three';

export const config = {
    paused: false,
    activePaletteIndex: 0,
    sensitivity: 0.4,
    appMode: 'select',
    testMode: new URLSearchParams(window.location.search).has('test'),
    showKeypoints: false,
    showDataOverlay: false,
};

export const CONFIDENCE_THRESHOLD = 0.3;
export const SMOOTHING_FACTOR = 0.65;
export const VELOCITY_HISTORY_LENGTH = 15;

export const WORLD_SCALE_X = 15;
export const WORLD_SCALE_Y = 12;
export const BODY_SCALE = 8.0;

export const colorPalettes = [
    [new THREE.Color(0x667eea), new THREE.Color(0x764ba2), new THREE.Color(0xf093fb), new THREE.Color(0x9d50bb), new THREE.Color(0x6e48aa)],
    [new THREE.Color(0xf857a6), new THREE.Color(0xff5858), new THREE.Color(0xfeca57), new THREE.Color(0xff6348), new THREE.Color(0xff9068)],
    [new THREE.Color(0x4facfe), new THREE.Color(0x00f2fe), new THREE.Color(0x43e97b), new THREE.Color(0x38f9d7), new THREE.Color(0x4484ce)],
];

export const PARTICLE_SIZE = 512;
export const SORT_PASSES_PER_FRAME = 18;
export const OPACITY_MAP_SIZE = 1024;
export const ORTHO_SIZE = 500;
export const SAMPLE_SIZE = 16;
