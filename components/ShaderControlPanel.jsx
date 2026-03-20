'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

const LAYER_SECTIONS = {
    particles: {
        label: 'Particles',
        controls: [
            { key: 'speed', label: 'Speed', min: 0, max: 10, step: 0.1, default: 1.7 },
            { key: 'dieSpeed', label: 'Die Speed', min: 0, max: 0.1, step: 0.001, default: 0.01 },
            { key: 'curlSize', label: 'Curl Size', min: 0, max: 0.1, step: 0.0005, default: 0.1 },
            { key: 'attraction', label: 'Attraction', min: 0, max: 15, step: 0.1, default: 2.9 },
            { key: 'radius', label: 'Radius', min: 0, max: 500, step: 1, default: 308 },
            { key: 'pointSize', label: 'Point Size', min: 100, max: 50000, step: 100, default: 100 },
        ],
    },
    wind: {
        label: 'Wind',
        controls: [
            { key: 'windX', label: 'X', min: -20, max: 20, step: 0.1, default: 0.9 },
            { key: 'windY', label: 'Y', min: -20, max: 20, step: 0.1, default: 0.0 },
            { key: 'windZ', label: 'Z', min: -20, max: 20, step: 0.1, default: -1.0 },
        ],
    },
    shadow: {
        label: 'Shadow',
        controls: [
            { key: 'shadowDensity', label: 'Shadow Density', min: 0, max: 10, step: 0.1, default: 3.5 },
        ],
    },
    activity: {
        label: 'Body Response',
        controls: [
            { key: 'bodyActivity', label: 'Activity Override', min: 0, max: 1, step: 0.01, default: 0.3 },
            { key: 'gridSpacing', label: 'Grid Spacing', min: 0.1, max: 5, step: 0.05, default: 1.3 },
        ],
    },
    layerToggles: {
        label: 'Layer Toggles',
        controls: [
            { key: 'sortEnabled', label: 'Depth Sort', type: 'toggle', default: true },
            { key: 'shadowEnabled', label: 'Self-Shadow', type: 'toggle', default: true },
        ],
    },
};

const SCENE_SECTIONS = {
    lighting: {
        label: 'Light Position',
        controls: [
            { key: 'lightX', label: 'Light X', min: -5000, max: 5000, step: 50, default: 0 },
            { key: 'lightY', label: 'Light Y', min: -5000, max: 5000, step: 50, default: -200 },
            { key: 'lightZ', label: 'Light Z', min: -5000, max: 5000, step: 50, default: 3000 },
        ],
    },
    bloom: {
        label: 'Bloom',
        controls: [
            { key: 'bloomStrength', label: 'Strength', min: 0, max: 3, step: 0.01, default: 0.54 },
            { key: 'bloomRadius', label: 'Radius', min: 0, max: 2, step: 0.01, default: 0.08 },
            { key: 'bloomThreshold', label: 'Threshold', min: 0, max: 1, step: 0.01, default: 0.32 },
        ],
    },
    sceneToggles: {
        label: 'Scene',
        controls: [
            { key: 'bloomEnabled', label: 'Bloom', type: 'toggle', default: true },
            { key: 'autoRotate', label: 'Auto Rotate', type: 'toggle', default: false },
        ],
    },
};

function cleanNumber(n) {
    if (Number.isInteger(n)) return n.toString();
    const s = n.toPrecision(6);
    return parseFloat(s).toString();
}

function getDefaults(sections) {
    const defaults = {};
    for (const section of Object.values(sections)) {
        for (const ctrl of section.controls) {
            defaults[ctrl.key] = ctrl.default;
        }
    }
    return defaults;
}

const PARTICLE_COUNT_SECTION = {
    particleCount: {
        label: 'GPU Grid',
        controls: [
            { key: 'particleCount', label: 'Grid Size', min: 32, max: 512, step: 32, default: 512, format: (v) => `${v}x${v} (${(v*v).toLocaleString()})` },
        ],
    },
};

