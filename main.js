// ============================================================
// Movement Dialogue — main.js
// Body-tracking shader with interior fill & Anadol-style particles
// + Exercise analysis, AI companion, and voice feedback
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { EXERCISES, ExerciseAnalyzer } from './exercises.js';
import { AICompanion } from './ai-companion.js';

// ============================================================
// 1. CONSTANTS & CONFIGURATION
// ============================================================

const config = {
    paused: false,
    activePaletteIndex: 0,
    sensitivity: 0.4,
    appMode: 'select',  // 'select' | 'exercise' | 'summary'
};

const exerciseAnalyzer = new ExerciseAnalyzer();
const aiCompanion = new AICompanion();

const KEYPOINT_NAMES = [
    'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
    'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
];

// Anatomical skeleton [kpA, kpB]
const SKELETON_CONNECTIONS = [
    [0, 1], [0, 2], [1, 3], [2, 4],        // face
    [5, 6],                                  // shoulders
    [5, 7], [7, 9], [6, 8], [8, 10],        // arms
    [5, 11], [6, 12], [11, 12],             // torso sides + hips
    [11, 13], [13, 15], [12, 14], [14, 16], // legs
];

const KEYPOINT_SIZES = [
    2.6, 2.5, 2.5, 2.4, 2.4,
    3.0, 3.0, 3.3, 3.3, 3.1, 3.1,
    4.2, 4.2, 4.5, 4.5, 4.1, 4.1
];

const KEYPOINT_LEVELS = [
    0, 0, 0, 0, 0,
    1, 1, 2, 2, 3, 3,
    1, 1, 2, 2, 3, 3
];

const KEYPOINT_Z_OFFSETS = [
    2.0, 2.2, 2.2, 1.5, 1.5,
    0.0, 0.0, -1.0, -1.0, -1.5, -1.5,
    -0.5, -0.5, 0.5, 0.5, 1.0, 1.0
];

const WORLD_SCALE_X = 15;
const WORLD_SCALE_Y = 12;

// Fill point config
const FILL_PER_BONE = 40;            // interpolated points per skeleton bone
const TORSO_COLS = 10, TORSO_ROWS = 8; // interior torso grid
const HEAD_FILL = 12;                  // ring around head
const TOTAL_FILL = SKELETON_CONNECTIONS.length * FILL_PER_BONE
    + TORSO_COLS * TORSO_ROWS + HEAD_FILL; // 48 + 12 + 8 = 68
const TOTAL_NODES = 17 + TOTAL_FILL;       // 85

// Anadol particles — dense body-volume fill
const ANADOL_COUNT = 18000;


// Body-volume segments for full-body particle distribution
// Each segment defines a region where particles spawn & tether
const BODY_SEGMENTS = [
    { type: 'head', weight: 18, radius: 1.8 },
    { type: 'torso', weight: 35, depth: 1.2 },
    { type: 'bone', bone: 4, weight: 5, w0: .7, w1: .7 },     // shoulders
    { type: 'bone', bone: 5, weight: 6, w0: .85, w1: .5 },    // L upper arm
    { type: 'bone', bone: 6, weight: 4, w0: .5, w1: .3 },     // L forearm
    { type: 'bone', bone: 7, weight: 6, w0: .85, w1: .5 },    // R upper arm
    { type: 'bone', bone: 8, weight: 4, w0: .5, w1: .3 },     // R forearm
    { type: 'bone', bone: 9, weight: 3, w0: 1.3, w1: 1.0 },   // L torso side
    { type: 'bone', bone: 10, weight: 3, w0: 1.3, w1: 1.0 },  // R torso side
    { type: 'bone', bone: 11, weight: 3, w0: .7, w1: .7 },    // hips
    { type: 'bone', bone: 12, weight: 7, w0: 1.0, w1: .6 },   // L thigh
    { type: 'bone', bone: 13, weight: 4, w0: .6, w1: .35 },   // L calf
    { type: 'bone', bone: 14, weight: 7, w0: 1.0, w1: .6 },   // R thigh
    { type: 'bone', bone: 15, weight: 4, w0: .6, w1: .35 },   // R calf
];
const _segWeightTotal = BODY_SEGMENTS.reduce((a, s) => a + s.weight, 0);
const _segCum = []; { let c = 0; for (const s of BODY_SEGMENTS) { c += s.weight; _segCum.push(c); } }
function pickSegment() {
    const r = Math.random() * _segWeightTotal;
    for (let i = 0; i < BODY_SEGMENTS.length; i++) if (r < _segCum[i]) return i;
    return BODY_SEGMENTS.length - 1;
}
function gaussRandom() {
    return Math.sqrt(-2 * Math.log(Math.max(1e-10, Math.random()))) * Math.cos(Math.PI * 2 * Math.random());
}

// Connections
const SEGMENTS_PER_CONNECTION = 40;

// Tracking
const CONFIDENCE_THRESHOLD = 0.3;
const SMOOTHING_FACTOR = 0.65;
const VELOCITY_HISTORY_LENGTH = 15;
const PULSE_VELOCITY_THRESHOLD = 10.0;
const PULSE_COOLDOWN = 0.8;

// Palettes
const colorPalettes = [
    [new THREE.Color(0x667eea), new THREE.Color(0x764ba2), new THREE.Color(0xf093fb), new THREE.Color(0x9d50bb), new THREE.Color(0x6e48aa)],
    [new THREE.Color(0xf857a6), new THREE.Color(0xff5858), new THREE.Color(0xfeca57), new THREE.Color(0xff6348), new THREE.Color(0xff9068)],
    [new THREE.Color(0x4facfe), new THREE.Color(0x00f2fe), new THREE.Color(0x43e97b), new THREE.Color(0x38f9d7), new THREE.Color(0x4484ce)],
];

// ============================================================
// 2. THREE.JS SCENE SETUP
// ============================================================

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.002);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 30);

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
controls.minDistance = 8;
controls.maxDistance = 80;
controls.autoRotate = false;
controls.enablePan = false;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.8, 0.85);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// ============================================================
// 3. SHADER DEFINITIONS
// ============================================================

const noiseFn = `
    vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
    vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
    vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
    float snoise(vec3 v){
        const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
        vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
        vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
        vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
        vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
        i=mod289(i);
        vec4 p=permute(permute(permute(
            i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
        float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
        vec4 j=p-49.*floor(p*ns.z*ns.z);
        vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
        vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
        vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
        vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;
        vec4 sh=-step(h,vec4(0.));
        vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
        vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);
        vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
        vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
        p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
        vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
        m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }`;

// --- Shared pulse uniforms template ---
const pulseUniformsDef = {
    uTime: { value: 0 },
    uJitter: { value: 0 },
    uRangeOfMotion: { value: 0 },
    uGlobalVelocity: { value: 0 },
    uPresence: { value: 0 },
    uPulsePositions: { value: [new THREE.Vector3(1e3,1e3,1e3), new THREE.Vector3(1e3,1e3,1e3), new THREE.Vector3(1e3,1e3,1e3)] },
    uPulseTimes: { value: [-1e3, -1e3, -1e3] },
    uPulseColors: { value: [new THREE.Color(1,1,1), new THREE.Color(1,1,1), new THREE.Color(1,1,1)] },
    uPulseSpeed: { value: 9 },
    uBaseNodeSize: { value: 1.7 },
};

