// ============================================================
// Residual Motion — main.js
// GPU particle swarm driven by body keypoints
// + Exercise analysis, AI companion, and voice feedback
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';

import { EXERCISES, ExerciseAnalyzer } from './exercises.js';
import { AICompanion } from './ai-companion.js';

// ============================================================
// 1. CONSTANTS & CONFIGURATION
// ============================================================

const config = {
    paused: false,
    activePaletteIndex: 0,
    sensitivity: 0.4,
    appMode: 'select',
    testMode: new URLSearchParams(window.location.search).has('test'),
};

const exerciseAnalyzer = new ExerciseAnalyzer();
const aiCompanion = new AICompanion();

const KEYPOINT_NAMES = [
    'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
    'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
];

const CONFIDENCE_THRESHOLD = 0.3;
const SMOOTHING_FACTOR = 0.65;
const VELOCITY_HISTORY_LENGTH = 15;

const WORLD_SCALE_X = 15;
const WORLD_SCALE_Y = 12;

// Body scale for particle system (maps ~30-unit body to ~240-unit swarm space)
const BODY_SCALE = 8.0;

// Palettes (kept for starfield only)
const colorPalettes = [
    [new THREE.Color(0x667eea), new THREE.Color(0x764ba2), new THREE.Color(0xf093fb), new THREE.Color(0x9d50bb), new THREE.Color(0x6e48aa)],
    [new THREE.Color(0xf857a6), new THREE.Color(0xff5858), new THREE.Color(0xfeca57), new THREE.Color(0xff6348), new THREE.Color(0xff9068)],
    [new THREE.Color(0x4facfe), new THREE.Color(0x00f2fe), new THREE.Color(0x43e97b), new THREE.Color(0x38f9d7), new THREE.Color(0x4484ce)],
];

// GPU particle system size
const PARTICLE_SIZE = 256; // 256x256 = 65536 particles
const SORT_PASSES_PER_FRAME = 6;
const OPACITY_MAP_SIZE = 1024;
const ORTHO_SIZE = 500;
const SAMPLE_SIZE = 8; // 8x8 = 64 keypoint sample slots

// ============================================================
// 2. SHADERS — ported from three-particle-swarm
// ============================================================

// --- 4D Simplex Noise with derivatives ---
const simplexNoise4GLSL = `
vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

float mod289(float x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
    return mod289(((x*34.0)+1.0)*x);
}

float permute(float x) {
    return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

float taylorInvSqrt(float r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

vec4 grad4(float j, vec4 ip) {
    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
    vec4 p,s;
    p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
    s = vec4(lessThan(p, vec4(0.0)));
    p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;
    return p;
}

#define F4 0.309016994374947451

vec4 simplexNoiseDerivatives (vec4 v) {
    const vec4  C = vec4( 0.138196601125011,0.276393202250021,0.414589803375032,-0.447213595499958);
    vec4 i  = floor(v + dot(v, vec4(F4)) );
    vec4 x0 = v -   i + dot(i, C.xxxx);
    vec4 i0;
    vec3 isX = step( x0.yzw, x0.xxx );
    vec3 isYZ = step( x0.zww, x0.yyz );
    i0.x = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
    i0.y += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;
    vec4 i3 = clamp( i0, 0.0, 1.0 );
    vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
    vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );
    vec4 x1 = x0 - i1 + C.xxxx;
    vec4 x2 = x0 - i2 + C.yyyy;
    vec4 x3 = x0 - i3 + C.zzzz;
    vec4 x4 = x0 + C.wwww;
    i = mod289(i);
    float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
    vec4 j1 = permute( permute( permute( permute (
             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));
    vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;
    vec4 p0 = grad4(j0,   ip);
    vec4 p1 = grad4(j1.x, ip);
    vec4 p2 = grad4(j1.y, ip);
    vec4 p3 = grad4(j1.z, ip);
    vec4 p4 = grad4(j1.w, ip);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    p4 *= taylorInvSqrt(dot(p4,p4));
    vec3 values0 = vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2));
    vec2 values1 = vec2(dot(p3, x3), dot(p4, x4));
    vec3 m0 = max(0.5 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
    vec2 m1 = max(0.5 - vec2(dot(x3,x3), dot(x4,x4)), 0.0);
    vec3 temp0 = -6.0 * m0 * m0 * values0;
    vec2 temp1 = -6.0 * m1 * m1 * values1;
    vec3 mmm0 = m0 * m0 * m0;
    vec2 mmm1 = m1 * m1 * m1;
    float dx = temp0[0] * x0.x + temp0[1] * x1.x + temp0[2] * x2.x + temp1[0] * x3.x + temp1[1] * x4.x + mmm0[0] * p0.x + mmm0[1] * p1.x + mmm0[2] * p2.x + mmm1[0] * p3.x + mmm1[1] * p4.x;
    float dy = temp0[0] * x0.y + temp0[1] * x1.y + temp0[2] * x2.y + temp1[0] * x3.y + temp1[1] * x4.y + mmm0[0] * p0.y + mmm0[1] * p1.y + mmm0[2] * p2.y + mmm1[0] * p3.y + mmm1[1] * p4.y;
    float dz = temp0[0] * x0.z + temp0[1] * x1.z + temp0[2] * x2.z + temp1[0] * x3.z + temp1[1] * x4.z + mmm0[0] * p0.z + mmm0[1] * p1.z + mmm0[2] * p2.z + mmm1[0] * p3.z + mmm1[1] * p4.z;
    float dw = temp0[0] * x0.w + temp0[1] * x1.w + temp0[2] * x2.w + temp1[0] * x3.w + temp1[1] * x4.w + mmm0[0] * p0.w + mmm0[1] * p1.w + mmm0[2] * p2.w + mmm1[0] * p3.w + mmm1[1] * p4.w;
    return vec4(dx, dy, dz, dw) * 49.0;
}

vec4 snoise4(vec4 v) {
    return simplexNoiseDerivatives(v);
}
`;

