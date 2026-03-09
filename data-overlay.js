// ============================================================
// Data Overlay — algorithmic keypoint data visualization
// 2D canvas overlay showing live body tracking telemetry
// ============================================================

import { CONFIDENCE_THRESHOLD, BODY_SCALE } from './config.js';
import { SKELETON_CONNECTIONS } from './keypoint-sampler.js';

const KEYPOINT_LABELS = [
    'NOSE', 'L_EYE', 'R_EYE', 'L_EAR', 'R_EAR',
    'L_SHLDR', 'R_SHLDR', 'L_ELBW', 'R_ELBW',
    'L_WRST', 'R_WRST', 'L_HIP', 'R_HIP',
    'L_KNEE', 'R_KNEE', 'L_ANKL', 'R_ANKL',
];

// Joints that get expanded data panels
const MAJOR_JOINTS = new Set([5, 6, 7, 8, 11, 12, 13, 14]);

// Label offset directions to avoid overlap (normalized screen offsets)
const LABEL_OFFSETS = [
    [0, -1],     // 0  nose       — above
    [-1, -1],    // 1  l_eye      — upper-left
    [1, -1],     // 2  r_eye      — upper-right
    [-1, 0],     // 3  l_ear      — left
    [1, 0],      // 4  r_ear      — right
    [-1, -0.5],  // 5  l_shoulder — upper-left
    [1, -0.5],   // 6  r_shoulder — upper-right
    [-1, 0],     // 7  l_elbow    — left
    [1, 0],      // 8  r_elbow    — right
    [-1, 0.5],   // 9  l_wrist    — lower-left
    [1, 0.5],    // 10 r_wrist    — lower-right
    [-1, 0],     // 11 l_hip      — left
    [1, 0],      // 12 r_hip      — right
    [-1, 0.5],   // 13 l_knee     — lower-left
    [1, 0.5],    // 14 r_knee     — lower-right
    [-1, 0.5],   // 15 l_ankle    — lower-left
    [1, 0.5],    // 16 r_ankle    — lower-right
];

export function createDataOverlay() {
    const canvas = document.createElement('canvas');
    canvas.id = 'data-overlay';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;';
    document.body.appendChild(canvas);
    return canvas;
}

export function updateDataOverlay(canvas, bodyState, camera, elapsed) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, w, h);

    if (!bodyState.isTracking) return;

    // Project all keypoints to screen space
    const screenPts = [];
    for (let i = 0; i < 17; i++) {
        const kp = bodyState.keypoints[i];
        if (kp.confidence >= CONFIDENCE_THRESHOLD) {
            const x = kp.position3D.x * BODY_SCALE;
            const y = kp.position3D.y * BODY_SCALE;
            const z = kp.position3D.z * BODY_SCALE;
            const projected = projectToScreen(x, y, z, camera, w, h);
            screenPts.push({ ...projected, idx: i, kp });
        } else {
            screenPts.push(null);
        }
    }

    // Draw connection lines (dashed)
    drawConnections(ctx, screenPts, elapsed);

    // Draw node markers and data labels
    for (let i = 0; i < 17; i++) {
        if (!screenPts[i]) continue;
        const pt = screenPts[i];
        drawNodeMarker(ctx, pt, elapsed, i);
        drawDataLabel(ctx, pt, i, elapsed);
    }

    // Draw global telemetry header
    drawTelemetryHeader(ctx, bodyState, elapsed, w);
}

function projectToScreen(x, y, z, camera, screenW, screenH) {
    // Use camera matrices to project 3D → 2D
    const projMatrix = camera.projectionMatrix;
    const viewMatrix = camera.matrixWorldInverse;

    // Apply view matrix
    const vx = viewMatrix.elements[0] * x + viewMatrix.elements[4] * y + viewMatrix.elements[8] * z + viewMatrix.elements[12];
    const vy = viewMatrix.elements[1] * x + viewMatrix.elements[5] * y + viewMatrix.elements[9] * z + viewMatrix.elements[13];
    const vz = viewMatrix.elements[2] * x + viewMatrix.elements[6] * y + viewMatrix.elements[10] * z + viewMatrix.elements[14];

    // Apply projection matrix
    const pw = projMatrix.elements[3] * vx + projMatrix.elements[7] * vy + projMatrix.elements[11] * vz + projMatrix.elements[15];
    const px = (projMatrix.elements[0] * vx + projMatrix.elements[4] * vy + projMatrix.elements[8] * vz + projMatrix.elements[12]) / pw;
    const py = (projMatrix.elements[1] * vx + projMatrix.elements[5] * vy + projMatrix.elements[9] * vz + projMatrix.elements[13]) / pw;

    return {
        sx: (px * 0.5 + 0.5) * screenW,
        sy: (-py * 0.5 + 0.5) * screenH,
    };
}

