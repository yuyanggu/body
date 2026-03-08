function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

function isTracked(keypoint, confidenceThreshold) {
    return (keypoint?.confidence || 0) >= confidenceThreshold;
}

function averageVelocity(keypoints, indices, confidenceThreshold) {
    let total = 0;
    let count = 0;

    for (const index of indices) {
        const keypoint = keypoints[index];
        if (!isTracked(keypoint, confidenceThreshold)) continue;
        total += keypoint.velocity || 0;
        count++;
    }

    return count ? total / count : 0;
}

function maxVelocity(keypoints, indices, confidenceThreshold) {
    let max = 0;

    for (const index of indices) {
        const keypoint = keypoints[index];
        if (!isTracked(keypoint, confidenceThreshold)) continue;
        max = Math.max(max, keypoint.velocity || 0);
    }

    return max;
}

export function computeAnatomicalMotionState(keypoints, confidenceThreshold = 0.3) {
    const torsoIndices = [5, 6, 11, 12];
    const kneeIndices = [13, 14];
    const limbIndices = [7, 8, 9, 10, 13, 14, 15, 16];

    const trackedTorsoCount = torsoIndices.filter(index => isTracked(keypoints[index], confidenceThreshold)).length;
    if (trackedTorsoCount < 2) {
        return {
            hasTorso: false,
            silhouetteCohesion: 0.35,
            haloIntensity: 0,
            kneeEmphasis: 0,
            limbActivity: 0,
            torsoStability: 0.35,
        };
    }

    const torsoVelocity = averageVelocity(keypoints, torsoIndices, confidenceThreshold);
    const kneeVelocity = averageVelocity(keypoints, kneeIndices, confidenceThreshold);
    const limbVelocity = maxVelocity(keypoints, limbIndices, confidenceThreshold);

    const torsoStability = 1 - clamp01(torsoVelocity / 0.4);
    const kneeEmphasis = clamp01(kneeVelocity / 1.2);
    const limbActivity = clamp01(limbVelocity / 1.4);
    const haloIntensity = clamp01(limbActivity * 0.45 + kneeEmphasis * 0.35 + (1 - torsoStability) * 0.2);
    const silhouetteCohesion = clamp01(torsoStability * 0.72 + (1 - haloIntensity) * 0.28);

    return {
        hasTorso: true,
        silhouetteCohesion,
        haloIntensity,
        kneeEmphasis,
        limbActivity,
        torsoStability,
    };
}

export function computeAtmosphereState(motionState, globalState) {
    const silhouette = clamp01(motionState?.silhouetteCohesion ?? 0.35);
    const halo = clamp01(motionState?.haloIntensity ?? 0);
    const knee = clamp01(motionState?.kneeEmphasis ?? 0);
    const limb = clamp01(motionState?.limbActivity ?? 0);
    const velocity = clamp01(globalState?.velocity ?? 0);
    const jitter = clamp01(globalState?.jitter ?? 0);
    const rangeOfMotion = clamp01(globalState?.rangeOfMotion ?? 0);
    const presence = clamp01(globalState?.presence ?? 0);

    const bloomStrength = 0.55 + rangeOfMotion * 0.35 + halo * 0.32 + knee * 0.08;
    const afterimageDamp = clamp01(0.9 - velocity * 0.08 - halo * 0.06 - jitter * 0.04);
    const fogDensity = 0.0015 + halo * 0.0009 + rangeOfMotion * 0.0005 + (1 - silhouette) * 0.00035;
    const vignetteStrength = 0.16 + (1 - silhouette) * 0.08 + halo * 0.05 + limb * 0.025;
    const presenceGain = 0.75 + presence * 0.25;

    return {
        bloomStrength: bloomStrength * presenceGain,
        afterimageDamp,
        fogDensity,
        vignetteStrength,
    };
}
