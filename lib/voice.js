// ============================================================
// voice.js — OpenAI TTS Playback
// Text-to-speech via OpenAI API with audio queue management
// ============================================================

export class Voice {
    constructor() {
        this._queue = [];
        this._speaking = false;
        this._currentAudio = null;
        this._apiKey = (typeof localStorage !== 'undefined' && localStorage.getItem('openai_api_key')) || '';
        this._audioContext = null;
        this._analyser = null;
        this.onAnalyserReady = null;
        this._serverKeyAvailable = false;
        this._checkServerKey();
    }

    async _checkServerKey() {
        try {
            const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
            // 400 from OpenAI means the proxy works (key is set), 500 means no key
            this._serverKeyAvailable = res.status !== 500;
        } catch {
            this._serverKeyAvailable = false;
        }
    }

    get analyser() {
        return this._analyser;
    }

    get audioContext() {
        return this._audioContext;
    }

    _ensureAudioContext() {
        if (!this._audioContext) {
            this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this._analyser = this._audioContext.createAnalyser();
            this._analyser.fftSize = 256;
            this._analyser.smoothingTimeConstant = 0.7;
            this._analyser.connect(this._audioContext.destination);
            if (this.onAnalyserReady) this.onAnalyserReady(this._analyser);
        }
    }

    get apiKey() {
        return this._apiKey;
    }

    set apiKey(key) {
        this._apiKey = key;
        if (typeof localStorage !== 'undefined') localStorage.setItem('openai_api_key', key);
    }

    get hasKey() {
        return this._apiKey.length > 10 || this._serverKeyAvailable;
    }

    get isSpeaking() {
        return this._speaking;
    }

    async speak(text) {
        if (!this.hasKey || !text) return;

        // Queue if currently speaking
        if (this._speaking) {
            this._queue.push(text);
            return;
        }

        this._speaking = true;

        try {
            const payload = {
                model: 'tts-1',
                input: text,
                voice: 'nova',
                speed: 0.98,
            };

            const useProxy = !this._apiKey;
            const url = useProxy ? '/api/tts' : 'https://api.openai.com/v1/audio/speech';
            const headers = { 'Content-Type': 'application/json' };
            if (!useProxy) headers['Authorization'] = `Bearer ${this._apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                console.error('TTS error:', response.status);
                this._speaking = false;
                return;
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            this._currentAudio = audio;

            // Connect to Web Audio API analyser for visualization
            this._ensureAudioContext();
            if (this._audioContext.state === 'suspended') {
                await this._audioContext.resume();
            }
            const source = this._audioContext.createMediaElementSource(audio);
            source.connect(this._analyser);

            await new Promise((resolve) => {
                audio.onended = () => {
                    source.disconnect();
                    URL.revokeObjectURL(url);
                    resolve();
                };
                audio.onerror = () => {
                    source.disconnect();
                    URL.revokeObjectURL(url);
                    resolve();
                };
                audio.play().catch(resolve);
            });
        } catch (err) {
            console.error('TTS error:', err);
        }

        this._speaking = false;
        this._currentAudio = null;

        // Process queue
        if (this._queue.length > 0) {
            const next = this._queue.shift();
            this.speak(next);
        }
    }

    stop() {
        if (this._currentAudio) {
            this._currentAudio.pause();
            this._currentAudio = null;
        }
        this._queue = [];
        this._speaking = false;
    }
}