function drawConnections(ctx, screenPts, elapsed) {
    ctx.save();
    const dashPhase = elapsed * 30;

    for (const [a, b] of SKELETON_CONNECTIONS) {
        if (!screenPts[a] || !screenPts[b]) continue;

        const ptA = screenPts[a];
        const ptB = screenPts[b];
        const dx = ptB.sx - ptA.sx;
        const dy = ptB.sy - ptA.sy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Animated dashed line
        ctx.beginPath();
        ctx.setLineDash([4, 6]);
        ctx.lineDashOffset = -dashPhase;
        ctx.strokeStyle = 'rgba(180, 200, 140, 0.25)';
        ctx.lineWidth = 1;
        ctx.moveTo(ptA.sx, ptA.sy);
        ctx.lineTo(ptB.sx, ptB.sy);
        ctx.stroke();

        // Distance tick at midpoint
        if (dist > 60) {
            const mx = (ptA.sx + ptB.sx) / 2;
            const my = (ptA.sy + ptB.sy) / 2;
            const angle = Math.atan2(dy, dx);

            ctx.save();
            ctx.translate(mx, my);
            ctx.rotate(angle);

            // Perpendicular tick
            ctx.beginPath();
            ctx.setLineDash([]);
            ctx.strokeStyle = 'rgba(180, 200, 140, 0.15)';
            ctx.moveTo(0, -3);
            ctx.lineTo(0, 3);
            ctx.stroke();

            ctx.restore();
        }
    }
    ctx.restore();
}

function drawNodeMarker(ctx, pt, elapsed, index) {
    const { sx, sy, kp } = pt;
    const isMajor = MAJOR_JOINTS.has(index);
    const size = isMajor ? 8 : 5;
    const pulse = Math.sin(elapsed * 2 + index * 0.7) * 0.15 + 0.85;

    ctx.save();

    // Outer ring (confidence indicator)
    const conf = kp.confidence;
    const ringAlpha = 0.15 + conf * 0.35;
    ctx.beginPath();
    ctx.arc(sx, sy, size + 4, 0, Math.PI * 2 * conf);
    ctx.strokeStyle = `rgba(180, 210, 100, ${ringAlpha * pulse})`;
    ctx.lineWidth = 0.8;
    ctx.setLineDash([]);
    ctx.stroke();

    // Crosshair
    const chSize = size + 1;
    ctx.beginPath();
    ctx.strokeStyle = `rgba(200, 220, 120, ${0.5 * pulse})`;
    ctx.lineWidth = 0.7;

    // Corner brackets instead of full crosshair
    const bLen = 3;
    // Top-left
    ctx.moveTo(sx - chSize, sy - chSize + bLen);
    ctx.lineTo(sx - chSize, sy - chSize);
    ctx.lineTo(sx - chSize + bLen, sy - chSize);
    // Top-right
    ctx.moveTo(sx + chSize - bLen, sy - chSize);
    ctx.lineTo(sx + chSize, sy - chSize);
    ctx.lineTo(sx + chSize, sy - chSize + bLen);
    // Bottom-right
    ctx.moveTo(sx + chSize, sy + chSize - bLen);
    ctx.lineTo(sx + chSize, sy + chSize);
    ctx.lineTo(sx + chSize - bLen, sy + chSize);
    // Bottom-left
    ctx.moveTo(sx - chSize + bLen, sy + chSize);
    ctx.lineTo(sx - chSize, sy + chSize);
    ctx.lineTo(sx - chSize, sy + chSize - bLen);
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 220, 120, ${0.7 * pulse})`;
    ctx.fill();

    // Velocity burst (radial lines when moving fast)
    if (kp.velocity > 0.3 && isMajor) {
        const velAlpha = Math.min(1, kp.velocity * 0.8);
        const rays = 4;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 240, 140, ${velAlpha * 0.3})`;
        ctx.lineWidth = 0.5;
        for (let r = 0; r < rays; r++) {
            const a = (r / rays) * Math.PI * 2 + elapsed * 1.5;
            const inner = size + 6;
            const outer = size + 6 + kp.velocity * 15;
            ctx.moveTo(sx + Math.cos(a) * inner, sy + Math.sin(a) * inner);
            ctx.lineTo(sx + Math.cos(a) * outer, sy + Math.sin(a) * outer);
        }
        ctx.stroke();
    }

    ctx.restore();
}

