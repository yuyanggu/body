'use client';

import { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react';

// ============================================================
// AudioVisualizerGrid — Grid audio visualizer inspired by
// @agents-ui/agent-audio-visualizer-grid (LiveKit)
// Standalone implementation using Web Audio API AnalyserNode
// ============================================================

// --- Animation sequence generators ---

function generateConnectingSequence(rows, columns, radius) {
    const seq = [];
    const centerY = Math.floor(rows / 2);
    const topLeft = {
        x: Math.max(0, centerY - radius),
        y: Math.max(0, centerY - radius),
    };
    const bottomRight = {
        x: columns - 1 - topLeft.x,
        y: Math.min(rows - 1, centerY + radius),
    };
    for (let x = topLeft.x; x <= bottomRight.x; x++) seq.push({ x, y: topLeft.y });
    for (let y = topLeft.y + 1; y <= bottomRight.y; y++) seq.push({ x: bottomRight.x, y });
    for (let x = bottomRight.x - 1; x >= topLeft.x; x--) seq.push({ x, y: bottomRight.y });
    for (let y = bottomRight.y - 1; y > topLeft.y; y--) seq.push({ x: topLeft.x, y });
    return seq;
}

function generateListeningSequence(rows, columns) {
    const center = { x: Math.floor(columns / 2), y: Math.floor(rows / 2) };
    const noIndex = { x: -1, y: -1 };
    return [center, noIndex, noIndex, noIndex, noIndex, noIndex, noIndex, noIndex, noIndex];
}

function generateThinkingSequence(rows, columns) {
    const seq = [];
    const y = Math.floor(rows / 2);
    for (let x = 0; x < columns; x++) seq.push({ x, y });
    for (let x = columns - 1; x >= 0; x--) seq.push({ x, y });
    return seq;
}

// --- Custom hook: multiband volume from AnalyserNode ---

function useMultibandVolume(analyser, bands, isSpeaking) {
    const [volumes, setVolumes] = useState(() => new Array(bands).fill(0));
    const rafRef = useRef(null);

    useEffect(() => {
        if (!analyser || !isSpeaking) {
            setVolumes(new Array(bands).fill(0));
            return;
        }

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        // Focus on speech frequency range (~100-4000Hz)
        // With 44100Hz sample rate and fftSize 256: each bin ≈ 172Hz
        // Speech bins: roughly 1-24
        const loBin = 1;
        const hiBin = Math.min(Math.ceil(bufferLength * 0.2), bufferLength);
        const speechBins = hiBin - loBin;
        const binsPerBand = Math.max(1, Math.floor(speechBins / bands));

        function update() {
            analyser.getByteFrequencyData(dataArray);
            const newVolumes = new Array(bands);
            for (let b = 0; b < bands; b++) {
                let sum = 0;
                const start = loBin + b * binsPerBand;
                const end = Math.min(start + binsPerBand, hiBin);
                for (let i = start; i < end; i++) sum += dataArray[i];
                newVolumes[b] = sum / ((end - start) * 255);
            }
            setVolumes(newVolumes);
            rafRef.current = requestAnimationFrame(update);
        }

        rafRef.current = requestAnimationFrame(update);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [analyser, bands, isSpeaking]);

    return volumes;
}

// --- Grid animator hook ---

function useGridAnimator(state, rows, columns, interval, radius) {
    const [index, setIndex] = useState(0);
    const [sequence, setSequence] = useState(() => [
        { x: Math.floor(columns / 2), y: Math.floor(rows / 2) },
    ]);

    useEffect(() => {
        const clampedRadius = radius
            ? Math.min(radius, Math.floor(Math.max(rows, columns) / 2))
            : Math.floor(Math.max(rows, columns) / 2);

        if (state === 'thinking') {
            setSequence(generateThinkingSequence(rows, columns));
        } else if (state === 'connecting' || state === 'initializing') {
            setSequence([...generateConnectingSequence(rows, columns, clampedRadius)]);
        } else if (state === 'listening') {
            setSequence(generateListeningSequence(rows, columns));
        } else {
            setSequence([{ x: Math.floor(columns / 2), y: Math.floor(rows / 2) }]);
        }
        setIndex(0);
    }, [state, rows, columns, radius]);

    useEffect(() => {
        if (state === 'speaking') return;
        const id = setInterval(() => setIndex((prev) => prev + 1), interval);
        return () => clearInterval(id);
    }, [interval, state, sequence.length]);

    return sequence[index % sequence.length] ?? { x: Math.floor(columns / 2), y: Math.floor(rows / 2) };
}

// --- Grid cell ---

const GridCell = memo(function GridCell({
    index, state, interval, rowCount, columnCount, volumeBands, highlightedCoordinate,
}) {
    const col = index % columnCount;
    const row = Math.floor(index / columnCount);

    let isHighlighted = false;
    let transitionDuration;

    if (state === 'speaking') {
        const rowMidPoint = Math.floor(rowCount / 2);
        const volumeChunks = 1 / (rowMidPoint + 1);
        const distanceToMid = Math.abs(rowMidPoint - row);
        const threshold = distanceToMid * volumeChunks;
        isHighlighted = (volumeBands[col] ?? 0) >= threshold;
    } else {
        isHighlighted = highlightedCoordinate.x === col && highlightedCoordinate.y === row;
        transitionDuration = interval / (isHighlighted ? 1000 : 100);
    }

    return (
        <div
            className="viz-grid-cell"
            data-highlighted={isHighlighted}
            style={transitionDuration != null ? { transitionDuration: `${transitionDuration}s` } : undefined}
        />
    );
});

// --- Main component ---

export default function AudioVisualizerGrid({
    analyser = null,
    state = 'idle',
    rowCount = 19,
    columnCount = 15,
    radius = 60,
    interval = 100,
    color = '#8c00ff',
    className = '',
}) {
    const isSpeaking = state === 'speaking';
    const volumeBands = useMultibandVolume(analyser, columnCount, isSpeaking);
    const highlightedCoordinate = useGridAnimator(state, rowCount, columnCount, interval, radius);

    const items = useMemo(
        () => new Array(rowCount * columnCount).fill(0).map((_, i) => i),
        [rowCount, columnCount],
    );

    return (
        <div
            className={`viz-grid ${className}`}
            data-state={state}
            style={{
                gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                color,
            }}
        >
            {items.map((idx) => (
                <GridCell
                    key={idx}
                    index={idx}
                    state={state}
                    interval={interval}
                    rowCount={rowCount}
                    columnCount={columnCount}
                    volumeBands={volumeBands}
                    highlightedCoordinate={highlightedCoordinate}
                />
            ))}
        </div>
    );
}
