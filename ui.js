// ============================================================
// UI Setup — exercise grid, HUD, controls, API key modal
// ============================================================

import { EXERCISES } from './exercises.js';
import { config } from './config.js';
import { bodyState, setupCamera, setupPoseDetection, hasDetector } from './pose-detection.js';

export function setupUI(deps) {
    const { exerciseAnalyzer, aiCompanion, controls, camera, renderer, composer, bloomPass } = deps;

    populateExerciseGrid(exerciseAnalyzer, aiCompanion);
    setupApiKeyUI(aiCompanion);

    document.getElementById('end-session-btn').addEventListener('click', e => {
        e.stopPropagation();
        endSession(exerciseAnalyzer, aiCompanion);
    });

    // Test mode toggle
    const testToggle = document.getElementById('test-mode-toggle');
    testToggle.checked = config.testMode;
    testToggle.addEventListener('change', e => {
        e.stopPropagation();
        config.testMode = testToggle.checked;
        if (config.testMode) {
            bodyState.isTracking = true;
            bodyState.presence = 1.0;
        } else {
            bodyState.isTracking = false;
            bodyState.presence = 0;
            if (!hasDetector()) {
                setupCamera().then(() => setupPoseDetection()).catch(err => {
                    console.warn('Camera setup failed:', err);
                });
            }
        }
    });

    // Keypoints overlay toggle
    const kpToggle = document.getElementById('keypoints-toggle');
    kpToggle.addEventListener('change', e => {
        e.stopPropagation();
        config.showKeypoints = kpToggle.checked;
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

    // AI companion text updates
    aiCompanion.onTextUpdate = (text) => {
        const el = document.getElementById('hud-ai-text');
        if (el) el.textContent = text;
    };
}

function populateExerciseGrid(exerciseAnalyzer, aiCompanion) {
    const grid = document.getElementById('exercise-grid');
    EXERCISES.forEach(ex => {
        const card = document.createElement('div');
        card.className = 'exercise-card';
        card.innerHTML = `
            <div class="exercise-card-icon">${ex.icon}</div>
            <div class="exercise-card-name">${ex.name}</div>
            <div class="exercise-card-desc">${ex.description}</div>
        `;
        card.addEventListener('click', () => startExercise(ex, exerciseAnalyzer, aiCompanion));
        grid.appendChild(card);
    });
}

function startExercise(exercise, exerciseAnalyzer, aiCompanion) {
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

function endSession(exerciseAnalyzer, aiCompanion) {
    exerciseAnalyzer.stop();
    aiCompanion.reset();
    config.appMode = 'select';

    document.getElementById('exercise-hud').classList.add('hidden');
    document.getElementById('end-session-btn').classList.add('hidden');
    document.getElementById('exercise-overlay').classList.remove('hidden');
    document.getElementById('hud-voice-indicator').classList.add('hidden');
}

export function updateExerciseHUD(state, aiCompanion) {
    if (!state) return;
    document.getElementById('hud-reps').textContent = state.repCount;
    document.getElementById('hud-angle').textContent = state.currentAngle > 0 ? `${state.currentAngle}°` : '—';
    document.getElementById('hud-form-cue').textContent = state.formCue || '';

    const voiceInd = document.getElementById('hud-voice-indicator');
    if (aiCompanion.isSpeaking) voiceInd.classList.remove('hidden');
    else voiceInd.classList.add('hidden');
}

export function updateStatusUI() {
    const statusDot = document.querySelector('.status-dot');
    const trackingText = document.getElementById('tracking-text');

    if (bodyState.isTracking) { statusDot.classList.add('tracking'); trackingText.textContent = 'Tracking'; }
    else { statusDot.classList.remove('tracking'); trackingText.textContent = hasDetector() || config.testMode ? 'No body' : 'Loading...'; }

    document.getElementById('metric-velocity').style.width = `${bodyState.globalVelocity * 100}%`;
    document.getElementById('metric-range').style.width = `${bodyState.globalRangeOfMotion * 100}%`;
    document.getElementById('metric-jitter').style.width = `${bodyState.globalJitter * 100}%`;
}

function setupApiKeyUI(aiCompanion) {
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