export default function ShaderControlPanel({ layer = 'a', title = 'Layer A', showSceneControls = false, showParticleCount = false }) {
    const sections = useMemo(() => {
        const merged = {};
        if (showParticleCount) {
            Object.assign(merged, PARTICLE_COUNT_SECTION);
        }
        Object.assign(merged, LAYER_SECTIONS);
        if (showSceneControls) {
            Object.assign(merged, SCENE_SECTIONS);
        }
        return merged;
    }, [showSceneControls, showParticleCount]);

    const allDefaults = useMemo(() => getDefaults(sections), [sections]);

    const [open, setOpen] = useState(true);
    const [values, setValues] = useState(() => getDefaults(sections));
    const [collapsedSections, setCollapsedSections] = useState({});
    const lastDispatch = useRef({});

    const sceneKeys = useMemo(() => {
        if (!showSceneControls) return null;
        return new Set(Object.keys(getDefaults(SCENE_SECTIONS)));
    }, [showSceneControls]);

    const eventName = useCallback((key) => {
        if (sceneKeys && sceneKeys.has(key)) {
            return 'shader-param-scene';
        }
        return `shader-param-${layer}`;
    }, [layer, sceneKeys]);

    const dispatch = useCallback((key, value) => {
        if (lastDispatch.current[key] === value) return;
        lastDispatch.current[key] = value;
        window.dispatchEvent(new CustomEvent(eventName(key), { detail: { key, value } }));
    }, [eventName]);

    const handleChange = useCallback((key, rawValue) => {
        const value = typeof rawValue === 'boolean' ? rawValue : parseFloat(rawValue);
        setValues(prev => ({ ...prev, [key]: value }));
        dispatch(key, value);
    }, [dispatch]);

    const handleReset = useCallback(() => {
        const defs = getDefaults(sections);
        setValues(defs);
        for (const [key, value] of Object.entries(defs)) {
            dispatch(key, value);
        }
    }, [dispatch, sections]);

    const toggleSection = useCallback((key) => {
        setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    useEffect(() => {
        for (const [key, value] of Object.entries(values)) {
            dispatch(key, value);
        }
    }, []);

    const changedCount = useMemo(() => {
        let count = 0;
        for (const [key, val] of Object.entries(values)) {
            if (val !== allDefaults[key]) count++;
        }
        return count;
    }, [values, allDefaults]);

    const [copied, setCopied] = useState(false);

    const buildChangeSummary = useCallback(() => {
        const changed = {};
        for (const [key, val] of Object.entries(values)) {
            if (val !== allDefaults[key]) {
                changed[key] = val;
            }
        }

        if (Object.keys(changed).length === 0) return null;

        const lines = [`${title} shader param changes:`];

        for (const [, section] of Object.entries(sections)) {
            const sectionChanges = section.controls.filter(c => c.key in changed);
            if (sectionChanges.length === 0) continue;

            lines.push(`  ${section.label}:`);
            for (const ctrl of sectionChanges) {
                const val = changed[ctrl.key];
                const def = allDefaults[ctrl.key];
                if (ctrl.type === 'toggle') {
                    lines.push(`    ${ctrl.label}: ${val} (was ${def})`);
                } else {
                    const fmtVal = typeof val === 'number' ? cleanNumber(val) : val;
                    const fmtDef = typeof def === 'number' ? cleanNumber(def) : def;
                    lines.push(`    ${ctrl.label}: ${fmtVal} (was ${fmtDef})`);
                }
            }
        }

        return lines.join('\n');
    }, [values, allDefaults, title, sections]);

    const handleCopy = useCallback(() => {
        const summary = buildChangeSummary();
        if (!summary) return;
        navigator.clipboard.writeText(summary).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }, [buildChangeSummary]);

    const formatValue = (ctrl, val) => {
        if (ctrl.format) return ctrl.format(val);
        if (Math.abs(val) < 0.01 && val !== 0) return val.toExponential(1);
        if (ctrl.step < 0.01) return val.toFixed(4);
        if (ctrl.step < 1) return val.toFixed(2);
        return Math.round(val).toString();
    };

    if (!open) {
        return (
            <button
                className={`shader-panel-toggle shader-panel-toggle-${layer}`}
                onClick={() => setOpen(true)}
                title={title}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                </svg>
            </button>
        );
    }

    return (
        <div className={`shader-control-panel shader-control-panel-${layer} glass-panel`}>
            <div className="shader-panel-header">
                <span className="shader-panel-title">{title}</span>
                <div className="shader-panel-actions">
                    <button
                        className={`shader-panel-btn ${changedCount > 0 ? 'has-changes' : ''} ${copied ? 'copied' : ''}`}
                        onClick={handleCopy}
                        disabled={changedCount === 0}
                        title={changedCount > 0 ? `Copy ${changedCount} change${changedCount > 1 ? 's' : ''}` : 'No changes'}
                    >
                        {copied ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        ) : (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                {changedCount > 0 && <span className="shader-badge">{changedCount}</span>}
                            </>
                        )}
                    </button>
                    <button className="shader-panel-btn" onClick={handleReset} title="Reset All">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                    </button>
                    <button className="shader-panel-btn" onClick={() => setOpen(false)} title="Close">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="shader-panel-body">
                {Object.entries(sections).map(([sectionKey, section]) => (
                    <div key={sectionKey} className="shader-section">
                        <button
                            className="shader-section-header"
                            onClick={() => toggleSection(sectionKey)}
                        >
                            <span>{section.label}</span>
                            <svg
                                className={`shader-chevron ${collapsedSections[sectionKey] ? 'collapsed' : ''}`}
                                width="12" height="12" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2"
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>

                        {!collapsedSections[sectionKey] && (
                            <div className="shader-section-body">
                                {section.controls.map((ctrl) => {
                                    if (ctrl.type === 'toggle') {
                                        return (
                                            <div key={ctrl.key} className="shader-toggle-row">
                                                <span className="shader-ctrl-label">{ctrl.label}</span>
                                                <label className="toggle-switch small">
                                                    <input
                                                        type="checkbox"
                                                        checked={values[ctrl.key]}
                                                        onChange={(e) => handleChange(ctrl.key, e.target.checked)}
                                                    />
                                                    <span className="toggle-slider" />
                                                </label>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={ctrl.key} className="shader-slider-row">
                                            <div className="shader-slider-header">
                                                <span className="shader-ctrl-label">{ctrl.label}</span>
                                                <span className="shader-ctrl-value">
                                                    {formatValue(ctrl, values[ctrl.key])}
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                className="shader-slider"
                                                min={ctrl.min}
                                                max={ctrl.max}
                                                step={ctrl.step}
                                                value={values[ctrl.key]}
                                                onChange={(e) => handleChange(ctrl.key, e.target.value)}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