function drawDataLabel(ctx, pt, index, elapsed) {
    const { sx, sy, kp } = pt;
    const isMajor = MAJOR_JOINTS.has(index);
    const offset = LABEL_OFFSETS[index];
    const dist = isMajor ? 45 : 30;

    const lx = sx + offset[0] * dist;
    const ly = sy + offset[1] * dist;

    ctx.save();
    ctx.font = '9px monospace';

    // Leader line from node to label
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(180, 200, 140, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 3]);
    ctx.moveTo(sx, sy);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.setLineDash([]);

    // Small tick at label end
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(180, 200, 140, 0.3)';
    ctx.lineWidth = 0.5;
    const tickDir = offset[0] >= 0 ? 1 : -1;
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + tickDir * 8, ly);
    ctx.stroke();

    const textX = lx + tickDir * 11;
    const textAnchor = tickDir > 0 ? 'left' : 'right';
    ctx.textAlign = textAnchor;

    if (isMajor) {
        drawMajorLabel(ctx, textX, ly, kp, index, elapsed);
    } else {
        drawMinorLabel(ctx, textX, ly, kp, index);
    }

    ctx.restore();
}

function drawMinorLabel(ctx, x, y, kp, index) {
    // Joint name
    ctx.fillStyle = 'rgba(180, 200, 140, 0.6)';
    ctx.fillText(KEYPOINT_LABELS[index], x, y - 2);

    // Coordinates
    ctx.fillStyle = 'rgba(180, 200, 140, 0.35)';
    const px = kp.position3D.x.toFixed(1);
    const py = kp.position3D.y.toFixed(1);
    ctx.fillText(`${px}, ${py}`, x, y + 9);
}

function drawMajorLabel(ctx, x, y, kp, index, elapsed) {
    const align = ctx.textAlign;
    const dir = align === 'left' ? 1 : -1;

    // Joint name — brighter
    ctx.fillStyle = 'rgba(200, 220, 120, 0.8)';
    ctx.font = '10px monospace';
    ctx.fillText(KEYPOINT_LABELS[index], x, y - 14);

    // Coordinate readout
    ctx.font = '9px monospace';
    ctx.fillStyle = 'rgba(180, 200, 140, 0.5)';
    const px = kp.position3D.x.toFixed(2);
    const py = kp.position3D.y.toFixed(2);
    ctx.fillText(`x: ${px}  y: ${py}`, x, y - 3);

    // Velocity
    const vel = kp.velocity.toFixed(2);
    ctx.fillStyle = kp.velocity > 0.5 ? 'rgba(255, 220, 100, 0.6)' : 'rgba(180, 200, 140, 0.35)';
    ctx.fillText(`vel: ${vel}`, x, y + 8);

    // Confidence bar
    const barX = align === 'left' ? x : x - 40;
    const barY = y + 13;
    const barW = 40;
    const barH = 2;

    ctx.fillStyle = 'rgba(180, 200, 140, 0.1)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = 'rgba(200, 220, 120, 0.4)';
    ctx.fillRect(barX, barY, barW * kp.confidence, barH);

    // Velocity sparkline
    if (kp.velocityHistory && kp.velocityHistory.length > 2) {
        const history = kp.velocityHistory;
        const sparkX = barX;
        const sparkY = barY + 6;
        const sparkW = barW;
        const sparkH = 10;
        const maxV = Math.max(0.1, ...history);

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(200, 220, 120, 0.3)';
        ctx.lineWidth = 0.7;
        for (let i = 0; i < history.length; i++) {
            const hx = sparkX + (i / (history.length - 1)) * sparkW;
            const hy = sparkY + sparkH - (history[i] / maxV) * sparkH;
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
        }
        ctx.stroke();

        // Current value dot
        const lastX = sparkX + sparkW;
        const lastY = sparkY + sparkH - (history[history.length - 1] / maxV) * sparkH;
        ctx.beginPath();
        ctx.arc(lastX, lastY, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 240, 140, 0.6)';
        ctx.fill();
    }
}

function drawTelemetryHeader(ctx, bodyState, elapsed, w) {
    ctx.save();
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';

    const x = w - 240;
    const y = 20;

    // Scan line effect
    const scanY = (elapsed * 40) % 30;
    ctx.fillStyle = 'rgba(180, 200, 140, 0.03)';
    ctx.fillRect(x - 10, y - 12 + scanY, 200, 1);

    // Telemetry readout
    ctx.fillStyle = 'rgba(180, 200, 140, 0.4)';
    const activeKps = bodyState.keypoints.filter(k => k.confidence >= CONFIDENCE_THRESHOLD).length;
    ctx.fillText(`KEYPOINTS: ${activeKps}/17`, x + 185, y);
    ctx.fillText(`VEL: ${bodyState.globalVelocity.toFixed(3)}`, x + 185, y + 12);
    ctx.fillText(`JTR: ${bodyState.globalJitter.toFixed(3)}`, x + 185, y + 24);

    // Animated frame counter
    ctx.fillStyle = 'rgba(180, 200, 140, 0.2)';
    const frame = Math.floor(elapsed * 60);
    ctx.fillText(`FRM: ${frame.toString().padStart(6, '0')}`, x + 185, y + 36);

    ctx.restore();
}
