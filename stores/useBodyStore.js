import { create } from 'zustand';

const useBodyStore = create((set) => ({
    isTracking: false,
    globalVelocity: 0,
    globalRangeOfMotion: 0,
    globalJitter: 0,

    updateMetrics: (bodyState) => {
        set({
            isTracking: bodyState.isTracking,
            globalVelocity: bodyState.globalVelocity,
            globalRangeOfMotion: bodyState.globalRangeOfMotion,
            globalJitter: bodyState.globalJitter,
        });
    },
}));

export default useBodyStore;