// --- Curl noise (3 octaves) ---
const curl4GLSL = simplexNoise4GLSL + `
vec3 curl( in vec3 p, in float noiseTime, in float persistence ) {
    vec4 xNoisePotentialDerivatives = vec4(0.0);
    vec4 yNoisePotentialDerivatives = vec4(0.0);
    vec4 zNoisePotentialDerivatives = vec4(0.0);
    for (int i = 0; i < 3; ++i) {
        float twoPowI = pow(2.0, float(i));
        float scale = 0.5 * twoPowI * pow(persistence, float(i));
        xNoisePotentialDerivatives += snoise4(vec4(p * twoPowI, noiseTime)) * scale;
        yNoisePotentialDerivatives += snoise4(vec4((p + vec3(123.4, 129845.6, -1239.1)) * twoPowI, noiseTime)) * scale;
        zNoisePotentialDerivatives += snoise4(vec4((p + vec3(-9519.0, 9051.0, -123.0)) * twoPowI, noiseTime)) * scale;
    }
    return vec3(
        zNoisePotentialDerivatives[1] - yNoisePotentialDerivatives[2],
        xNoisePotentialDerivatives[2] - zNoisePotentialDerivatives[0],
        yNoisePotentialDerivatives[0] - xNoisePotentialDerivatives[1]
    );
}
`;

// --- GPU Position compute shader ---
const positionShaderFrag = curl4GLSL + `
uniform sampler2D textureDefaultPosition;
uniform float time;
uniform float dt;
uniform float speed;
uniform float dieSpeed;
uniform float radius;
uniform float curlSize;
uniform float attraction;
uniform float initAnimation;
uniform sampler2D textureMeshPositions;
uniform sampler2D textureMeshVelocities;
uniform float meshSampleSize;
uniform vec3 wind;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 positionInfo = texture2D(texturePosition, uv);
    vec3 position = mix(vec3(0.0, -200.0, 0.0), positionInfo.xyz, smoothstep(0.0, 0.3, initAnimation));
    float life = positionInfo.a - dieSpeed * dt;

    float hashVal = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
    vec2 meshUV = vec2(fract(hashVal * 127.1), fract(hashVal * 311.7));
    meshUV = (floor(meshUV * meshSampleSize) + 0.5) / meshSampleSize;

    vec4 meshPos = texture2D(textureMeshPositions, meshUV);
    vec4 meshVel = texture2D(textureMeshVelocities, meshUV);

    vec3 followPosition = mix(vec3(0.0, -(1.0 - initAnimation) * 200.0, 0.0), meshPos.xyz, smoothstep(0.2, 0.7, initAnimation));

    if (life < 0.0) {
        positionInfo = texture2D(textureDefaultPosition, uv);
        vec3 spawnOffset = positionInfo.xyz * 3.0;
        position = followPosition + spawnOffset;
        life = 0.5 + fract(positionInfo.w * 21.4131 + time);
    } else {
        vec3 toTarget = followPosition - position;
        position += toTarget * (0.005 + life * 0.015) * attraction * (1.0 - smoothstep(50.0, 350.0, length(toTarget))) * speed * dt;

        float drift = 1.0 - life;
        vec3 curlNoise = curl(position * curlSize, time, 0.1);
        position += (wind + curlNoise * speed) * drift * dt;
    }

    gl_FragColor = vec4(position, life);
}
`;

// --- Particle rendering vertex shader ---
const particlesVertGLSL = `
precision highp float;
#include <common>
uniform sampler2D texturePosition;
uniform sampler2D textureSortKey;
uniform float useSortKey;
uniform float pointSize;
uniform vec2 sortResolution;
uniform mat4 lightViewMatrix;
uniform mat4 lightProjectionMatrix;

varying float vLife;
varying float vColorIndex;
varying vec4 vLightSpacePos;

void main() {
    vec2 posUV = position.xy;

    if (useSortKey > 0.5) {
        vec4 sortData = texture2D(textureSortKey, position.xy);
        float originalIndex = sortData.g;
        posUV = vec2(
            (mod(originalIndex, sortResolution.x) + 0.5) / sortResolution.x,
            (floor(originalIndex / sortResolution.x) + 0.5) / sortResolution.y
        );
    }

    vec4 positionInfo = texture2D(texturePosition, posUV);
    vec4 worldPosition = modelMatrix * vec4(positionInfo.xyz, 1.0);
    vec4 mvPosition = viewMatrix * worldPosition;

    vLife = positionInfo.w;
    vColorIndex = fract(posUV.x * 431.0 + posUV.y * 7697.0);

    float sizeRand = 0.1 + 0.6 * fract(sin(dot(posUV, vec2(53.127, 97.863))) * 43758.5453);
    gl_PointSize = pointSize * sizeRand / length(mvPosition.xyz) * smoothstep(0.0, 0.2, positionInfo.w);

    vLightSpacePos = lightProjectionMatrix * lightViewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;
}
`;

