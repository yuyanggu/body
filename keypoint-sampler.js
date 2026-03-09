// ============================================================
// Keypoint Sampler — maps body keypoints to GPU texture slots
// + Debug skeleton overlay
// ============================================================

import * as THREE from 'three';
import { CONFIDENCE_THRESHOLD, BODY_SCALE, SAMPLE_SIZE } from './config.js';

// Skeleton connections for interpolation
export const SKELETON_CONNECTIONS = [
    [0, 1], [0, 2], [1, 3], [2, 4],
    [5, 6],
    [5, 7], [7, 9], [6, 8], [8, 10],
    [5, 11], [6, 12], [11, 12],
    [11, 13], [13, 15], [12, 14], [14, 16],
];

// ============================================================
// Keypoint Overlay (debug skeleton visualization)
// ============================================================

export function createKeypointOverlay(scene) {
    const group = new THREE.Group();
    group.visible = false;
    scene.add(group);

    const sphereGeo = new THREE.SphereGeometry(1.2, 12, 12);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.9 });
    const spheres = [];
    for (let i = 0; i < 17; i++) {
        const s = new THREE.Mesh(sphereGeo, sphereMat);
        s.visible = false;
        group.add(s);
        spheres.push(s);
    }

    const lineMat = new THREE.LineBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.4 });
    const lines = [];
    for (let i = 0; i < SKELETON_CONNECTIONS.length; i++) {
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        const line = new THREE.Line(geo, lineMat);
        line.visible = false;
        group.add(line);
        lines.push(line);
    }

    return { group, spheres, lines };
}

export function updateKeypointOverlay(overlay, config, bodyState) {
    const { group, spheres, lines } = overlay;

    if (!config.showKeypoints) { group.visible = false; return; }
    group.visible = true;

    for (let i = 0; i < 17; i++) {
        const kp = bodyState.keypoints[i];
        if (kp.confidence >= CONFIDENCE_THRESHOLD) {
            spheres[i].position.set(
                kp.position3D.x * BODY_SCALE,
                kp.position3D.y * BODY_SCALE,
                kp.position3D.z * BODY_SCALE + 1
            );
            spheres[i].visible = true;
        } else {
            spheres[i].visible = false;
        }
    }

    for (let i = 0; i < SKELETON_CONNECTIONS.length; i++) {
        const [a, b] = SKELETON_CONNECTIONS[i];
        const kpA = bodyState.keypoints[a], kpB = bodyState.keypoints[b];
        if (kpA.confidence >= CONFIDENCE_THRESHOLD && kpB.confidence >= CONFIDENCE_THRESHOLD) {
            const positions = lines[i].geometry.attributes.position.array;
            positions[0] = kpA.position3D.x * BODY_SCALE;
            positions[1] = kpA.position3D.y * BODY_SCALE;
            positions[2] = kpA.position3D.z * BODY_SCALE + 1;
            positions[3] = kpB.position3D.x * BODY_SCALE;
            positions[4] = kpB.position3D.y * BODY_SCALE;
            positions[5] = kpB.position3D.z * BODY_SCALE + 1;
            lines[i].geometry.attributes.position.needsUpdate = true;
            lines[i].visible = true;
        } else {
            lines[i].visible = false;
        }
    }
}

// ============================================================
// KeypointSampler — packs body data into GPU DataTextures
// ============================================================

const OFF = { x: 0, y: -200, z: 0 };

export class KeypointSampler {
    constructor() {
        this.size = SAMPLE_SIZE;
        const total = SAMPLE_SIZE * SAMPLE_SIZE;

        const posData = new Float32Array(total * 4);
        this.positionTexture = new THREE.DataTexture(posData, SAMPLE_SIZE, SAMPLE_SIZE, THREE.RGBAFormat, THREE.FloatType);
        this.positionTexture.needsUpdate = true;

        const velData = new Float32Array(total * 4);
        this.velocityTexture = new THREE.DataTexture(velData, SAMPLE_SIZE, SAMPLE_SIZE, THREE.RGBAFormat, THREE.FloatType);
        this.velocityTexture.needsUpdate = true;

        this.prevPositions = new Float32Array(total * 3);
        this.smoothedVelocity = new Float32Array(total * 3);
    }

    _lerp2(kpA, kpB, t) {
        if (kpA.confidence >= CONFIDENCE_THRESHOLD && kpB.confidence >= CONFIDENCE_THRESHOLD) {
            return {
                x: (kpA.position3D.x + (kpB.position3D.x - kpA.position3D.x) * t) * BODY_SCALE,
                y: (kpA.position3D.y + (kpB.position3D.y - kpA.position3D.y) * t) * BODY_SCALE,
                z: (kpA.position3D.z + (kpB.position3D.z - kpA.position3D.z) * t) * BODY_SCALE,
            };
        }
        return null;
    }

