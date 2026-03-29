'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { config } from '../lib/config.js';
import { ParticleSystem } from '../lib/particle-system.js';
import { KeypointSampler, RawKeypointSampler, createKeypointOverlay, updateKeypointOverlay } from '../lib/keypoint-sampler.js';
import { bodyState, processKeypoints, detectPose, setupCamera, setupPoseDetection } from '../lib/pose-detection.js';
import { generateTestKeypoints } from '../lib/test-mode.js';
import { createDataOverlay, updateDataOverlay } from '../lib/data-overlay.js';
import { imuState } from '../lib/imu-sensor.js';

import useAppStore from '../stores/useAppStore.js';
import useBodyStore from '../stores/useBodyStore.js';
import useIMUStore from '../stores/useIMUStore.js';
import useExerciseStore from '../stores/useExerciseStore.js';

function waitForTfGlobals(timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        if (typeof tf !== 'undefined' && typeof poseDetection !== 'undefined') {
            return resolve();
        }
        const start = Date.now();
        const check = setInterval(() => {
            if (typeof tf !== 'undefined' && typeof poseDetection !== 'undefined') {
                clearInterval(check);
                resolve();
            } else if (Date.now() - start > timeoutMs) {
                clearInterval(check);
                reject(new Error('TensorFlow.js script tags did not load in time'));
            }
        }, 100);
    });
}

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