// --- Particle rendering fragment shader ---
const particlesFragGLSL = `
precision highp float;
#include <common>

varying float vLife;
varying float vColorIndex;
varying vec4 vLightSpacePos;

uniform vec3 lightDirection;
uniform sampler2D opacityTexture;
uniform float shadowDensity;

void main() {
    vec2 coord = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(coord, coord);
    if (r2 > 1.0) discard;

    vec3 normal = vec3(coord, sqrt(1.0 - r2));
    vec3 lightDir = normalize(lightDirection);

    float diffuse = max(dot(normal, lightDir), 0.0);

    vec3 viewDir = vec3(1.0, -1.0, 1.0);
    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(dot(normal, halfDir), 0.0), 32.0);

    vec3 palette[4];
    palette[0] = vec3(1.3, 0.15, 0.6);
    palette[1] = vec3(0.6, 0.15, 1.3);
    palette[2] = vec3(0.15, 0.4, 1.4);
    palette[3] = vec3(1.0, 0.3, 1.2);

    int idx = int(floor(vColorIndex * 5.0));
    vec3 baseColor = palette[idx];
    vec3 litColor = baseColor * (0.7 + 0.3 * diffuse) + vec3(0.3) * specular;

    vec2 lightUV = vLightSpacePos.xy / vLightSpacePos.w * 0.5 + 0.5;
    float opacity = 0.0;
    if (lightUV.x >= 0.0 && lightUV.x <= 1.0 && lightUV.y >= 0.0 && lightUV.y <= 1.0) {
        opacity = texture2D(opacityTexture, lightUV).r;
    }

    float shadow = exp(-opacity * shadowDensity);
    vec3 shadowColor = mix(baseColor, vec3(0., 0., 0.01), 0.99);
    vec3 outgoingLight = mix(shadowColor, litColor, shadow);

    gl_FragColor = vec4(outgoingLight, 1.0);
}
`;

// --- Sort key compute shader ---
const sortKeyFragGLSL = `
precision highp float;
precision highp int;

uniform sampler2D texturePosition;
uniform vec3 halfVector;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec4 positionInfo = texture2D(texturePosition, uv);
    float projectedDistance = dot(halfVector, positionInfo.xyz);
    float index = gl_FragCoord.y * resolution.x + gl_FragCoord.x;
    gl_FragColor = vec4(projectedDistance, index, 0.0, positionInfo.w);
}
`;

// --- Bitonic sort shader ---
const bitonicSortFragGLSL = `
precision highp float;
precision highp int;

uniform sampler2D textureSortKey;
uniform int u_pass;
uniform int u_stage;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    float index1D = floor(gl_FragCoord.y) * resolution.x + floor(gl_FragCoord.x);
    int selfIndex = int(index1D);

    int blockSize = 1;
    for (int i = 0; i < 20; i++) {
        if (i >= u_pass) break;
        blockSize *= 2;
    }
    int partnerIndex = selfIndex ^ blockSize;

    vec2 partnerCoord = vec2(
        mod(float(partnerIndex), resolution.x),
        floor(float(partnerIndex) / resolution.x)
    );
    vec2 partnerUV = (partnerCoord + 0.5) / resolution;

    vec4 selfKey = texture2D(textureSortKey, uv);
    vec4 partnerKey = texture2D(textureSortKey, partnerUV);

    int dirBlockSize = 1;
    for (int i = 0; i < 20; i++) {
        if (i >= u_stage + 1) break;
        dirBlockSize *= 2;
    }
    bool ascending = ((selfIndex / dirBlockSize) & 1) == 0;

    bool isSmaller = selfKey.r < partnerKey.r;
    bool swap;
    if (selfIndex < partnerIndex) {
        swap = ascending ? !isSmaller : isSmaller;
    } else {
        swap = ascending ? isSmaller : !isSmaller;
    }

    gl_FragColor = swap ? partnerKey : selfKey;
}
`;

// --- Opacity/shadow pass vertex shader ---
const opacityVertGLSL = `
precision highp float;

uniform sampler2D texturePosition;
uniform sampler2D textureSortKey;
uniform float useSortKey;
uniform vec2 sortResolution;
uniform mat4 lightViewMatrix;
uniform mat4 lightProjectionMatrix;
uniform float pointSize;
uniform float opacityPointScale;

varying float vLife;

void main() {
    vec2 posUV = position.xy;

    if (useSortKey > 0.5) {
        vec4 sortData = texture2D(textureSortKey, position.xy);
        float originalIndex = sortData.g;
        posUV = vec2(
            (mod(originalIndex, sortResolution.x) + 0.5) / sortResolution.x,
            (floor(originalIndex / sortResolution.x) + 0.5) / sortResolution.y
        );
    }

    vec4 positionInfo = texture2D(texturePosition, posUV);
    vLife = positionInfo.w;

    vec4 lightSpacePos = lightProjectionMatrix * lightViewMatrix * vec4(positionInfo.xyz, 1.0);

    float sizeRand = 0.1 + 0.6 * fract(sin(dot(posUV, vec2(53.127, 97.863))) * 43758.5453);
    gl_PointSize = pointSize * sizeRand * opacityPointScale * smoothstep(0.0, 0.2, positionInfo.w);

    gl_Position = lightSpacePos;
}
`;

// --- Opacity/shadow pass fragment shader ---
const opacityFragGLSL = `
precision highp float;

varying float vLife;

void main() {
    vec2 coord = gl_PointCoord * 2.0 - 1.0;
    if (dot(coord, coord) > 1.0) discard;

    float alpha = (1.0 - dot(coord, coord)) * smoothstep(0.0, 0.5, vLife);
    gl_FragColor = vec4(alpha * 0.15, 0.0, 0.0, 1.0);
}
`;

// ============================================================
// 3. THREE.JS SCENE SETUP
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
// 4. STARFIELD
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

// ============================================================
// 5. BODY TRACKING STATE
// ============================================================

