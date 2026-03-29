'use client';

import useAppStore from '../stores/useAppStore.js';

export default function LoadingOverlay() {
    const visible = useAppStore((s) => s.loadingVisible);
    const message = useAppStore((s) => s.loadingMessage);

    return (
        <div id="loading-overlay" className={visible ? '' : 'hidden'}>
            <div className="loading-title">Residual Motion</div>
            <div className="loading-explainer">
                Stand in front of your camera and move. Your body drives the
                visuals — no typing, no buttons. An AI companion watches
                how you move and speaks what it notices.
            </div>
            <div className="loading-subtitle">{message}</div>
            <div className="loading-bar">
                <div className="loading-progress"></div>
            </div>
        </div>
    );
}