// --- Node / fill-point shader ---
const nodeShader = {
    vertexShader: `${noiseFn}
        attribute float nodeSize;
        attribute float nodeType;
        attribute vec3 nodeColor;
        attribute float distFromRoot;
        attribute float confidence;

        uniform float uTime, uJitter, uRangeOfMotion, uGlobalVelocity, uPresence;
        uniform vec3 uPulsePositions[3]; uniform float uPulseTimes[3]; uniform float uPulseSpeed;
        uniform float uBaseNodeSize;

        varying vec3 vColor; varying float vNodeType, vPulse, vDist, vGlow, vConf, vPres;
        varying vec3 vPosition;

        float pulse(vec3 wp, vec3 pp, float pt){
            if(pt<0.)return 0.;
            float ts=uTime-pt; if(ts<0.||ts>4.)return 0.;
            return smoothstep(5.,0.,abs(distance(wp,pp)-ts*uPulseSpeed))*smoothstep(4.,0.,ts);
        }
        void main(){
            vNodeType=nodeType; vColor=nodeColor; vDist=distFromRoot; vConf=confidence; vPres=uPresence;
            vec3 wp=(modelMatrix*vec4(position,1.)).xyz; vPosition=wp;
            float tp=0.; for(int i=0;i<3;i++) tp+=pulse(wp,uPulsePositions[i],uPulseTimes[i]);
            vPulse=min(tp,1.);
            float bA=.08+uRangeOfMotion*.12, bS=.5+uGlobalVelocity*.6;
            float breathe=sin(uTime*bS+distFromRoot*.15)*bA+(1.-bA);
            float sz=nodeSize*breathe*(1.+vPulse*.25)*(1.+uRangeOfMotion*.2+uGlobalVelocity*.15);
            vGlow=.5+.5*sin(uTime*.5+distFromRoot*.2);
            vec3 mp=position;
            float nv=snoise(position*.08+uTime*(.08+uJitter*.3));
            float na=.1+uJitter*1.8;
            if(nodeType>1.5){            // fill point: moderate displacement
                mp+=vec3(nv)*na*.6;
            } else if(nodeType>.5){       // (reserved)
                mp+=vec3(nv)*na*.25;
            } else {                      // primary keypoint: subtle
                mp+=vec3(nv)*na*.15;
            }
            vec4 mv=modelViewMatrix*vec4(mp,1.);
            gl_PointSize=sz*uBaseNodeSize*(1000./-mv.z)*uPresence;
            gl_Position=projectionMatrix*mv;
        }`,
    fragmentShader: `
        uniform float uTime; uniform vec3 uPulseColors[3]; uniform float uRangeOfMotion;
        varying vec3 vColor; varying float vNodeType, vPulse, vDist, vGlow, vConf, vPres;
        varying vec3 vPosition;
        void main(){
            vec2 c=2.*gl_PointCoord-1.; float d=length(c); if(d>1.)discard;
            float g1=1.-smoothstep(0.,.5,d), g2=1.-smoothstep(0.,1.,d);
            float gs=pow(g1,1.2)+g2*.3;
            vec3 base=vColor*(.9+.1*sin(uTime*.6+vDist*.25));
            vec3 fc=base;
            // Depth-based illumination
            float nodeDepth=clamp(vPosition.z*.2,-1.,1.);
            fc*=.85+.15*(nodeDepth*.5+.5);
            fc.r*=1.+nodeDepth*.1;
            fc.b*=1.-nodeDepth*.07;
            if(vPulse>0.){
                vec3 pc=mix(vec3(1.),uPulseColors[0],.5);
                fc=mix(base,pc,vPulse*.3); fc*=1.+vPulse*.35; gs*=1.+vPulse*.4;
            }
            fc*=1.+uRangeOfMotion*.4;
            fc+=vec3(1.)*smoothstep(.4,0.,d)*.3;
            float a=gs*(.95-.3*d);
            float df=smoothstep(100.,15.,length(vPosition-cameraPosition));
            if(vNodeType>1.5){          // fill point: semi-transparent
                fc*=.75; a*=.45;
            } else if(vNodeType<.5){    // primary keypoint: full
                fc*=1.1;
            }
            fc*=1.+vGlow*.1;
            a*=vConf*vPres;
            gl_FragColor=vec4(fc,a*df);
        }`
};

// --- Connection shader (bone chains + internal web) ---
const connectionShader = {
    vertexShader: `${noiseFn}
        attribute vec3 startPoint, endPoint;
        attribute float connectionStrength, pathIndex;
        attribute vec3 connectionColor;
        uniform float uTime, uJitter, uRangeOfMotion, uGlobalVelocity, uPresence;
        uniform vec3 uPulsePositions[3]; uniform float uPulseTimes[3]; uniform float uPulseSpeed;
        varying vec3 vColor; varying float vStr, vPulse, vPath, vCamDist, vPres;
        float pulse(vec3 wp,vec3 pp,float pt){
            if(pt<0.)return 0.; float ts=uTime-pt; if(ts<0.||ts>4.)return 0.;
            return smoothstep(5.,0.,abs(distance(wp,pp)-ts*uPulseSpeed))*smoothstep(4.,0.,ts);
        }
        void main(){
            float t=position.x; vPath=t;
            vec3 mid=mix(startPoint,endPoint,.5);
            float arc=sin(t*3.14159)*(.15+uJitter*.4);
            vec3 dir=endPoint-startPoint;
            float dl=length(dir); dir=dl>0.001?dir/dl:vec3(1.,0.,0.);
            vec3 up=abs(dot(dir,vec3(0.,1.,0.)))>.99?vec3(1.,0.,0.):vec3(0.,1.,0.);
            vec3 perp=normalize(cross(dir,up));
            mid+=perp*arc;
            vec3 a=mix(startPoint,mid,t), b=mix(mid,endPoint,t);
            vec3 fp=mix(a,b,t);
            float nA=.12+uJitter*.5, nS=.15+uJitter*.4;
            fp+=perp*snoise(vec3(pathIndex*.08,t*.6,uTime*nS))*nA;
            vec3 wp=(modelMatrix*vec4(fp,1.)).xyz;
            float tp=0.; for(int i=0;i<3;i++) tp+=pulse(wp,uPulsePositions[i],uPulseTimes[i]);
            vPulse=min(tp,1.);
            vColor=connectionColor; vStr=connectionStrength;
            vCamDist=length(wp-cameraPosition); vPres=uPresence;
            gl_Position=projectionMatrix*modelViewMatrix*vec4(fp,1.);
        }`,
    fragmentShader: `
        uniform float uTime; uniform vec3 uPulseColors[3]; uniform float uRangeOfMotion, uGlobalVelocity;
        varying vec3 vColor; varying float vStr, vPulse, vPath, vCamDist, vPres;
        void main(){
            float fs1=4.+uGlobalVelocity*8., fs2=2.5+uGlobalVelocity*5.;
            float f1=sin(vPath*25.-uTime*fs1)*.5+.5;
            float f2=sin(vPath*15.-uTime*fs2+1.57)*.5+.5;
            float cmb=(f1+f2*.5)/1.5;
            vec3 base=vColor*(.8+.2*sin(uTime*.6+vPath*12.))*(1.+uRangeOfMotion*.5);
            float fi=.4*cmb*vStr; vec3 fc=base;
            if(vPulse>0.){
                fc=mix(base,mix(vec3(1.),uPulseColors[0],.4)*1.1,vPulse*.3);
                fi+=vPulse*.3;
            }
            fc*=.7+fi+vStr*.5;
            float a=.7*vStr+cmb*.3;
            a=mix(a,min(1.,a*1.5),vPulse);
            a*=smoothstep(100.,15.,vCamDist)*vPres;
            gl_FragColor=vec4(fc,a);
        }`
};

