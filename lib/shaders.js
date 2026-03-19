// ============================================================
// GLSL Shaders — simplex noise, curl noise, particle rendering
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
export const positionShaderFrag = curl4GLSL + `
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
uniform float bodyActivity;
uniform float gridSpacing;

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

    // Modulate behaviour by body activity (0 = still, 1 = moving)
    float activityCurl = 0.2 + bodyActivity * 0.8;
    float activityWind = 0.1 + bodyActivity * 0.9;
    float activityAttract = 1.0 + (1.0 - bodyActivity) * 0.5;

    if (life < 0.0) {
        positionInfo = texture2D(textureDefaultPosition, uv);
        vec3 spawnOffset = positionInfo.xyz * 3.0;
        position = followPosition + spawnOffset;
        life = 0.5 + fract(positionInfo.w * 21.4131 + time);
    } else {
        vec3 toTarget = followPosition - position;
        position += toTarget * (0.005 + life * 0.015) * attraction * activityAttract * (1.0 - smoothstep(50.0, 350.0, length(toTarget))) * speed * dt;

        float drift = 1.0 - life;
        vec3 curlNoise = curl(position * curlSize, time * 1.3, 0.18);
        position += (wind * activityWind + curlNoise * speed * 1.2 * activityCurl) * drift * dt;

        vec3 nearestGrid = round(position / gridSpacing) * gridSpacing;
        float gridPull = (1.0 - smoothstep(0.0, 0.35, bodyActivity)) * 0.04;
        position += (nearestGrid - position) * gridPull * dt;
    }

    gl_FragColor = vec4(position, life);
}
`;

// --- Particle rendering vertex shader ---
export const particlesVertGLSL = `
precision highp float;
#include <common>
uniform sampler2D texturePosition;
uniform sampler2D textureSortKey;
uniform sampler2D textureMeshVelocities;
uniform float useSortKey;
uniform float pointSize;
uniform vec2 sortResolution;
uniform float meshSampleSize;
uniform mat4 lightViewMatrix;
uniform mat4 lightProjectionMatrix;

varying float vLife;
varying float vVelocity;
varying float vColorIndex;
varying vec4 vLightSpacePos;

void main() {
    vec2 origUV = position.xy;
    vec2 posUV = origUV;

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

    // Recompute keypoint hash to sample velocity (same hash as position shader)
    float hashVal = fract(sin(dot(posUV, vec2(12.9898, 78.233))) * 43758.5453);
    vec2 meshUV = vec2(fract(hashVal * 127.1), fract(hashVal * 311.7));
    meshUV = (floor(meshUV * meshSampleSize) + 0.5) / meshSampleSize;
    vec4 meshVel = texture2D(textureMeshVelocities, meshUV);
    vVelocity = length(meshVel.xyz);

    vLife = positionInfo.w;
    vColorIndex = fract(posUV.x * 431.0 + posUV.y * 7697.0);

    float sizeRand = 0.1 + 0.6 * fract(sin(dot(posUV, vec2(53.127, 97.863))) * 43758.5453);
    gl_PointSize = pointSize * sizeRand / length(mvPosition.xyz) * smoothstep(0.0, 0.2, positionInfo.w);

    vLightSpacePos = lightProjectionMatrix * lightViewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;
}
`;

// --- Particle rendering fragment shader ---
export const particlesFragGLSL = `
precision highp float;
#include <common>

varying float vLife;
varying float vVelocity;
varying float vColorIndex;
varying vec4 vLightSpacePos;

uniform vec3 lightDirection;
uniform sampler2D opacityTexture;
uniform float shadowDensity;

// Velocity-driven color ramp (CHOP-to-color mapping)
vec3 velocityRamp(float vel, float variation) {
    // 5-stop ramp: teal → blue → purple → magenta → hot pink
    vec3 c0 = vec3(0.05, 0.55, 0.7);   // still — cool teal
    vec3 c1 = vec3(0.15, 0.25, 1.2);   // slow — deep blue
    vec3 c2 = vec3(0.55, 0.1, 1.2);    // medium — purple
    vec3 c3 = vec3(1.2, 0.12, 0.55);   // fast — magenta
    vec3 c4 = vec3(1.4, 0.4, 0.3);     // burst — hot amber

    float t = clamp(vel, 0.0, 1.0);
    // Per-particle variation shifts position on ramp
    t = clamp(t + (variation - 0.5) * 0.15, 0.0, 1.0);

    vec3 color;
    if (t < 0.25) {
        color = mix(c0, c1, t * 4.0);
    } else if (t < 0.5) {
        color = mix(c1, c2, (t - 0.25) * 4.0);
    } else if (t < 0.75) {
        color = mix(c2, c3, (t - 0.5) * 4.0);
    } else {
        color = mix(c3, c4, (t - 0.75) * 4.0);
    }

    // Life-stage brightness: fresh particles slightly brighter
    color *= 0.85 + 0.15 * smoothstep(0.0, 0.5, vel);

    return color;
}

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

    // Data-driven color: velocity magnitude → color ramp
    // Gentle curve — sqrt compresses spikes, lower multiplier avoids flashing
    float velNorm = sqrt(clamp(vVelocity * 1.2, 0.0, 1.0));
    vec3 baseColor = velocityRamp(velNorm, vColorIndex);

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
export const sortKeyFragGLSL = `
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
export const bitonicSortFragGLSL = `
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
export const opacityVertGLSL = `
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
export const opacityFragGLSL = `
precision highp float;

varying float vLife;

void main() {
    vec2 coord = gl_PointCoord * 2.0 - 1.0;
    if (dot(coord, coord) > 1.0) discard;

    float alpha = (1.0 - dot(coord, coord)) * smoothstep(0.0, 0.5, vLife);
    gl_FragColor = vec4(alpha * 0.15, 0.0, 0.0, 1.0);
}
`;