let videoWidth = 640, videoHeight = 480;

const bodyState = {
    isTracking: false, presence: 0,
    globalJitter: 0, globalRangeOfMotion: 0, globalVelocity: 0,
    keypoints: Array.from({ length: 17 }, () => ({
        raw: { x: .5, y: .5 }, smoothed: { x: .5, y: .5 },
        position3D: new THREE.Vector3(), confidence: 0,
        velocity: 0, velocityHistory: [],
    })),
};

// ============================================================
// 6. KEYPOINT SAMPLER — replaces MeshSurfaceSampler
// ============================================================

// Skeleton connections for interpolation
const SKELETON_CONNECTIONS = [
    [0, 1], [0, 2], [1, 3], [2, 4],
    [5, 6],
    [5, 7], [7, 9], [6, 8], [8, 10],
    [5, 11], [6, 12], [11, 12],
    [11, 13], [13, 15], [12, 14], [14, 16],
];

class KeypointSampler {
    constructor() {
        this.size = SAMPLE_SIZE;
        const total = SAMPLE_SIZE * SAMPLE_SIZE; // 64 slots

        // Position texture (RGBA float)
        const posData = new Float32Array(total * 4);
        this.positionTexture = new THREE.DataTexture(posData, SAMPLE_SIZE, SAMPLE_SIZE, THREE.RGBAFormat, THREE.FloatType);
        this.positionTexture.needsUpdate = true;

        // Velocity texture (RGBA float)
        const velData = new Float32Array(total * 4);
        this.velocityTexture = new THREE.DataTexture(velData, SAMPLE_SIZE, SAMPLE_SIZE, THREE.RGBAFormat, THREE.FloatType);
        this.velocityTexture.needsUpdate = true;

        // Previous positions for velocity computation
        this.prevPositions = new Float32Array(total * 3);
    }

    update(bodyState) {
        const posData = this.positionTexture.image.data;
        const velData = this.velocityTexture.image.data;
        const points = [];

        // 17 primary keypoints
        for (let i = 0; i < 17; i++) {
            const kp = bodyState.keypoints[i];
            if (kp.confidence >= CONFIDENCE_THRESHOLD) {
                points.push({
                    x: kp.position3D.x * BODY_SCALE,
                    y: kp.position3D.y * BODY_SCALE,
                    z: kp.position3D.z * BODY_SCALE,
                });
            } else {
                points.push({ x: 0, y: -200, z: 0 }); // off-screen
            }
        }

        // Bone midpoints (~16 bones → 16 midpoints)
        for (const [a, b] of SKELETON_CONNECTIONS) {
            const kpA = bodyState.keypoints[a], kpB = bodyState.keypoints[b];
            if (kpA.confidence >= CONFIDENCE_THRESHOLD && kpB.confidence >= CONFIDENCE_THRESHOLD) {
                points.push({
                    x: (kpA.position3D.x + kpB.position3D.x) * 0.5 * BODY_SCALE,
                    y: (kpA.position3D.y + kpB.position3D.y) * 0.5 * BODY_SCALE,
                    z: (kpA.position3D.z + kpB.position3D.z) * 0.5 * BODY_SCALE,
                });
            } else {
                points.push({ x: 0, y: -200, z: 0 });
            }
        }

        // Torso grid (4x4 = 16 points)
        const ls = bodyState.keypoints[5], rs = bodyState.keypoints[6];
        const lh = bodyState.keypoints[11], rh = bodyState.keypoints[12];
        const hasTorso = ls.confidence >= CONFIDENCE_THRESHOLD &&
            rs.confidence >= CONFIDENCE_THRESHOLD &&
            lh.confidence >= CONFIDENCE_THRESHOLD &&
            rh.confidence >= CONFIDENCE_THRESHOLD;

        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (hasTorso) {
                    const u = (col + 0.5) / 4;
                    const v = (row + 0.5) / 4;
                    const topX = ls.position3D.x + (rs.position3D.x - ls.position3D.x) * u;
                    const topY = ls.position3D.y + (rs.position3D.y - ls.position3D.y) * u;
                    const topZ = ls.position3D.z + (rs.position3D.z - ls.position3D.z) * u;
                    const botX = lh.position3D.x + (rh.position3D.x - lh.position3D.x) * u;
                    const botY = lh.position3D.y + (rh.position3D.y - lh.position3D.y) * u;
                    const botZ = lh.position3D.z + (rh.position3D.z - lh.position3D.z) * u;
                    points.push({
                        x: (topX + (botX - topX) * v) * BODY_SCALE,
                        y: (topY + (botY - topY) * v) * BODY_SCALE,
                        z: (topZ + (botZ - topZ) * v) * BODY_SCALE,
                    });
                } else {
                    points.push({ x: 0, y: -200, z: 0 });
                }
            }
        }

        // Fill remaining slots (up to 64) with duplicates of primary keypoints
        const totalSlots = SAMPLE_SIZE * SAMPLE_SIZE;
        while (points.length < totalSlots) {
            const src = points[points.length % 17];
            points.push({ x: src.x, y: src.y, z: src.z });
        }

        // Write to textures
        for (let i = 0; i < totalSlots; i++) {
            const p = points[i];
            const i4 = i * 4;
            const i3 = i * 3;

            posData[i4] = p.x;
            posData[i4 + 1] = p.y;
            posData[i4 + 2] = p.z;
            posData[i4 + 3] = 1.0;

            // Velocity = current - previous
            velData[i4] = p.x - this.prevPositions[i3];
            velData[i4 + 1] = p.y - this.prevPositions[i3 + 1];
            velData[i4 + 2] = p.z - this.prevPositions[i3 + 2];
            velData[i4 + 3] = 0.0;

            this.prevPositions[i3] = p.x;
            this.prevPositions[i3 + 1] = p.y;
            this.prevPositions[i3 + 2] = p.z;
        }

        this.positionTexture.needsUpdate = true;
        this.velocityTexture.needsUpdate = true;
    }
}