// --- Anadol flowing-particle shader ---
const anadolShader = {
    vertexShader: `${noiseFn}
        attribute float life, aSize;
        attribute vec3 aColor;
        uniform float uTime, uPresence, uRangeOfMotion, uGlobalVelocity, uJitter;
        uniform vec3 uPulsePositions[3]; uniform float uPulseTimes[3]; uniform float uPulseSpeed;
        uniform float uBaseNodeSize;
        varying float vLife, vPres, vPulse;
        varying vec3 vColor, vPosition;
        float pulse(vec3 wp,vec3 pp,float pt){
            if(pt<0.)return 0.; float ts=uTime-pt; if(ts<0.||ts>4.)return 0.;
            return smoothstep(6.,0.,abs(distance(wp,pp)-ts*uPulseSpeed))*smoothstep(4.,0.,ts);
        }
        void main(){
            vLife=life; vPres=uPresence; vColor=aColor;
            vec3 wp=(modelMatrix*vec4(position,1.)).xyz; vPosition=wp;
            float tp=0.; for(int i=0;i<3;i++) tp+=pulse(wp,uPulsePositions[i],uPulseTimes[i]);
            vPulse=min(tp,1.);

            // Life-based swell: fade in, sustain, fade out
            float lifeCurve = sin(life * 3.14159);
            lifeCurve = pow(lifeCurve, 0.6); // broader peak

            // Noise-based size shimmer (subtle)
            float shimmer = 1.0 + snoise(position * 0.3 + uTime * 0.3) * 0.12;

            float sz = aSize * lifeCurve * shimmer
                     * (1.0 + uRangeOfMotion * 0.3 + uGlobalVelocity * 0.15)
                     * (1.0 + vPulse * 0.5);

            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = sz * uBaseNodeSize * (900.0 / -mv.z) * uPresence;
            gl_Position = projectionMatrix * mv;
        }`,
    fragmentShader: `
        uniform float uTime, uRangeOfMotion;
        uniform vec3 uPulseColors[3];
        varying float vLife, vPres, vPulse;
        varying vec3 vColor, vPosition;
        void main(){
            vec2 uv = gl_PointCoord * 2.0 - 1.0;
            float d2 = dot(uv, uv);

            // Tighter gaussian falloff — solid cloud look
            float alpha = exp(-d2 * 3.5);

            // Subtle bright core
            float core = exp(-d2 * 12.0);

            vec3 fc = vColor * (1.0 + core * 0.35);
            fc *= 1.0 + uRangeOfMotion * 0.15;

            // Depth-based color temperature shift
            float zDepth = clamp(vPosition.z * 0.2, -1.0, 1.0);
            fc.r *= 1.0 + zDepth * 0.12;
            fc.b *= 1.0 - zDepth * 0.08;
            fc *= 0.85 + 0.15 * (zDepth * 0.5 + 0.5);

            if (vPulse > 0.0) {
                vec3 pc = mix(vec3(1.0), uPulseColors[0], 0.4);
                fc = mix(fc, pc, vPulse * 0.25);
                alpha *= 1.0 + vPulse * 0.3;
            }

            // Life fade — higher base alpha for denser/more solid feel
            float lifeFade = sin(vLife * 3.14159);
            lifeFade = pow(lifeFade, 0.5);
            alpha *= lifeFade * 0.32 * vPres;

            float df = smoothstep(100.0, 15.0, length(vPosition - cameraPosition));
            gl_FragColor = vec4(fc, alpha * df);
        }`
};

// ============================================================
// 4. STARFIELD (unchanged)
// ============================================================

