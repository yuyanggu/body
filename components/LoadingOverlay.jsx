'use client';

import useAppStore from '../stores/useAppStore.js';

export default function LoadingOverlay() {
    const visible = useAppStore((s) => s.loadingVisible);
    const message = useAppStore((s) => s.loadingMessage);

    return (
        <div id="loading-overlay" className={visible ? '' : 'hidden'}>
            <div className="loading-title">Movement Dialogue</div>
            <div className="loading-subtitle">{message}</div>
            <div className="loading-bar">
                <div className="loading-progress"></div>
            </div>
        </div>
    );
}
