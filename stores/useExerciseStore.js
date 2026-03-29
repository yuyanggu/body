import { create } from 'zustand';

const useExerciseStore = create((set) => ({
    exerciseName: '',
    repCount: 0,
    currentAngle: 0,
    formCue: '',
    aiText: '',
    isSpeaking: false,
    voiceAnalyser: null,

    setVoiceAnalyser: (analyser) => set({ voiceAnalyser: analyser }),

    updateFromState: (exState, isSpeaking) => {
        set({
            exerciseName: exState.exerciseName || '',
            repCount: exState.repCount,
            currentAngle: exState.currentAngle,
            formCue: exState.formCue || '',
            isSpeaking: !!isSpeaking,
        });
    },

    setAiText: (text) => {
        set({ aiText: text });
    },

    reset: () => {
        set({
            exerciseName: '',
            repCount: 0,
            currentAngle: 0,
            formCue: '',
            aiText: '',
            isSpeaking: false,
        });
    },
}));

export default useExerciseStore;