function createStarfield() {
    const N = 8000, pos = [], col = [], sz = [];
    for (let i = 0; i < N; i++) {
        const r = THREE.MathUtils.randFloat(50, 150);
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

const bodyState = {
    isTracking: false, presence: 0,
    globalJitter: 0, globalRangeOfMotion: 0, globalVelocity: 0,
    keypoints: Array.from({ length: 17 }, () => ({
        raw: { x: .5, y: .5 }, smoothed: { x: .5, y: .5 },
        position3D: new THREE.Vector3(), confidence: 0,
        velocity: 0, velocityHistory: [], lastPulseTime: -10,
    })),
};
let videoWidth = 1640, videoHeight = 1480;

// ============================================================
// 6. FILL POINT GENERATION
// ============================================================

// Each fill point def: { type, ...params, level, size }
const fillPointDefs = [];

// 6a. Bone interpolation (3 per bone × 16 bones = 48)
SKELETON_CONNECTIONS.forEach(([a, b], bi) => {
    for (let k = 1; k <= FILL_PER_BONE; k++) {
        const t = k / (FILL_PER_BONE + 1);
        fillPointDefs.push({
            type: 'bone', kpA: a, kpB: b, t,
            level: Math.round((KEYPOINT_LEVELS[a] * (1 - t) + KEYPOINT_LEVELS[b] * t)),
            size: .4 + Math.random() * .35,
        });
    }
});

// 6b. Torso interior (4 cols × 3 rows = 12)
// Corners: lShoulder(5) rShoulder(6) rHip(12) lHip(11)
for (let r = 0; r < TORSO_ROWS; r++) {
    for (let c = 0; c < TORSO_COLS; c++) {
        const u = (c + 1) / (TORSO_COLS + 1);
        const v = (r + 1) / (TORSO_ROWS + 1);
        fillPointDefs.push({ type: 'torso', u, v, level: 1, size: .5 + Math.random() * .4 });
    }
}

// 6c. Head ring (8 points)
for (let i = 0; i < HEAD_FILL; i++) {
    const ang = (i / HEAD_FILL) * Math.PI * 2;
    fillPointDefs.push({
        type: 'head', angle: ang, radius: .4 + Math.random() * .25,
        level: 0, size: .3 + Math.random() * .2,
    });
}

// Fill point 3D positions (recomputed every frame)
const fillPositions3D = Array.from({ length: TOTAL_FILL }, () => new THREE.Vector3());
const fillConfidences = new Float32Array(TOTAL_FILL);

// --- All connection pairs [nodeA, nodeB, strength] ---
// Node indices: 0–16 = keypoints, 17+ = fill points
const allConnectionDefs = [];

// Bone chains (replace skeleton lines with subdivided chains)
SKELETON_CONNECTIONS.forEach(([kpA, kpB], bi) => {
    const f0 = 17 + bi * FILL_PER_BONE;
    const chain = [kpA, f0, f0 + 1, f0 + 2, kpB];
    for (let i = 0; i < chain.length - 1; i++) {
        allConnectionDefs.push([chain[i], chain[i + 1], .85]);
    }
});

// Torso grid connections
const TS = 17 + SKELETON_CONNECTIONS.length * FILL_PER_BONE; // torso start index
for (let r = 0; r < TORSO_ROWS; r++) {
    for (let c = 0; c < TORSO_COLS; c++) {
        const idx = TS + r * TORSO_COLS + c;
        if (c < TORSO_COLS - 1) allConnectionDefs.push([idx, idx + 1, .55]);       // right
        if (r < TORSO_ROWS - 1) allConnectionDefs.push([idx, idx + TORSO_COLS, .55]); // down
        if (c < TORSO_COLS - 1 && r < TORSO_ROWS - 1)
            allConnectionDefs.push([idx, idx + TORSO_COLS + 1, .35]); // diagonal
        if (c > 0 && r < TORSO_ROWS - 1)
            allConnectionDefs.push([idx, idx + TORSO_COLS - 1, .35]); // other diagonal
    }
}

// Cross-connections: torso edges → neighbouring bone fill points
// Bone indices for torso borders:
// bone 4 = shoulders [5,6], bone 9 = L torso [5,11], bone 10 = R torso [6,12], bone 11 = hips [11,12]
const boneIdx = { top: 4, left: 9, right: 10, bottom: 11 };
function bFill(bone, k) { return 17 + bone * FILL_PER_BONE + k; }

// Top row → shoulder bone fills
for (let c = 0; c < TORSO_COLS; c++) {
    const closest = Math.min(Math.round(c * (FILL_PER_BONE - 1) / (TORSO_COLS - 1)), FILL_PER_BONE - 1);
    allConnectionDefs.push([TS + c, bFill(boneIdx.top, closest), .45]);
}
// Bottom row → hip bone fills
for (let c = 0; c < TORSO_COLS; c++) {
    const closest = Math.min(Math.round(c * (FILL_PER_BONE - 1) / (TORSO_COLS - 1)), FILL_PER_BONE - 1);
    allConnectionDefs.push([TS + (TORSO_ROWS - 1) * TORSO_COLS + c, bFill(boneIdx.bottom, closest), .45]);
}
// Left column → L torso bone fills
for (let r = 0; r < TORSO_ROWS; r++) {
    const closest = Math.min(Math.round(r * (FILL_PER_BONE - 1) / (TORSO_ROWS - 1)), FILL_PER_BONE - 1);
    allConnectionDefs.push([TS + r * TORSO_COLS, bFill(boneIdx.left, closest), .4]);
}
// Right column → R torso bone fills
for (let r = 0; r < TORSO_ROWS; r++) {
    const closest = Math.min(Math.round(r * (FILL_PER_BONE - 1) / (TORSO_ROWS - 1)), FILL_PER_BONE - 1);
    allConnectionDefs.push([TS + r * TORSO_COLS + TORSO_COLS - 1, bFill(boneIdx.right, closest), .4]);
}

// Head ring + connections to face keypoints
const HS = TS + TORSO_COLS * TORSO_ROWS; // head start index
for (let i = 0; i < HEAD_FILL; i++) {
    allConnectionDefs.push([HS + i, HS + (i + 1) % HEAD_FILL, .45]); // ring
    if (i % 2 === 0) allConnectionDefs.push([HS + i, 0, .35]); // → nose
}
// Some head fills → eyes
allConnectionDefs.push([HS + 1, 1, .3]); // → left eye
allConnectionDefs.push([HS + 3, 2, .3]); // → right eye
allConnectionDefs.push([HS + 5, 3, .25]); // → left ear
allConnectionDefs.push([HS + 7, 4, .25]); // → right ear

const TOTAL_CONNECTIONS = allConnectionDefs.length;

// ============================================================
// 7. CURL-NOISE FLOW FIELD (for Anadol particles)
// ============================================================

// Smooth sine-based flow that mimics curl noise — very fast on CPU
function flowField(x, y, z, t, turb) {
    const s = .12 * (1 + turb * 1.5);
    const sp = .25 + turb * .2;
    return {
        x: Math.sin(y * s * 2.1 + t * sp)       * Math.cos(z * s * 1.7 + t * sp * .4)  * .45
         + Math.cos(z * s * 3.1 + t * sp * 1.3) * .2
         + Math.sin(y * s * 4.7 - t * sp * .8)  * .12,
        y: Math.cos(x * s * 2.3 + t * sp * .7)  * Math.sin(z * s * 1.9 + t * sp * .5)  * .45
         + Math.sin(x * s * 2.8 - t * sp * 1.1) * .2
         + Math.cos(z * s * 3.9 + t * sp * .6)  * .12,
        z: Math.sin(x * s * 1.8 + t * sp * .6)  * Math.cos(y * s * 2.5 - t * sp * .35) * .45
         + Math.cos(y * s * 3.3 + t * sp * 1.2) * .2
         + Math.sin(x * s * 5.1 + t * sp * .9)  * .12,
    };
}

// ============================================================
// 8. ANADOL PARTICLE STATE (body-volume distribution)
// ============================================================

function initParticle() {
    // Size distribution: mostly fine grain for dense solid look
    const r = Math.random();
    const size = r < .88 ? (.02 + Math.random() * .05)    // tiny: 0.02-0.07
               : r < .97 ? (.07 + Math.random() * .08)    // medium: 0.07-0.15
               : (.15 + Math.random() * .1);               // wisp: 0.15-0.25
    return {
        x: (Math.random() - .5) * 20,
        y: (Math.random() - .5) * 16,
        z: (Math.random() - .5) * 4,
        life: 0,           // start dead → respawn with body-volume assignment
        maxLife: 5 + Math.random() * 8,
        age: 999,
        size,
        segType: 2,        // 0=head, 1=torso, 2=bone, 3=wisp
        segIdx: 0,
        boneIdx: 0, t: 0, angle: 0, radiusFrac: 0,
        u: 0, v: 0, depth: 0,
        offX: 0, offY: 0, offZ: 0,
        parentKP: 0,
        tightness: 0.04,
        level: 1,
    };
}

const anadolParticles = Array.from({ length: ANADOL_COUNT }, initParticle);

// Assign each particle to a body-volume region and position it
function spawnParticle(p) {
    // 8% wisps — loosely tethered flowing particles from extremities
    if (Math.random() < 0.08) {
        p.segType = 3; // wisp
        const extremes = [0, 9, 10, 15, 16, 3, 4]; // head, wrists, ankles, ears
        // Bias toward high-velocity keypoints for streaming effects
        const w = extremes.map(ki => {
            const kp = bodyState.keypoints[ki];
            return kp.confidence > CONFIDENCE_THRESHOLD ? 1 + kp.velocity * 4 : 0.3;
        });
        const tot = w.reduce((a, b) => a + b, 0);
        let r = Math.random() * tot;
        let chosen = extremes[0];
        for (let i = 0; i < extremes.length; i++) { r -= w[i]; if (r <= 0) { chosen = extremes[i]; break; } }
        p.parentKP = chosen;
        p.tightness = 0.004 + Math.random() * 0.004;
        p.level = KEYPOINT_LEVELS[chosen];
        p.size = .18 + Math.random() * .2;
    } else {
        // 92% body-volume particles — distributed across body regions
        const si = pickSegment();
        const seg = BODY_SEGMENTS[si];
        p.segIdx = si;

        if (seg.type === 'head') {
            p.segType = 0;
            // Random point in ellipsoid (sqrt for uniform volume)
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const r = Math.pow(Math.random(), 0.5) * seg.radius;
            p.offX = Math.sin(phi) * Math.cos(theta) * r;
            p.offY = Math.sin(phi) * Math.sin(theta) * r * 1.3; // taller head
            p.offZ = Math.cos(phi) * r * 0.6; // flatter depth
            p.tightness = 0.04 + Math.random() * 0.03;
            p.level = 0;
        } else if (seg.type === 'torso') {
            p.segType = 1;
            p.u = Math.random();
            p.v = Math.random();
            // Gaussian depth (denser in center for solid torso look)
            p.depth = gaussRandom() * 0.4 * seg.depth;
            p.tightness = 0.035 + Math.random() * 0.025;
            p.level = 1;
        } else {
            // Bone type — cylindrical distribution around skeleton bone
            p.segType = 2;
            p.boneIdx = seg.bone;
            p.t = Math.random();
            p.angle = Math.random() * Math.PI * 2;
            const width = seg.w0 + (seg.w1 - seg.w0) * p.t;
            // Gaussian radial distribution (denser near bone axis)
            p.radiusFrac = Math.abs(gaussRandom()) * 0.55 * width;
            p.tightness = 0.035 + Math.random() * 0.025;
            // Interpolated level from bone endpoints
            const [kpA, kpB] = SKELETON_CONNECTIONS[seg.bone];
            p.level = Math.round(KEYPOINT_LEVELS[kpA] * (1 - p.t) + KEYPOINT_LEVELS[kpB] * p.t);
        }

        // Size re-roll for body particles (fine grain)
        const sr = Math.random();
        p.size = sr < .85 ? (.04 + Math.random() * .08) : (.12 + Math.random() * .13);
    }

    // Place at tether position
    if (bodyState.isTracking) {
        const teth = computeTether(p);
        p.x = teth.x + (Math.random() - .5) * .3;
        p.y = teth.y + (Math.random() - .5) * .3;
        p.z = teth.z + (Math.random() - .5) * .2;
    } else {
        p.x = (Math.random() - .5) * 20;
        p.y = (Math.random() - .5) * 16;
        p.z = (Math.random() - .5) * 4;
    }
    p.age = 0;
    p.life = 1;
    p.maxLife = 5 + Math.random() * 8;
}

// ============================================================
// 9. VISUALIZATION MESHES
// ============================================================

let nodesMesh = null;
let connectionsMesh = null;
let anadolMesh = null;

function createBodyVisualization() {
    const palette = colorPalettes[config.activePaletteIndex];

    // ---- Nodes: keypoints (17) + fill points (68) = 85 ----
    const nPos = new Float32Array(TOTAL_NODES * 3);
    const nSizes = new Float32Array(TOTAL_NODES);
    const nTypes = new Float32Array(TOTAL_NODES);
    const nColors = new Float32Array(TOTAL_NODES * 3);
    const nDist = new Float32Array(TOTAL_NODES);
    const nConf = new Float32Array(TOTAL_NODES);

    // Primary keypoints
    for (let i = 0; i < 17; i++) {
        nSizes[i] = KEYPOINT_SIZES[i];
        nTypes[i] = 0; // primary
        const col = palette[KEYPOINT_LEVELS[i] % palette.length].clone();
        col.offsetHSL(THREE.MathUtils.randFloatSpread(.03), THREE.MathUtils.randFloatSpread(.05), THREE.MathUtils.randFloatSpread(.05));
        nColors.set([col.r, col.g, col.b], i * 3);
        nDist[i] = KEYPOINT_LEVELS[i] * 5;
    }
    // Fill points
    for (let f = 0; f < TOTAL_FILL; f++) {
        const ni = 17 + f;
        const def = fillPointDefs[f];
        nSizes[ni] = def.size;
        nTypes[ni] = 2; // fill point type
        const col = palette[def.level % palette.length].clone();
        col.offsetHSL(THREE.MathUtils.randFloatSpread(.05), THREE.MathUtils.randFloatSpread(.08), THREE.MathUtils.randFloatSpread(.08));
        nColors.set([col.r, col.g, col.b], ni * 3);
        nDist[ni] = def.level * 5;
    }

    const nodesGeo = new THREE.BufferGeometry();
    nodesGeo.setAttribute('position', new THREE.Float32BufferAttribute(nPos, 3));
    nodesGeo.setAttribute('nodeSize', new THREE.Float32BufferAttribute(nSizes, 1));
    nodesGeo.setAttribute('nodeType', new THREE.Float32BufferAttribute(nTypes, 1));
    nodesGeo.setAttribute('nodeColor', new THREE.Float32BufferAttribute(nColors, 3));
    nodesGeo.setAttribute('distFromRoot', new THREE.Float32BufferAttribute(nDist, 1));
    nodesGeo.setAttribute('confidence', new THREE.Float32BufferAttribute(nConf, 1));

    nodesMesh = new THREE.Points(nodesGeo, new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(pulseUniformsDef),
        vertexShader: nodeShader.vertexShader,
        fragmentShader: nodeShader.fragmentShader,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    scene.add(nodesMesh);

    // ---- Connections ----
    const tV = TOTAL_CONNECTIONS * SEGMENTS_PER_CONNECTION;
    const cPos = new Float32Array(tV * 3);
    const cSP = new Float32Array(tV * 3);
    const cEP = new Float32Array(tV * 3);
    const cStr = new Float32Array(tV);
    const cPI = new Float32Array(tV);
    const cCol = new Float32Array(tV * 3);

    allConnectionDefs.forEach(([a, b, str], ci) => {
        const lA = a < 17 ? KEYPOINT_LEVELS[a] : fillPointDefs[a - 17].level;
        const lB = b < 17 ? KEYPOINT_LEVELS[b] : fillPointDefs[b - 17].level;
        const lAvg = Math.round((lA + lB) / 2);
        const baseCol = palette[lAvg % palette.length];
        for (let s = 0; s < SEGMENTS_PER_CONNECTION; s++) {
            const idx = ci * SEGMENTS_PER_CONNECTION + s;
            cPos[idx * 3] = s / (SEGMENTS_PER_CONNECTION - 1);
            cPI[idx] = ci;
            cStr[idx] = str;
            const col = baseCol.clone();
            col.offsetHSL(THREE.MathUtils.randFloatSpread(.04), THREE.MathUtils.randFloatSpread(.07), THREE.MathUtils.randFloatSpread(.07));
            cCol.set([col.r, col.g, col.b], idx * 3);
        }
    });

    const connGeo = new THREE.BufferGeometry();
    connGeo.setAttribute('position', new THREE.Float32BufferAttribute(cPos, 3));
    connGeo.setAttribute('startPoint', new THREE.Float32BufferAttribute(cSP, 3));
    connGeo.setAttribute('endPoint', new THREE.Float32BufferAttribute(cEP, 3));
    connGeo.setAttribute('connectionStrength', new THREE.Float32BufferAttribute(cStr, 1));
    connGeo.setAttribute('pathIndex', new THREE.Float32BufferAttribute(cPI, 1));
    connGeo.setAttribute('connectionColor', new THREE.Float32BufferAttribute(cCol, 3));

    connectionsMesh = new THREE.LineSegments(connGeo, new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(pulseUniformsDef),
        vertexShader: connectionShader.vertexShader,
        fragmentShader: connectionShader.fragmentShader,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    scene.add(connectionsMesh);

    // ---- Anadol particles ----
    const aPos = new Float32Array(ANADOL_COUNT * 3);
    const aLife = new Float32Array(ANADOL_COUNT);
    const aSize = new Float32Array(ANADOL_COUNT);
    const aCol = new Float32Array(ANADOL_COUNT * 3);

    for (let i = 0; i < ANADOL_COUNT; i++) {
        const p = anadolParticles[i];
        aSize[i] = p.size;
        aLife[i] = p.life;
        const col = palette[p.level % palette.length].clone();
        col.offsetHSL(THREE.MathUtils.randFloatSpread(.1), THREE.MathUtils.randFloatSpread(.15), THREE.MathUtils.randFloatSpread(.12));
        aCol.set([col.r, col.g, col.b], i * 3);
    }

    const aGeo = new THREE.BufferGeometry();
    aGeo.setAttribute('position', new THREE.Float32BufferAttribute(aPos, 3));
    aGeo.setAttribute('life', new THREE.Float32BufferAttribute(aLife, 1));
    aGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(aSize, 1));
    aGeo.setAttribute('aColor', new THREE.Float32BufferAttribute(aCol, 3));

    anadolMesh = new THREE.Points(aGeo, new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(pulseUniformsDef),
        vertexShader: anadolShader.vertexShader,
        fragmentShader: anadolShader.fragmentShader,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    scene.add(anadolMesh);

    applyPaletteToMeshes();
}

function allMeshes() { return [nodesMesh, connectionsMesh, anadolMesh].filter(Boolean); }

function applyPaletteToMeshes() {
    const pal = colorPalettes[config.activePaletteIndex];
    allMeshes().forEach(m => {
        pal.forEach((c, i) => { if (i < 3) m.material.uniforms.uPulseColors.value[i].copy(c); });
    });
}

// ============================================================
// 10. KEYPOINT → 3D MAPPING
// ============================================================

function kpTo3D(nx, ny, ki) {
    return new THREE.Vector3(
        -(nx * 2 - 1) * WORLD_SCALE_X,
        -(ny * 2 - 1) * WORLD_SCALE_Y,
        KEYPOINT_Z_OFFSETS[ki]
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
        kp.position3D = kpTo3D(kp.smoothed.x, kp.smoothed.y, i);
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
// 12. FILL POINT COMPUTATION (per frame)
// ============================================================

const _v3a = new THREE.Vector3(), _v3b = new THREE.Vector3();
const _v3c = new THREE.Vector3(), _v3d = new THREE.Vector3();
const _tetherOut = new THREE.Vector3();

// Precomputed per-frame: perpendicular vectors for each skeleton bone
const bonePerps = SKELETON_CONNECTIONS.map(() => ({
    p1: new THREE.Vector3(), p2: new THREE.Vector3()
}));
const torsoNormal = new THREE.Vector3(0, 0, 1);

function updateBonePerps() {
    for (let i = 0; i < SKELETON_CONNECTIONS.length; i++) {
        const [kpA, kpB] = SKELETON_CONNECTIONS[i];
        const pA = bodyState.keypoints[kpA].position3D;
        const pB = bodyState.keypoints[kpB].position3D;
        _v3c.subVectors(pB, pA);
        const len = _v3c.length();
        if (len < 0.001) {
            bonePerps[i].p1.set(1, 0, 0);
            bonePerps[i].p2.set(0, 0, 1);
            continue;
        }
        _v3c.divideScalar(len);
        const up = Math.abs(_v3c.y) > 0.99 ? _v3d.set(1, 0, 0) : _v3d.set(0, 1, 0);
        bonePerps[i].p1.crossVectors(_v3c, up).normalize();
        bonePerps[i].p2.crossVectors(_v3c, bonePerps[i].p1).normalize();
    }
}

function updateTorsoNormal() {
    const ls = bodyState.keypoints[5].position3D;
    const rs = bodyState.keypoints[6].position3D;
    const lh = bodyState.keypoints[11].position3D;
    _v3c.subVectors(rs, ls);
    _v3d.subVectors(lh, ls);
    torsoNormal.crossVectors(_v3c, _v3d);
    const len = torsoNormal.length();
    if (len > 0.001) torsoNormal.divideScalar(len);
    else torsoNormal.set(0, 0, 1);
}

// Compute 3D tether position for a body-volume particle
function computeTether(p) {
    switch (p.segType) {
        case 0: { // head — ellipsoid around head center
            const nose = bodyState.keypoints[0].position3D;
            const le = bodyState.keypoints[1].position3D;
            const re = bodyState.keypoints[2].position3D;
            _v3c.copy(nose).add(le).add(re).divideScalar(3);
            const headScale = Math.max(0.3, le.distanceTo(re)) * 1.2;
            _tetherOut.set(
                _v3c.x + p.offX * headScale,
                _v3c.y + p.offY * headScale,
                _v3c.z + p.offZ * headScale
            );
            return _tetherOut;
        }
        case 1: { // torso — bilinear quad + depth
            const ls = bodyState.keypoints[5].position3D;
            const rs = bodyState.keypoints[6].position3D;
            const lh = bodyState.keypoints[11].position3D;
            const rh = bodyState.keypoints[12].position3D;
            _v3c.lerpVectors(ls, rs, p.u);
            _v3d.lerpVectors(lh, rh, p.u);
            _tetherOut.lerpVectors(_v3c, _v3d, p.v);
            _tetherOut.addScaledVector(torsoNormal, p.depth);
            return _tetherOut;
        }
        case 2: { // bone — cylindrical around skeleton bone
            const [kpA, kpB] = SKELETON_CONNECTIONS[p.boneIdx];
            const pA = bodyState.keypoints[kpA].position3D;
            const pB = bodyState.keypoints[kpB].position3D;
            _tetherOut.lerpVectors(pA, pB, p.t);
            const bp = bonePerps[p.boneIdx];
            _tetherOut.addScaledVector(bp.p1, Math.cos(p.angle) * p.radiusFrac);
            _tetherOut.addScaledVector(bp.p2, Math.sin(p.angle) * p.radiusFrac);
            return _tetherOut;
        }
        case 3: { // wisp — loosely tethered to extremity keypoint
            _tetherOut.copy(bodyState.keypoints[p.parentKP].position3D);
            return _tetherOut;
        }
    }
    return _tetherOut.set(0, 0, 0);
}

function computeFillPoints() {
    for (let f = 0; f < TOTAL_FILL; f++) {
        const def = fillPointDefs[f];
        const out = fillPositions3D[f];
        switch (def.type) {
            case 'bone': {
                const pA = bodyState.keypoints[def.kpA].position3D;
                const pB = bodyState.keypoints[def.kpB].position3D;
                out.lerpVectors(pA, pB, def.t);
                fillConfidences[f] = Math.min(
                    bodyState.keypoints[def.kpA].confidence,
                    bodyState.keypoints[def.kpB].confidence
                );
                break;
            }
            case 'torso': {
                const ls = bodyState.keypoints[5].position3D;
                const rs = bodyState.keypoints[6].position3D;
                const lh = bodyState.keypoints[11].position3D;
                const rh = bodyState.keypoints[12].position3D;
                _v3a.lerpVectors(ls, rs, def.u);
                _v3b.lerpVectors(lh, rh, def.u);
                out.lerpVectors(_v3a, _v3b, def.v);
                fillConfidences[f] = Math.min(
                    bodyState.keypoints[5].confidence,
                    bodyState.keypoints[6].confidence,
                    bodyState.keypoints[11].confidence,
                    bodyState.keypoints[12].confidence
                );
                break;
            }
            case 'head': {
                const nose = bodyState.keypoints[0].position3D;
                const le = bodyState.keypoints[1].position3D;
                const re = bodyState.keypoints[2].position3D;
                const hc = _v3a.copy(nose).add(le).add(re).divideScalar(3);
                const eyeD = le.distanceTo(re);
                const hr = eyeD * def.radius * 1.5;
                out.set(
                    hc.x + Math.cos(def.angle) * hr,
                    hc.y + Math.sin(def.angle) * hr * .9,
                    hc.z + Math.sin(def.angle * 2) * hr * .3
                );
                fillConfidences[f] = Math.min(
                    bodyState.keypoints[0].confidence,
                    bodyState.keypoints[1].confidence,
                    bodyState.keypoints[2].confidence
                );
                break;
            }
        }
    }
}

// Helper: get 3D position for any node index (keypoint or fill)
function nodePos(idx) {
    return idx < 17 ? bodyState.keypoints[idx].position3D : fillPositions3D[idx - 17];
}
function nodeConf(idx) {
    if (idx < 17) return bodyState.keypoints[idx].confidence > CONFIDENCE_THRESHOLD ? bodyState.keypoints[idx].confidence : 0;
    return fillConfidences[idx - 17] > CONFIDENCE_THRESHOLD ? fillConfidences[idx - 17] : 0;
}

// ============================================================
// 13. MESH UPDATES (per frame)
// ============================================================

function updateNodes() {
    if (!nodesMesh) return;
    const pos = nodesMesh.geometry.attributes.position;
    const conf = nodesMesh.geometry.attributes.confidence;
    for (let i = 0; i < 17; i++) {
        const p = bodyState.keypoints[i].position3D;
        pos.setXYZ(i, p.x, p.y, p.z);
        conf.setX(i, nodeConf(i));
    }
    for (let f = 0; f < TOTAL_FILL; f++) {
        const ni = 17 + f;
        const p = fillPositions3D[f];
        pos.setXYZ(ni, p.x, p.y, p.z);
        conf.setX(ni, nodeConf(ni));
    }
    pos.needsUpdate = true;
    conf.needsUpdate = true;
}

function updateConnections() {
    if (!connectionsMesh) return;
    const sp = connectionsMesh.geometry.attributes.startPoint;
    const ep = connectionsMesh.geometry.attributes.endPoint;
    const st = connectionsMesh.geometry.attributes.connectionStrength;

    for (let c = 0; c < TOTAL_CONNECTIONS; c++) {
        const [a, b, baseStr] = allConnectionDefs[c];
        const pA = nodePos(a), pB = nodePos(b);
        const strength = Math.min(nodeConf(a), nodeConf(b)) * baseStr;
        for (let s = 0; s < SEGMENTS_PER_CONNECTION; s++) {
            const idx = c * SEGMENTS_PER_CONNECTION + s;
            sp.setXYZ(idx, pA.x, pA.y, pA.z);
            ep.setXYZ(idx, pB.x, pB.y, pB.z);
            st.setX(idx, strength);
        }
    }
    sp.needsUpdate = true;
    ep.needsUpdate = true;
    st.needsUpdate = true;
}

function updateAnadolParticles(time, dt) {
    if (!anadolMesh) return;
    const posAttr = anadolMesh.geometry.attributes.position;
    const lifeAttr = anadolMesh.geometry.attributes.life;
    const sizeAttr = anadolMesh.geometry.attributes.aSize;
    const colAttr = anadolMesh.geometry.attributes.aColor;

    // Precompute body-volume infrastructure
    updateBonePerps();
    updateTorsoNormal();

    const turb = bodyState.globalJitter;
    const baseSpeed = .35 + bodyState.globalVelocity * 1.2;
    let colorDirty = false, sizeDirty = false;

    for (let i = 0; i < ANADOL_COUNT; i++) {
        const p = anadolParticles[i];

        // Age / life
        p.age += dt;
        p.life = 1 - (p.age / p.maxLife);

        // Compute tether from body volume
        const teth = computeTether(p);
        const tx = teth.x, ty = teth.y, tz = teth.z;
        const dx = p.x - tx, dy = p.y - ty, dz = p.z - tz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Max drift: tight for body particles, loose for wisps
        const maxDrift = p.segType === 3 ? (10 + bodyState.globalRangeOfMotion * 6) : 4;

        if (p.life <= 0 || dist > maxDrift) {
            spawnParticle(p);
            posAttr.setXYZ(i, p.x, p.y, p.z);
            lifeAttr.setX(i, p.life);
            sizeAttr.setX(i, p.size); sizeDirty = true;
            // Update color on respawn
            const pal = colorPalettes[config.activePaletteIndex];
            const c = pal[p.level % pal.length].clone();
            c.offsetHSL(
                THREE.MathUtils.randFloatSpread(.1),
                THREE.MathUtils.randFloatSpread(.15),
                THREE.MathUtils.randFloatSpread(.12)
            );
            colAttr.setXYZ(i, c.r, c.g, c.b);
            colorDirty = true;
            continue;
        }

        // Flow field (gentle for body particles, stronger for wisps)
        const flow = flowField(p.x + i * 0.007, p.y, p.z, time, turb);
        const speed = p.segType === 3
            ? baseSpeed * (1.2 + p.size * 2)     // wisps flow freely
            : baseSpeed * (.25 + p.size * .8);    // body particles: gentle shimmer

        // Spring toward tether position
        const spring = p.tightness * (1 + dist * 0.12);

        // Update position
        p.x += (flow.x * speed - dx * spring) * dt * 60;
        p.y += (flow.y * speed - dy * spring) * dt * 60;
        p.z += (flow.z * speed - dz * spring) * dt * 60;

        posAttr.setXYZ(i, p.x, p.y, p.z);
        lifeAttr.setX(i, Math.max(0, p.life));
    }
    posAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;
    if (colorDirty) colAttr.needsUpdate = true;
    if (sizeDirty) sizeAttr.needsUpdate = true;
}

function updateUniforms(time) {
    const vals = {
        uTime: time,
        uJitter: bodyState.globalJitter,
        uRangeOfMotion: bodyState.globalRangeOfMotion,
        uGlobalVelocity: bodyState.globalVelocity,
        uPresence: bodyState.presence,
    };
    allMeshes().forEach(m => {
        const u = m.material.uniforms;
        for (const [k, v] of Object.entries(vals)) u[k].value = v;
    });
    bloomPass.strength = 0.6 + bodyState.globalRangeOfMotion * 0.5;
}

// ============================================================
// 14. PULSE SYSTEM
// ============================================================

let lastPulseIdx = 0;

function triggerPulse(pos, time) {
    lastPulseIdx = (lastPulseIdx + 1) % 3;
    const col = colorPalettes[config.activePaletteIndex][Math.floor(Math.random() * 5)];
    allMeshes().forEach(m => {
        m.material.uniforms.uPulsePositions.value[lastPulseIdx].copy(pos);
        m.material.uniforms.uPulseTimes.value[lastPulseIdx] = time;
        m.material.uniforms.uPulseColors.value[lastPulseIdx].copy(col);
    });
}

function checkMovementPulses(time) {
    for (let i = 0; i < 17; i++) {
        const kp = bodyState.keypoints[i];
        if (kp.velocity > PULSE_VELOCITY_THRESHOLD * (1.1 - config.sensitivity) &&
            time - kp.lastPulseTime > PULSE_COOLDOWN && kp.confidence > CONFIDENCE_THRESHOLD) {
            triggerPulse(kp.position3D, time);
            kp.lastPulseTime = time;
        }
    }
}

// Click-to-pulse
const raycaster = new THREE.Raycaster();
const ptr = new THREE.Vector2();
const iPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const iPt = new THREE.Vector3();

function clickPulse(cx, cy) {
    ptr.x = (cx / window.innerWidth) * 2 - 1;
    ptr.y = -(cy / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(ptr, camera);
    iPlane.normal.copy(camera.position).normalize();
    iPlane.constant = -iPlane.normal.dot(camera.position) + camera.position.length() * .5;
    if (raycaster.ray.intersectPlane(iPlane, iPt)) triggerPulse(iPt, clock.getElapsedTime());
}

renderer.domElement.addEventListener('click', e => {
    if (e.target.closest('.glass-panel,#control-buttons,#exercise-overlay,#api-key-modal,.exercise-card')) return;
    if (!config.paused) clickPulse(e.clientX, e.clientY);
});
renderer.domElement.addEventListener('touchstart', e => {
    if (e.target.closest('.glass-panel,#control-buttons,#exercise-overlay,#api-key-modal,.exercise-card')) return;
    e.preventDefault();
    if (e.touches.length && !config.paused) clickPulse(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

// ============================================================
// 15. POSE DETECTION
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
// 16. THEME UPDATES
// ============================================================

function updateTheme(pi) {
    config.activePaletteIndex = pi;
    const pal = colorPalettes[pi];

    if (nodesMesh) {
        const ca = nodesMesh.geometry.attributes.nodeColor;
        for (let i = 0; i < 17; i++) {
            const c = pal[KEYPOINT_LEVELS[i] % pal.length].clone();
            c.offsetHSL(THREE.MathUtils.randFloatSpread(.03), THREE.MathUtils.randFloatSpread(.05), THREE.MathUtils.randFloatSpread(.05));
            ca.setXYZ(i, c.r, c.g, c.b);
        }
        for (let f = 0; f < TOTAL_FILL; f++) {
            const c = pal[fillPointDefs[f].level % pal.length].clone();
            c.offsetHSL(THREE.MathUtils.randFloatSpread(.05), THREE.MathUtils.randFloatSpread(.08), THREE.MathUtils.randFloatSpread(.08));
            ca.setXYZ(17 + f, c.r, c.g, c.b);
        }
        ca.needsUpdate = true;
    }

    if (connectionsMesh) {
        const ca = connectionsMesh.geometry.attributes.connectionColor;
        allConnectionDefs.forEach(([a, b], ci) => {
            const lA = a < 17 ? KEYPOINT_LEVELS[a] : fillPointDefs[a - 17].level;
            const lB = b < 17 ? KEYPOINT_LEVELS[b] : fillPointDefs[b - 17].level;
            const bc = pal[Math.round((lA + lB) / 2) % pal.length];
            for (let s = 0; s < SEGMENTS_PER_CONNECTION; s++) {
                const idx = ci * SEGMENTS_PER_CONNECTION + s;
                const c = bc.clone();
                c.offsetHSL(THREE.MathUtils.randFloatSpread(.04), THREE.MathUtils.randFloatSpread(.07), THREE.MathUtils.randFloatSpread(.07));
                ca.setXYZ(idx, c.r, c.g, c.b);
            }
        });
        ca.needsUpdate = true;
    }

    if (anadolMesh) {
        const ca = anadolMesh.geometry.attributes.aColor;
        for (let i = 0; i < ANADOL_COUNT; i++) {
            const p = anadolParticles[i];
            const c = pal[p.level % pal.length].clone();
            c.offsetHSL(THREE.MathUtils.randFloatSpread(.1), THREE.MathUtils.randFloatSpread(.15), THREE.MathUtils.randFloatSpread(.12));
            ca.setXYZ(i, c.r, c.g, c.b);
        }
        ca.needsUpdate = true;
    }

    applyPaletteToMeshes();
}

// ============================================================
// 17. UI SETUP
// ============================================================

// ---- Exercise Selection & HUD ----

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

    // UI transitions
    document.getElementById('exercise-overlay').classList.add('hidden');
    document.getElementById('exercise-hud').classList.remove('hidden');
    document.getElementById('instructions-container').classList.add('hidden');
    document.getElementById('end-session-btn').classList.remove('hidden');

    // Set HUD content
    document.getElementById('hud-exercise-name').textContent = exercise.name;
    document.getElementById('hud-reps').textContent = '0';
    document.getElementById('hud-angle').textContent = '—';
    document.getElementById('hud-form-cue').textContent = '';
    document.getElementById('hud-ai-text').textContent = '';

    // AI greeting
    if (aiCompanion.hasKey) {
        aiCompanion.greet(exercise.name);
    }
}

function endSession() {
    const summary = exerciseAnalyzer.stop();
    aiCompanion.reset();
    config.appMode = 'select';

    // UI transitions
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

    // Voice indicator
    const voiceInd = document.getElementById('hud-voice-indicator');
    if (aiCompanion.isSpeaking) voiceInd.classList.remove('hidden');
    else voiceInd.classList.add('hidden');
}

// ---- API Key Modal ----

function setupApiKeyUI() {
    const btn = document.getElementById('api-key-btn');
    const modal = document.getElementById('api-key-modal');
    const input = document.getElementById('api-key-input');
    const saveBtn = document.getElementById('api-key-save');
    const cancelBtn = document.getElementById('api-key-cancel');
    const label = document.getElementById('api-key-btn-label');

    // Load existing key
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

// ---- AI text display callback ----

aiCompanion.onTextUpdate = (text) => {
    const el = document.getElementById('hud-ai-text');
    if (el) el.textContent = text;
};

function setupUI() {
    // Exercise grid
    populateExerciseGrid();
    setupApiKeyUI();

    // End session button
    document.getElementById('end-session-btn').addEventListener('click', e => {
        e.stopPropagation();
        endSession();
    });

    document.querySelectorAll('.theme-button').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            updateTheme(parseInt(btn.dataset.theme, 10));
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

    document.getElementById('toggle-skeleton-btn').addEventListener('click', e => {
        e.stopPropagation();
        if (connectionsMesh) connectionsMesh.visible = !connectionsMesh.visible;
        e.currentTarget.querySelector('span').textContent = connectionsMesh && connectionsMesh.visible ? 'Skeleton' : 'Points';
    });

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
// 18. UI STATUS
// ============================================================

const statusDot = document.querySelector('.status-dot');
const trackingText = document.getElementById('tracking-text');
const metricVelocity = document.getElementById('metric-velocity');
const metricRange = document.getElementById('metric-range');
const metricJitter = document.getElementById('metric-jitter');

function updateStatusUI() {
    if (bodyState.isTracking) { statusDot.classList.add('tracking'); trackingText.textContent = 'Tracking'; }
    else { statusDot.classList.remove('tracking'); trackingText.textContent = detector ? 'No body' : 'Loading...'; }
    metricVelocity.style.width = `${bodyState.globalVelocity * 100}%`;
    metricRange.style.width = `${bodyState.globalRangeOfMotion * 100}%`;
    metricJitter.style.width = `${bodyState.globalJitter * 100}%`;
}

// ============================================================
// 19. ANIMATION LOOP
// ============================================================

const clock = new THREE.Clock();
let prevTime = 0;

let _lastExerciseState = null;

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = Math.min(t - prevTime, .05); // cap to avoid huge jumps
    prevTime = t;

    detectPose();

    // Presence fade
    if (bodyState.isTracking && bodyState.presence < 1) bodyState.presence = Math.min(1, bodyState.presence + .025);
    if (!bodyState.isTracking && bodyState.presence > 0) bodyState.presence = Math.max(0, bodyState.presence - .008);

    if (!config.paused) {
        computeFillPoints();
        updateNodes();
        updateConnections();
        updateAnadolParticles(t, dt);
        updateUniforms(t);
        checkMovementPulses(t);

        // Exercise analysis (during exercise mode)
        if (config.appMode === 'exercise' && bodyState.isTracking) {
            const exState = exerciseAnalyzer.update(bodyState);
            if (exState) {
                _lastExerciseState = exState;
                updateExerciseHUD(exState);

                // Trigger pulse on rep completion
                if (exState.repCompleted && exerciseAnalyzer.exercise) {
                    const targetKps = exerciseAnalyzer.exercise.targetKeypoints;
                    // Pulse from the centroid of target keypoints
                    const centroid = new THREE.Vector3();
                    let count = 0;
                    for (const ki of targetKps) {
                        if (bodyState.keypoints[ki].confidence > CONFIDENCE_THRESHOLD) {
                            centroid.add(bodyState.keypoints[ki].position3D);
                            count++;
                        }
                    }
                    if (count > 0) {
                        centroid.divideScalar(count);
                        triggerPulse(centroid, t);
                    }
                }

                // AI companion update (async, non-blocking)
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
// 20. INIT
// ============================================================

async function init() {
    const overlay = document.getElementById('loading-overlay');
    const sub = overlay.querySelector('.loading-subtitle');
    setupUI();
    createBodyVisualization();
    try {
        sub.textContent = 'Starting camera...';
        await setupCamera();
        sub.textContent = 'Loading MoveNet model...';
        await setupPoseDetection();
        sub.textContent = 'Ready!';
        setTimeout(() => {
            overlay.classList.add('hidden');
            // Show exercise selection overlay
            document.getElementById('exercise-overlay').classList.remove('hidden');
        }, 600);
    } catch (err) {
        console.error('Init error:', err);
        sub.textContent = `Error: ${err.message || 'Could not start camera or load model.'}`;
        setTimeout(() => overlay.classList.add('hidden'), 4000);
    }
    animate();
}

init();