// ============================================================
// 7. OPACITY PASS — shadow accumulation from light POV
// ============================================================

class OpacityPass {
    constructor(renderer, particleGeometry, size, pointSizeUniform) {
        this.renderer = renderer;

        this.lightCamera = new THREE.OrthographicCamera(
            -ORTHO_SIZE, ORTHO_SIZE, ORTHO_SIZE, -ORTHO_SIZE, 1, 3000
        );
        this.lightCamera.position.set(0, -100, 800);
        this.lightCamera.updateMatrixWorld();
        this.lightCamera.updateProjectionMatrix();

        this.renderTarget = new THREE.WebGLRenderTarget(
            OPACITY_MAP_SIZE, OPACITY_MAP_SIZE, {
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                format: THREE.RGBAFormat,
                type: THREE.HalfFloatType,
            }
        );

        const fovRad = (50 * Math.PI) / 180;
        const opacityPointScale = (Math.tan(fovRad / 2) * OPACITY_MAP_SIZE) / (1000 * ORTHO_SIZE);

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                texturePosition: { value: null },
                textureSortKey: { value: null },
                useSortKey: { value: 1.0 },
                sortResolution: { value: new THREE.Vector2(size, size) },
                lightViewMatrix: { value: this.lightCamera.matrixWorldInverse.clone() },
                lightProjectionMatrix: { value: this.lightCamera.projectionMatrix.clone() },
                pointSize: pointSizeUniform,
                opacityPointScale: { value: opacityPointScale },
            },
            vertexShader: opacityVertGLSL,
            fragmentShader: opacityFragGLSL,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.OneFactor,
            blendDst: THREE.OneFactor,
        });

        this.mesh = new THREE.Points(particleGeometry, this.material);
        this.mesh.frustumCulled = false;

        this.scene = new THREE.Scene();
        this.scene.add(this.mesh);
    }

    update(positionTexture, sortTexture, lightPos, sortEnabled = true) {
        this.lightCamera.position.copy(lightPos);
        this.lightCamera.lookAt(0, 0, 0);
        this.lightCamera.updateMatrixWorld();

        this.material.uniforms.texturePosition.value = positionTexture;
        this.material.uniforms.textureSortKey.value = sortTexture;
        this.material.uniforms.useSortKey.value = sortEnabled ? 1.0 : 0.0;
        this.material.uniforms.lightViewMatrix.value.copy(this.lightCamera.matrixWorldInverse);
        this.material.uniforms.lightProjectionMatrix.value.copy(this.lightCamera.projectionMatrix);

        const prevRT = this.renderer.getRenderTarget();
        const prevColor = this.renderer.getClearColor(new THREE.Color());
        const prevAlpha = this.renderer.getClearAlpha();

        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.clear();
        this.renderer.render(this.scene, this.lightCamera);

        this.renderer.setRenderTarget(prevRT);
        this.renderer.setClearColor(prevColor, prevAlpha);
    }

    getOpacityTexture() { return this.renderTarget.texture; }
    getLightCamera() { return this.lightCamera; }
}

// ============================================================
// 8. PARTICLE SORT — GPU bitonic sort for depth-correct blending
// ============================================================

class ParticleSort {
    constructor(renderer, size) {
        this.renderer = renderer;
        this.size = size;
        this.enabled = true;

        this.sortN = 1;
        while (this.sortN < size * size) this.sortN *= 2;
        this.totalStages = Math.log2(this.sortN);

        this.currentStage = 0;
        this.currentPass = 0;
        this.sortComplete = false;
        this.prevHalfVector = new THREE.Vector3();
        this.halfVector = new THREE.Vector3();

        this._initGPUCompute();
    }

    _initGPUCompute() {
        this.gpuCompute = new GPUComputationRenderer(this.size, this.size, this.renderer);

        const initialTexture = this.gpuCompute.createTexture();
        const data = initialTexture.image.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 0.0;
            data[i + 1] = i / 4;
            data[i + 2] = 0.0;
            data[i + 3] = 1.0;
        }

        this.sortKeyVariable = this.gpuCompute.addVariable('textureSortKey', sortKeyFragGLSL, initialTexture);
        this.sortKeyVariable.wrapS = THREE.ClampToEdgeWrapping;
        this.sortKeyVariable.wrapT = THREE.ClampToEdgeWrapping;

        this.sortKeyUniforms = this.sortKeyVariable.material.uniforms;
        this.sortKeyUniforms.texturePosition = { value: null };
        this.sortKeyUniforms.halfVector = { value: new THREE.Vector3(0, 0, 1) };

        this.gpuCompute.setVariableDependencies(this.sortKeyVariable, [this.sortKeyVariable]);

        const error = this.gpuCompute.init();
        if (error !== null) {
            console.warn('ParticleSort not supported, disabling:', error);
            this.enabled = false;
            return;
        }