    _limbPoints(kpA, kpB, n) {
        const pts = [];
        for (let i = 0; i < n; i++) {
            const t = n === 1 ? 0.5 : i / (n - 1);
            const p = this._lerp2(kpA, kpB, t);
            pts.push(p || OFF);
        }
        return pts;
    }

    _quadGrid(tl, tr, bl, br, cols, rows) {
        const pts = [];
        const ok = tl.confidence >= CONFIDENCE_THRESHOLD &&
            tr.confidence >= CONFIDENCE_THRESHOLD &&
            bl.confidence >= CONFIDENCE_THRESHOLD &&
            br.confidence >= CONFIDENCE_THRESHOLD;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (ok) {
                    const u = (c + 0.5) / cols;
                    const v = (r + 0.5) / rows;
                    const topX = tl.position3D.x + (tr.position3D.x - tl.position3D.x) * u;
                    const topY = tl.position3D.y + (tr.position3D.y - tl.position3D.y) * u;
                    const topZ = tl.position3D.z + (tr.position3D.z - tl.position3D.z) * u;
                    const botX = bl.position3D.x + (br.position3D.x - bl.position3D.x) * u;
                    const botY = bl.position3D.y + (br.position3D.y - bl.position3D.y) * u;
                    const botZ = bl.position3D.z + (br.position3D.z - bl.position3D.z) * u;
                    pts.push({
                        x: (topX + (botX - topX) * v) * BODY_SCALE,
                        y: (topY + (botY - topY) * v) * BODY_SCALE,
                        z: (topZ + (botZ - topZ) * v) * BODY_SCALE,
                    });
                } else {
                    pts.push(OFF);
                }
            }
        }
        return pts;
    }

    update(bodyState) {
        const posData = this.positionTexture.image.data;
        const velData = this.velocityTexture.image.data;
        const kp = bodyState.keypoints;
        const points = [];

        // --- HEAD: 8 points ---
        for (let i = 0; i < 5; i++) {
            if (kp[i].confidence >= CONFIDENCE_THRESHOLD) {
                points.push({ x: kp[i].position3D.x * BODY_SCALE, y: kp[i].position3D.y * BODY_SCALE, z: kp[i].position3D.z * BODY_SCALE });
            } else {
                points.push(OFF);
            }
        }
        points.push(this._lerp2(kp[3], kp[4], 0.33) || OFF);
        points.push(this._lerp2(kp[3], kp[4], 0.67) || OFF);
        if (kp[0].confidence >= CONFIDENCE_THRESHOLD && kp[1].confidence >= CONFIDENCE_THRESHOLD && kp[2].confidence >= CONFIDENCE_THRESHOLD) {
            const eyeMidY = (kp[1].position3D.y + kp[2].position3D.y) * 0.5;
            const headTopY = kp[0].position3D.y + (kp[0].position3D.y - eyeMidY) * 2.0;
            points.push({ x: kp[0].position3D.x * BODY_SCALE, y: headTopY * BODY_SCALE, z: kp[0].position3D.z * BODY_SCALE });
        } else {
            points.push(OFF);
        }

        // --- NECK: 2 points ---
        if (kp[0].confidence >= CONFIDENCE_THRESHOLD && kp[5].confidence >= CONFIDENCE_THRESHOLD && kp[6].confidence >= CONFIDENCE_THRESHOLD) {
            const shoulderMidX = (kp[5].position3D.x + kp[6].position3D.x) * 0.5;
            const shoulderMidY = (kp[5].position3D.y + kp[6].position3D.y) * 0.5;
            const shoulderMidZ = (kp[5].position3D.z + kp[6].position3D.z) * 0.5;
            for (let i = 0; i < 2; i++) {
                const t = (i + 1) / 3;
                points.push({
                    x: (kp[0].position3D.x + (shoulderMidX - kp[0].position3D.x) * t) * BODY_SCALE,
                    y: (kp[0].position3D.y + (shoulderMidY - kp[0].position3D.y) * t) * BODY_SCALE,
                    z: (kp[0].position3D.z + (shoulderMidZ - kp[0].position3D.z) * t) * BODY_SCALE,
                });
            }
        } else {
            points.push(OFF, OFF);
        }

        // --- TORSO: 6x8 = 48 points ---
        points.push(...this._quadGrid(kp[5], kp[6], kp[11], kp[12], 6, 8));

        // --- ARMS: 24 points (6 per segment) ---
        points.push(...this._limbPoints(kp[5], kp[7], 6));
        points.push(...this._limbPoints(kp[7], kp[9], 6));
        points.push(...this._limbPoints(kp[6], kp[8], 6));
        points.push(...this._limbPoints(kp[8], kp[10], 6));

        // --- LEGS: 32 points (8 per segment) ---
        points.push(...this._limbPoints(kp[11], kp[13], 8));
        points.push(...this._limbPoints(kp[13], kp[15], 8));
        points.push(...this._limbPoints(kp[12], kp[14], 8));
        points.push(...this._limbPoints(kp[14], kp[16], 8));

        // --- EXTRA TORSO DEPTH: 3x4 = 12 points ---
        if (kp[5].confidence >= CONFIDENCE_THRESHOLD && kp[6].confidence >= CONFIDENCE_THRESHOLD &&
            kp[11].confidence >= CONFIDENCE_THRESHOLD && kp[12].confidence >= CONFIDENCE_THRESHOLD) {
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 3; c++) {
                    const u = (c + 0.5) / 3;
                    const v = (r + 0.5) / 4;
                    const topX = kp[5].position3D.x + (kp[6].position3D.x - kp[5].position3D.x) * u;
                    const topY = kp[5].position3D.y + (kp[6].position3D.y - kp[5].position3D.y) * u;
                    const botX = kp[11].position3D.x + (kp[12].position3D.x - kp[11].position3D.x) * u;
                    const botY = kp[11].position3D.y + (kp[12].position3D.y - kp[11].position3D.y) * u;
                    const px = topX + (botX - topX) * v;
                    const py = topY + (botY - topY) * v;
                    points.push({ x: px * BODY_SCALE, y: py * BODY_SCALE, z: 1.5 });
                }
            }
        } else {
            for (let i = 0; i < 12; i++) points.push(OFF);
        }

        // --- LIMB WIDTH: 16 points ---
        const limbPairs = [[5,7],[7,9],[6,8],[8,10],[11,13],[13,15],[12,14],[14,16]];
        for (const [a, b] of limbPairs) {
            const mid = this._lerp2(kp[a], kp[b], 0.5);
            if (mid) {
                const dx = (kp[b].position3D.x - kp[a].position3D.x) * BODY_SCALE;
                const dy = (kp[b].position3D.y - kp[a].position3D.y) * BODY_SCALE;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const perpX = -dy / len * 2.0;
                const perpY = dx / len * 2.0;
                points.push({ x: mid.x + perpX, y: mid.y + perpY, z: mid.z });
                points.push({ x: mid.x - perpX, y: mid.y - perpY, z: mid.z });
            } else {
                points.push(OFF, OFF);
            }
        }

        // --- EXTRA LIMB INTERPOLATION: 16 points ---
        for (const [a, b] of limbPairs) {
            points.push(this._lerp2(kp[a], kp[b], 0.25) || OFF);
            points.push(this._lerp2(kp[a], kp[b], 0.75) || OFF);
        }

        // --- Fill remaining slots up to 256 ---
        const totalSlots = SAMPLE_SIZE * SAMPLE_SIZE;
        const validPoints = points.filter(p => p.y > -100);
        const fillSource = validPoints.length > 0 ? validPoints : points;
        while (points.length < totalSlots) {
            const src = fillSource[(points.length - 158) % fillSource.length];
            points.push({ x: src.x, y: src.y, z: src.z });
        }

        // Write to textures with smoothed velocity
        const smoothing = 0.12; // EMA factor — lower = smoother (0.12 ≈ ~8 frame rise/fall)
        for (let i = 0; i < totalSlots; i++) {
            const p = points[i];
            const i4 = i * 4;
            const i3 = i * 3;

            posData[i4] = p.x;
            posData[i4 + 1] = p.y;
            posData[i4 + 2] = p.z;
            posData[i4 + 3] = 1.0;

            // Raw frame delta
            const rawVx = p.x - this.prevPositions[i3];
            const rawVy = p.y - this.prevPositions[i3 + 1];
            const rawVz = p.z - this.prevPositions[i3 + 2];

            // Exponential moving average on velocity
            this.smoothedVelocity[i3] += (rawVx - this.smoothedVelocity[i3]) * smoothing;
            this.smoothedVelocity[i3 + 1] += (rawVy - this.smoothedVelocity[i3 + 1]) * smoothing;
            this.smoothedVelocity[i3 + 2] += (rawVz - this.smoothedVelocity[i3 + 2]) * smoothing;

            velData[i4] = this.smoothedVelocity[i3];
            velData[i4 + 1] = this.smoothedVelocity[i3 + 1];
            velData[i4 + 2] = this.smoothedVelocity[i3 + 2];
            velData[i4 + 3] = 0.0;

            this.prevPositions[i3] = p.x;
            this.prevPositions[i3 + 1] = p.y;
            this.prevPositions[i3 + 2] = p.z;
        }

        this.positionTexture.needsUpdate = true;
        this.velocityTexture.needsUpdate = true;
    }
}