export default function SceneCanvas({ exerciseAnalyzer, aiCompanion, enableExercises = true }) {
    const canvasRef = useRef(null);
    const sceneRef = useRef(null);
    const controlsRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const composerRef = useRef(null);
    const bloomPassRef = useRef(null);

    const getControls = useCallback(() => controlsRef.current, []);
    const getCamera = useCallback(() => cameraRef.current, []);
    const getRenderer = useCallback(() => rendererRef.current, []);
    const getComposer = useCallback(() => composerRef.current, []);
    const getBloomPass = useCallback(() => bloomPassRef.current, []);

    useEffect(() => {
        if (!canvasRef.current) return;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000);
        camera.position.set(0, 0, 300);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, powerPreference: 'high-performance' });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.rotateSpeed = 0.6;
        controls.minDistance = 50;
        controls.maxDistance = 600;
        controls.autoRotate = false;
        controls.enablePan = false;
        controlsRef.current = controls;

        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.54, 0.08, 0.32);
        composer.addPass(bloomPass);
        composer.addPass(new OutputPass());
        composerRef.current = composer;
        bloomPassRef.current = bloomPass;

        const lightPosition = new THREE.Vector3(0, -200, 3000);

        const starField = createStarfield();
        scene.add(starField);

        const keypointOverlay = createKeypointOverlay(scene);
        const dataOverlayCanvas = createDataOverlay();

        const particleSystemA = new ParticleSystem(renderer, 'a');
        let particleSystemB = new ParticleSystem(renderer, 'b');
        scene.add(particleSystemA.mesh);
        scene.add(particleSystemB.mesh);

        const keypointSamplerA = new KeypointSampler();
        const keypointSamplerB = new RawKeypointSampler();

        const clock = new THREE.Clock();
        let prevTime = 0;
        let animFrameId = null;

        function animate() {
            animFrameId = requestAnimationFrame(animate);
            const t = clock.getElapsedTime();
            const dt = Math.min(t - prevTime, .05);
            prevTime = t;

            if (config.testMode) {
                const testKps = generateTestKeypoints(t);
                processKeypoints(testKps);
            } else {
                detectPose();
            }

            updateKeypointOverlay(keypointOverlay, config, bodyState);

            if (bodyState.isTracking && bodyState.presence < 1) bodyState.presence = Math.min(1, bodyState.presence + .025);
            if (!bodyState.isTracking && bodyState.presence > 0) bodyState.presence = Math.max(0, bodyState.presence - .008);

            if (!config.paused) {
                keypointSamplerA.update(bodyState);
                keypointSamplerB.update(bodyState);

                const effectiveJitter = imuState.connected
                    ? bodyState.globalJitter * 0.3 + imuState.tremor * 0.7
                    : bodyState.globalJitter;
                if (imuState.connected) bodyState.globalJitter = effectiveJitter;

                const computedActivity = Math.min(1.0, bodyState.globalVelocity + effectiveJitter * 0.5);

                const activityA = activityOverrideA >= 0 ? activityOverrideA : computedActivity;
                particleSystemA.update(dt, t, keypointSamplerA, camera, lightPosition, activityA);

                const activityB = activityOverrideB >= 0 ? activityOverrideB : computedActivity;
                particleSystemB.update(dt, t, keypointSamplerB, camera, lightPosition, activityB);

                if (enableExercises && config.appMode === 'exercise' && bodyState.isTracking && exerciseAnalyzer) {
                    const exState = exerciseAnalyzer.update(bodyState);
                    if (exState) {
                        useExerciseStore.getState().updateFromState(exState, aiCompanion?.isSpeaking);

                        if (aiCompanion) {
                            aiCompanion.update(exState, {
                                velocity: bodyState.globalVelocity,
                                jitter: bodyState.globalJitter,
                                rangeOfMotion: bodyState.globalRangeOfMotion,
                                imuTremor: imuState.connected ? imuState.tremor : null,
                                imuKneeAngle: imuState.connected ? imuState.kneeAngle : null,
                            });
                        }
                    }
                }
            }

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

            if (Math.floor(t * 10) % 2 === 0) {
                useBodyStore.getState().updateMetrics(bodyState);
                // Only push real IMU state if the real sensor is connected,
                // otherwise simulated IMU data (from TestModePanel) would be overwritten
                if (imuState.connected) {
                    useIMUStore.getState().updateFromIMU(imuState);
                }
            }
        }

        async function init() {
            const setLoading = useAppStore.getState().setLoading;

            if (config.testMode) {
                setLoading(true, 'Test mode — synthetic body');
                bodyState.isTracking = true;
                bodyState.presence = 1.0;
                setTimeout(() => setLoading(false), 600);
            } else {
                try {
                    setLoading(true, 'Starting camera...');
                    await setupCamera();
                    setLoading(true, 'Loading pose detection...');
                    await waitForTfGlobals();
                    setLoading(true, 'Loading MoveNet model...');
                    await setupPoseDetection();
                    setLoading(true, 'Ready!');
                    setTimeout(() => setLoading(false), 600);
                } catch (err) {
                    console.error('Init error:', err);
                    setLoading(true, `Error: ${err.message || 'Could not start camera or load model.'}`);
                    setTimeout(() => setLoading(false), 4000);
                }
            }
            animate();
        }

        init();

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
            bloomPass.resolution.set(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        const handleResetCamera = () => controls.reset();
        window.addEventListener('reset-camera', handleResetCamera);

        let activityOverrideA = 0.3;
        let activityOverrideB = 0.3;

        function applyParticleParam(ps, overrideSetter, key, value) {
            const pu = ps.positionUniforms;
            const pm = ps.particleMaterial.uniforms;
            switch (key) {
                case 'speed': pu.speed.value = value; break;
                case 'dieSpeed': pu.dieSpeed.value = value; break;
                case 'curlSize': pu.curlSize.value = value; break;
                case 'attraction': pu.attraction.value = value; break;
                case 'radius': pu.radius.value = value; break;
                case 'pointSize': ps.pointSizeUniform.value = value; break;
                case 'windX': pu.wind.value.x = value; break;
                case 'windY': pu.wind.value.y = value; break;
                case 'windZ': pu.wind.value.z = value; break;
                case 'shadowDensity': pm.shadowDensity.value = value; break;
                case 'bodyActivity': overrideSetter(value); break;
                case 'gridSpacing': pu.gridSpacing.value = value; break;
                case 'sortEnabled': ps.particleSort.enabled = value; break;
                case 'shadowEnabled':
                    if (!value) pm.shadowDensity.value = 0;
                    break;
            }
        }

        const handleShaderParamA = (e) => {
            const { key, value } = e.detail;
            applyParticleParam(particleSystemA, (v) => { activityOverrideA = v; }, key, value);
        };
        const handleShaderParamB = (e) => {
            const { key, value } = e.detail;
            if (key === 'particleCount') {
                const newSize = value;
                if (newSize === particleSystemB.particleSize) return;
                scene.remove(particleSystemB.mesh);
                particleSystemB.dispose();
                particleSystemB = new ParticleSystem(renderer, 'b', newSize);
                scene.add(particleSystemB.mesh);
                return;
            }
            applyParticleParam(particleSystemB, (v) => { activityOverrideB = v; }, key, value);
        };

        const handleShaderParamScene = (e) => {
            const { key, value } = e.detail;
            switch (key) {
                case 'lightX': lightPosition.x = value; break;
                case 'lightY': lightPosition.y = value; break;
                case 'lightZ': lightPosition.z = value; break;
                case 'bloomStrength': bloomPass.strength = value; break;
                case 'bloomRadius': bloomPass.radius = value; break;
                case 'bloomThreshold': bloomPass.threshold = value; break;
                case 'bloomEnabled': bloomPass.enabled = value; break;
                case 'autoRotate': controls.autoRotate = value; break;
            }
        };

        window.addEventListener('shader-param-a', handleShaderParamA);
        window.addEventListener('shader-param-b', handleShaderParamB);
        window.addEventListener('shader-param-scene', handleShaderParamScene);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('reset-camera', handleResetCamera);
            window.removeEventListener('shader-param-a', handleShaderParamA);
            window.removeEventListener('shader-param-b', handleShaderParamB);
            window.removeEventListener('shader-param-scene', handleShaderParamScene);
            if (animFrameId) cancelAnimationFrame(animFrameId);
            renderer.dispose();
            if (dataOverlayCanvas && dataOverlayCanvas.parentNode) {
                dataOverlayCanvas.parentNode.removeChild(dataOverlayCanvas);
            }
        };
    }, []);

    return <canvas ref={canvasRef} id="neural-network-canvas" />;
}

export { createStarfield };
