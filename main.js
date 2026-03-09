// ============================================================
// Residual Motion — main.js
// Orchestrator: scene setup, starfield, animation loop, init
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { ExerciseAnalyzer } from './exercises.js';
import { AICompanion } from './ai-companion.js';
import { config } from './config.js';
import { ParticleSystem } from './particle-system.js';
import { KeypointSampler, createKeypointOverlay, updateKeypointOverlay } from './keypoint-sampler.js';
import { bodyState, processKeypoints, detectPose, setupCamera, setupPoseDetection } from './pose-detection.js';
import { generateTestKeypoints } from './test-mode.js';
import { setupUI, updateExerciseHUD, updateStatusUI } from './ui.js';
import { createDataOverlay, updateDataOverlay } from './data-overlay.js';

// ============================================================
// Instances
// ============================================================

const exerciseAnalyzer = new ExerciseAnalyzer();
const aiCompanion = new AICompanion();

// ============================================================
// Three.js Scene Setup
// ============================================================

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000);
camera.position.set(0, 0, 300);

const canvasElement = document.getElementById('neural-network-canvas');
const renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.6;
controls.minDistance = 50;
controls.maxDistance = 600;
controls.autoRotate = false;
controls.enablePan = false;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.2, 0.3);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// Light for shadow pass
const lightPosition = new THREE.Vector3(0, -200, 3000);

// ============================================================
// Starfield
// ============================================================

function createStarfield() {
    const N = 8000, pos = [], col = [], sz = [];
    for (let i = 0; i < N; i++) {
        const r = THREE.MathUtils.randFloat(200, 800);
        const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
        const th = THREE.MathUtils.randFloat(0, Math.PI * 2);
        pos.push(r * Math.sin(phi) * Math.cos(th), r * Math.sin(phi) * Math.sin(th), r * Math.cos(phi));
        const c = Math.random();
        col.push(...(c < .7 ? [1, 1, 1] : c < .85 ? [.7, .8, 1] : [1, .9, .8]));
        sz.push(THREE.MathUtils.randFloat(.1, .3));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('size', new THREE.Float32BufferAttribute(sz, 1));
    return new THREE.Points(g, new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `attribute float size;attribute vec3 color;varying vec3 vC;uniform float uTime;
            void main(){vC=color;vec4 mv=modelViewMatrix*vec4(position,1.);
            gl_PointSize=size*(sin(uTime*2.+position.x*100.)*.3+.7)*(300./-mv.z);
            gl_Position=projectionMatrix*mv;}`,
        fragmentShader: `varying vec3 vC;void main(){float d=length(gl_PointCoord-.5);
            if(d>.5)discard;gl_FragColor=vec4(vC,(1.-smoothstep(0.,.5,d))*.8);}`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
}
const starField = createStarfield();
scene.add(starField);

// Keypoint overlay
const keypointOverlay = createKeypointOverlay(scene);
const dataOverlayCanvas = createDataOverlay();

// ============================================================
// Animation Loop
// ============================================================

let particleSystem = null;
let keypointSampler = null;

const clock = new THREE.Clock();
let prevTime = 0;

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = Math.min(t - prevTime, .05);
    prevTime = t;

    // Pose detection or test mode
    if (config.testMode) {
        const testKps = generateTestKeypoints(t);
        processKeypoints(testKps);
    } else {
        detectPose();
    }

    updateKeypointOverlay(keypointOverlay, config, bodyState);

    // Presence fade
    if (bodyState.isTracking && bodyState.presence < 1) bodyState.presence = Math.min(1, bodyState.presence + .025);
    if (!bodyState.isTracking && bodyState.presence > 0) bodyState.presence = Math.max(0, bodyState.presence - .008);

    if (!config.paused && particleSystem && keypointSampler) {
        // Update keypoint sampler with current body data
        keypointSampler.update(bodyState);

        // Update GPU particle system
        const activity = Math.min(1.0, bodyState.globalVelocity + bodyState.globalJitter * 0.5);
        particleSystem.update(dt, t, keypointSampler, camera, lightPosition, activity);

        // Exercise analysis (during exercise mode)
        if (config.appMode === 'exercise' && bodyState.isTracking) {
            const exState = exerciseAnalyzer.update(bodyState);
            if (exState) {
                updateExerciseHUD(exState, aiCompanion);

                // AI companion update
                aiCompanion.update(exState, {
                    velocity: bodyState.globalVelocity,
                    jitter: bodyState.globalJitter,
                    rangeOfMotion: bodyState.globalRangeOfMotion,
                });
            }
        }
    }

    // Data overlay
    if (config.showDataOverlay) {
        updateDataOverlay(dataOverlayCanvas, bodyState, camera, t);
    } else {
        const dCtx = dataOverlayCanvas.getContext('2d');
        dCtx.clearRect(0, 0, dataOverlayCanvas.width, dataOverlayCanvas.height);
    }

    starField.rotation.y += .0002;
    starField.material.uniforms.uTime.value = t;
    controls.update();
    composer.render();

    if (Math.floor(t * 10) % 2 === 0) updateStatusUI();
}

// ============================================================
// Init
// ============================================================

async function init() {
    const overlay = document.getElementById('loading-overlay');
    const sub = overlay.querySelector('.loading-subtitle');

    setupUI({ exerciseAnalyzer, aiCompanion, controls, camera, renderer, composer, bloomPass });

    // Create GPU particle system
    particleSystem = new ParticleSystem(renderer);
    scene.add(particleSystem.mesh);

    // Create keypoint sampler
    keypointSampler = new KeypointSampler();

    if (config.testMode) {
        // Test mode: skip camera/pose setup
        sub.textContent = 'Test mode — synthetic body';
        bodyState.isTracking = true;
        bodyState.presence = 1.0;
        setTimeout(() => {
            overlay.classList.add('hidden');
            document.getElementById('exercise-overlay').classList.remove('hidden');
        }, 600);
    } else {
        try {
            sub.textContent = 'Starting camera...';
            await setupCamera();
            sub.textContent = 'Loading MoveNet model...';
            await setupPoseDetection();
            sub.textContent = 'Ready!';
            setTimeout(() => {
                overlay.classList.add('hidden');
                document.getElementById('exercise-overlay').classList.remove('hidden');
            }, 600);
        } catch (err) {
            console.error('Init error:', err);
            sub.textContent = `Error: ${err.message || 'Could not start camera or load model.'}`;
            setTimeout(() => overlay.classList.add('hidden'), 4000);
        }
    }
    animate();
}

init();
