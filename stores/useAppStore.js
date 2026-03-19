import { create } from 'zustand';
import { config } from '../lib/config.js';

const useAppStore = create((set, get) => ({
    paused: config.paused,
    appMode: config.appMode,
    testMode: config.testMode,
    showKeypoints: config.showKeypoints,
    showDataOverlay: config.showDataOverlay,
    activePaletteIndex: config.activePaletteIndex,
    sensitivity: config.sensitivity,

    loadingVisible: true,
    loadingMessage: 'Loading pose detection model...',

    togglePause: () => {
        const next = !get().paused;
        config.paused = next;
        set({ paused: next });
    },

    setAppMode: (mode) => {
        config.appMode = mode;
        set({ appMode: mode });
    },

    setTestMode: (on) => {
        config.testMode = on;
        set({ testMode: on });
    },

    setShowKeypoints: (on) => {
        config.showKeypoints = on;
        set({ showKeypoints: on });
    },

    setShowDataOverlay: (on) => {
        config.showDataOverlay = on;
        set({ showDataOverlay: on });
    },

    setLoading: (visible, message) => {
        set({ loadingVisible: visible, ...(message !== undefined && { loadingMessage: message }) });
    },
}));

export default useAppStore;