        this.sortPassThrough = this.gpuCompute.createShaderMaterial(bitonicSortFragGLSL, {
            u_pass: { value: 0 },
            u_stage: { value: 0 },
        });
    }

    _computeHalfVector(camera, lightPos) {
        const viewDir = new THREE.Vector3();
        camera.getWorldDirection(viewDir);
        const lightDir = lightPos.clone().normalize();
        this.halfVector.copy(lightDir).add(viewDir).normalize();

        if (this.prevHalfVector.lengthSq() > 0) {
            const dot = this.halfVector.dot(this.prevHalfVector);
            if (dot < 0) this.halfVector.negate();
            if (dot < 0.5) this._restartSort();
        }
        this.prevHalfVector.copy(this.halfVector);
    }

    _restartSort() {
        this.currentStage = 0;
        this.currentPass = 0;
        this.sortComplete = false;
    }

    update(positionTexture, camera, lightPos) {
        if (!this.enabled) return;

        this._computeHalfVector(camera, lightPos);

        this.sortKeyUniforms.texturePosition.value = positionTexture;
        this.sortKeyUniforms.halfVector.value.copy(this.halfVector);

        this.sortKeyVariable.material.fragmentShader = sortKeyFragGLSL;
        this.sortKeyVariable.material.needsUpdate = true;
        this.gpuCompute.compute();

        if (!this.sortComplete) this._runSortPasses();
    }

    _runSortPasses() {
        let passesThisFrame = 0;
        while (passesThisFrame < SORT_PASSES_PER_FRAME && !this.sortComplete) {
            this.sortPassThrough.uniforms.u_stage.value = this.currentStage;
            this.sortPassThrough.uniforms.u_pass.value = this.currentPass;

            const currentRT = this.gpuCompute.getCurrentRenderTarget(this.sortKeyVariable);
            const alternateRT = this.gpuCompute.getAlternateRenderTarget(this.sortKeyVariable);

            this.sortPassThrough.uniforms.textureSortKey = { value: currentRT.texture };
            this.gpuCompute.doRenderTarget(this.sortPassThrough, alternateRT);
            this.sortKeyVariable.renderTargets.reverse();

            passesThisFrame++;
            this.currentPass--;
            if (this.currentPass < 0) {
                this.currentStage++;
                if (this.currentStage >= this.totalStages) {
                    this.sortComplete = true;
                } else {
                    this.currentPass = this.currentStage;
                }
            }
        }
    }

    getSortTexture() {
        if (!this.enabled) return null;
        return this.gpuCompute.getCurrentRenderTarget(this.sortKeyVariable).texture;
    }
}

// ============================================================
// 9. PARTICLE SYSTEM — GPU-computed 65K particles
// ============================================================

class ParticleSystem {
    constructor(renderer) {
        this.renderer = renderer;
        this.gpuCompute = new GPUComputationRenderer(PARTICLE_SIZE, PARTICLE_SIZE, renderer);

        const defaultPositionTexture = this.gpuCompute.createTexture();
        this._fillPositionTexture(defaultPositionTexture);

        this.positionVariable = this.gpuCompute.addVariable('texturePosition', positionShaderFrag, defaultPositionTexture);
        this.positionVariable.wrapS = THREE.RepeatWrapping;
        this.positionVariable.wrapT = THREE.RepeatWrapping;

        this.positionUniforms = this.positionVariable.material.uniforms;
        this.positionUniforms.time = { value: 0.0 };
        this.positionUniforms.speed = { value: 2.0 };
        this.positionUniforms.dieSpeed = { value: 0.01 };
        this.positionUniforms.radius = { value: 90.0 };
        this.positionUniforms.curlSize = { value: 0.0175 };
        this.positionUniforms.attraction = { value: 3.5 };
        this.positionUniforms.initAnimation = { value: 0.0 };
        this.positionUniforms.textureMeshPositions = { value: null };
        this.positionUniforms.textureMeshVelocities = { value: null };
        this.positionUniforms.meshSampleSize = { value: SAMPLE_SIZE };
        this.positionUniforms.dt = { value: 0.016 };
        this.positionUniforms.wind = { value: new THREE.Vector3(-4, 0.0, -1.0) };
        this.positionUniforms.textureDefaultPosition = { value: defaultPositionTexture };

        this.gpuCompute.setVariableDependencies(this.positionVariable, [this.positionVariable]);

        const error = this.gpuCompute.init();
        if (error !== null) console.error('GPUComputationRenderer init error:', error);

        this.mesh = this._createParticleMesh();
        this.particleSort = new ParticleSort(renderer, PARTICLE_SIZE);
        this.opacityPass = new OpacityPass(renderer, this.mesh.geometry, PARTICLE_SIZE, this.pointSizeUniform);
    }

