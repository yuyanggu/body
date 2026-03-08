// ============================================================
// GPU Particle System — ParticleSystem, ParticleSort, OpacityPass
// ============================================================

import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import {
    positionShaderFrag, particlesVertGLSL, particlesFragGLSL,
    sortKeyFragGLSL, bitonicSortFragGLSL,
    opacityVertGLSL, opacityFragGLSL,
} from './shaders.js';
import { PARTICLE_SIZE, SORT_PASSES_PER_FRAME, OPACITY_MAP_SIZE, ORTHO_SIZE, SAMPLE_SIZE } from './config.js';

// ============================================================
// OpacityPass — shadow accumulation from light POV
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
// ParticleSort — GPU bitonic sort for depth-correct blending
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
// ParticleSystem — GPU-computed particle swarm
// ============================================================

export class ParticleSystem {
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
        this.positionUniforms.bodyActivity = { value: 0.0 };
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

    update(delta, elapsed, keypointSampler, camera, lightPos, bodyActivity) {
        this.positionUniforms.initAnimation.value = Math.min(
            1.0, this.positionUniforms.initAnimation.value + delta * 0.5
        );
        this.positionUniforms.time.value = elapsed;
        this.positionUniforms.dt.value = delta * 60.0;
        // Smooth body activity to avoid jitter
        this.positionUniforms.bodyActivity.value +=
            (bodyActivity - this.positionUniforms.bodyActivity.value) * Math.min(1.0, delta * 3.0);

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