    _fillPositionTexture(texture) {
        const data = texture.image.data;
        for (let i = 0; i < data.length; i += 4) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = Math.cbrt(Math.random());
            data[i] = r * Math.sin(phi) * Math.cos(theta);
            data[i + 1] = r * Math.sin(phi) * Math.sin(theta);
            data[i + 2] = r * Math.cos(phi);
            data[i + 3] = Math.random();
        }
    }

    _createParticleMesh() {
        const geometry = new THREE.BufferGeometry();
        const count = PARTICLE_SIZE * PARTICLE_SIZE;
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (i % PARTICLE_SIZE) / PARTICLE_SIZE;
            positions[i * 3 + 1] = Math.floor(i / PARTICLE_SIZE) / PARTICLE_SIZE;
            positions[i * 3 + 2] = 0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        this.pointSizeUniform = { value: 10000.0 };

        const material = new THREE.ShaderMaterial({
            uniforms: {
                texturePosition: { value: null },
                textureSortKey: { value: null },
                opacityTexture: { value: null },
                useSortKey: { value: 1.0 },
                pointSize: this.pointSizeUniform,
                sortResolution: { value: new THREE.Vector2(PARTICLE_SIZE, PARTICLE_SIZE) },
                lightDirection: { value: new THREE.Vector3(0.5, 0.8, 1.0) },
                lightViewMatrix: { value: new THREE.Matrix4() },
                lightProjectionMatrix: { value: new THREE.Matrix4() },
                shadowDensity: { value: 2.0 },
            },
            vertexShader: particlesVertGLSL,
            fragmentShader: particlesFragGLSL,
            transparent: false,
            blending: THREE.NoBlending,
            depthWrite: false,
        });

        this.particleMaterial = material;

        const mesh = new THREE.Points(geometry, material);
        mesh.frustumCulled = false;
        return mesh;
    }

    update(delta, elapsed, keypointSampler, camera, lightPos) {
        this.positionUniforms.initAnimation.value = Math.min(
            1.0, this.positionUniforms.initAnimation.value + delta * 0.5
        );
        this.positionUniforms.time.value = elapsed;
        this.positionUniforms.dt.value = delta * 60.0;

        if (keypointSampler) {
            this.positionUniforms.textureMeshPositions.value = keypointSampler.positionTexture;
            this.positionUniforms.textureMeshVelocities.value = keypointSampler.velocityTexture;
            this.positionUniforms.meshSampleSize.value = keypointSampler.size;
        }

        this.gpuCompute.compute();

        const positionTexture = this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture;

        this.particleSort.update(positionTexture, camera, lightPos);
        const sortTexture = this.particleSort.getSortTexture();
        const sortEnabled = this.particleSort.enabled;

        this.opacityPass.update(positionTexture, sortTexture, lightPos, sortEnabled);

        this.particleMaterial.uniforms.texturePosition.value = positionTexture;
        this.particleMaterial.uniforms.textureSortKey.value = sortTexture;
        this.particleMaterial.uniforms.useSortKey.value = sortEnabled ? 1.0 : 0.0;
        this.particleMaterial.uniforms.opacityTexture.value = this.opacityPass.getOpacityTexture();

        const lightCamera = this.opacityPass.getLightCamera();
        this.particleMaterial.uniforms.lightViewMatrix.value.copy(lightCamera.matrixWorldInverse);
        this.particleMaterial.uniforms.lightProjectionMatrix.value.copy(lightCamera.projectionMatrix);

        if (lightPos && camera) {
            const lightWorld = lightPos.clone().normalize();
            const lightDir = lightWorld.transformDirection(camera.matrixWorldInverse);
            this.particleMaterial.uniforms.lightDirection.value.copy(lightDir);
        }
    }
}

// ============================================================
// 10. KEYPOINT → 3D MAPPING
// ============================================================

function kpTo3D(nx, ny) {
    return new THREE.Vector3(
        -(nx * 2 - 1) * WORLD_SCALE_X,
        -(ny * 2 - 1) * WORLD_SCALE_Y,
        0
    );
}

// ============================================================
// 11. MOVEMENT ANALYSIS
// ============================================================

function processKeypoints(raw) {
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
// 12. TEST MODE — synthetic animated body
// ============================================================

// Static standing pose (normalized 0-1 coords)
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

// Per-keypoint animation params (amplitude, frequency)
const TEST_ANIM = TEST_POSE.map((_, i) => ({
    ampX: 0.01 + Math.sin(i * 1.7) * 0.008,
    ampY: 0.005 + Math.cos(i * 2.3) * 0.005,
    freqX: 0.3 + i * 0.07,
    freqY: 0.4 + i * 0.05,
}));

function generateTestKeypoints(t) {
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

// ============================================================
// 13. POSE DETECTION
// ============================================================

let detector = null, videoElement = null, isDetecting = false;

async function setupCamera() {
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

async function setupPoseDetection() {
    await tf.ready();
    detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING, enableSmoothing: true }
    );
}

async function detectPose() {
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

// ============================================================
// 14. UI SETUP
// ============================================================

function populateExerciseGrid() {
    const grid = document.getElementById('exercise-grid');
    EXERCISES.forEach(ex => {
        const card = document.createElement('div');
        card.className = 'exercise-card';
        card.innerHTML = `
            <div class="exercise-card-icon">${ex.icon}</div>
            <div class="exercise-card-name">${ex.name}</div>
            <div class="exercise-card-desc">${ex.description}</div>
        `;
        card.addEventListener('click', () => startExercise(ex));
        grid.appendChild(card);
    });
}

function startExercise(exercise) {
    config.appMode = 'exercise';
    exerciseAnalyzer.start(exercise);

    document.getElementById('exercise-overlay').classList.add('hidden');
    document.getElementById('exercise-hud').classList.remove('hidden');
    document.getElementById('instructions-container').classList.add('hidden');
    document.getElementById('end-session-btn').classList.remove('hidden');

    document.getElementById('hud-exercise-name').textContent = exercise.name;
    document.getElementById('hud-reps').textContent = '0';
    document.getElementById('hud-angle').textContent = '—';
    document.getElementById('hud-form-cue').textContent = '';
    document.getElementById('hud-ai-text').textContent = '';

    if (aiCompanion.hasKey) {
        aiCompanion.greet(exercise.name);
    }
}

function endSession() {
    const summary = exerciseAnalyzer.stop();
    aiCompanion.reset();
    config.appMode = 'select';

    document.getElementById('exercise-hud').classList.add('hidden');
    document.getElementById('end-session-btn').classList.add('hidden');
    document.getElementById('exercise-overlay').classList.remove('hidden');
    document.getElementById('hud-voice-indicator').classList.add('hidden');
}

function updateExerciseHUD(state) {
    if (!state) return;
    document.getElementById('hud-reps').textContent = state.repCount;
    document.getElementById('hud-angle').textContent = state.currentAngle > 0 ? `${state.currentAngle}°` : '—';
    document.getElementById('hud-form-cue').textContent = state.formCue || '';

    const voiceInd = document.getElementById('hud-voice-indicator');
    if (aiCompanion.isSpeaking) voiceInd.classList.remove('hidden');
    else voiceInd.classList.add('hidden');
}

function setupApiKeyUI() {
    const btn = document.getElementById('api-key-btn');
    const modal = document.getElementById('api-key-modal');
    const input = document.getElementById('api-key-input');
    const saveBtn = document.getElementById('api-key-save');
    const cancelBtn = document.getElementById('api-key-cancel');
    const label = document.getElementById('api-key-btn-label');

    const stored = localStorage.getItem('openai_api_key');
    if (stored) {
        aiCompanion.apiKey = stored;
        label.textContent = 'API Key Set';
    }

    btn.addEventListener('click', e => {
        e.stopPropagation();
        input.value = aiCompanion.apiKey || '';
        modal.classList.remove('hidden');
    });

    saveBtn.addEventListener('click', e => {
        e.stopPropagation();
        const key = input.value.trim();
        aiCompanion.apiKey = key;
        label.textContent = key ? 'API Key Set' : 'Set API Key';
        modal.classList.add('hidden');
    });

    cancelBtn.addEventListener('click', e => {
        e.stopPropagation();
        modal.classList.add('hidden');
    });

    modal.addEventListener('click', e => {
        if (e.target === modal) modal.classList.add('hidden');
    });
}

aiCompanion.onTextUpdate = (text) => {
    const el = document.getElementById('hud-ai-text');
    if (el) el.textContent = text;
};

function setupUI() {
    populateExerciseGrid();
    setupApiKeyUI();

    document.getElementById('end-session-btn').addEventListener('click', e => {
        e.stopPropagation();
        endSession();
    });

    // Theme buttons (for starfield only now)
    document.querySelectorAll('.theme-button').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            config.activePaletteIndex = parseInt(btn.dataset.theme, 10);
            document.querySelectorAll('.theme-button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    const sSlider = document.getElementById('sensitivity-slider');
    const sVal = document.getElementById('sensitivity-value');
    sSlider.addEventListener('input', e => {
        e.stopPropagation();
        const v = parseInt(sSlider.value, 10);
        config.sensitivity = v / 100;
        sVal.textContent = `${v}%`;
    });

    document.getElementById('pause-play-btn').addEventListener('click', e => {
        e.stopPropagation();
        config.paused = !config.paused;
        e.currentTarget.querySelector('span').textContent = config.paused ? 'Play' : 'Freeze';
    });

    // Hide skeleton toggle (no skeleton in GPU particle mode)
    const skelBtn = document.getElementById('toggle-skeleton-btn');
    if (skelBtn) skelBtn.style.display = 'none';

    document.getElementById('reset-camera-btn').addEventListener('click', e => {
        e.stopPropagation(); controls.reset();
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
        bloomPass.resolution.set(window.innerWidth, window.innerHeight);
    });
}

// ============================================================
// 15. STATUS UI
// ============================================================

const statusDot = document.querySelector('.status-dot');
const trackingText = document.getElementById('tracking-text');
const metricVelocity = document.getElementById('metric-velocity');
const metricRange = document.getElementById('metric-range');
const metricJitter = document.getElementById('metric-jitter');

function updateStatusUI() {
    if (bodyState.isTracking) { statusDot.classList.add('tracking'); trackingText.textContent = 'Tracking'; }
    else { statusDot.classList.remove('tracking'); trackingText.textContent = detector || config.testMode ? 'No body' : 'Loading...'; }
    metricVelocity.style.width = `${bodyState.globalVelocity * 100}%`;
    metricRange.style.width = `${bodyState.globalRangeOfMotion * 100}%`;
    metricJitter.style.width = `${bodyState.globalJitter * 100}%`;
}

// ============================================================
// 16. ANIMATION LOOP
// ============================================================

let particleSystem = null;
let keypointSampler = null;

const clock = new THREE.Clock();
let prevTime = 0;
let _lastExerciseState = null;

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

    // Presence fade
    if (bodyState.isTracking && bodyState.presence < 1) bodyState.presence = Math.min(1, bodyState.presence + .025);
    if (!bodyState.isTracking && bodyState.presence > 0) bodyState.presence = Math.max(0, bodyState.presence - .008);

    if (!config.paused && particleSystem && keypointSampler) {
        // Update keypoint sampler with current body data
        keypointSampler.update(bodyState);

        // Update GPU particle system
        particleSystem.update(dt, t, keypointSampler, camera, lightPosition);

        // Exercise analysis (during exercise mode)
        if (config.appMode === 'exercise' && bodyState.isTracking) {
            const exState = exerciseAnalyzer.update(bodyState);
            if (exState) {
                _lastExerciseState = exState;
                updateExerciseHUD(exState);

                // AI companion update
                aiCompanion.update(exState, {
                    velocity: bodyState.globalVelocity,
                    jitter: bodyState.globalJitter,
                    rangeOfMotion: bodyState.globalRangeOfMotion,
                });
            }
        }
    }

    starField.rotation.y += .0002;
    starField.material.uniforms.uTime.value = t;
    controls.update();
    composer.render();

    if (Math.floor(t * 10) % 2 === 0) updateStatusUI();
}

// ============================================================
// 17. INIT
// ============================================================

async function init() {
    const overlay = document.getElementById('loading-overlay');
    const sub = overlay.querySelector('.loading-subtitle');
    setupUI();

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
