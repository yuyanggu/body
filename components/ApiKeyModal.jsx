'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function ApiKeyModal({ aiCompanion }) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [portalTarget, setPortalTarget] = useState(null);

    const hasKey = aiCompanion?.hasKey;

    useEffect(() => {
        setPortalTarget(document.body);
    }, []);

    const handleOpen = () => {
        setInputValue(aiCompanion?.apiKey || '');
        setIsOpen(true);
    };

    const handleSave = () => {
        const key = inputValue.trim();
        if (aiCompanion) aiCompanion.apiKey = key;
        setIsOpen(false);
    };

    const handleCancel = () => {
        setIsOpen(false);
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
    };

    const modal = isOpen && portalTarget ? createPortal(
        <div
            id="api-key-modal"
            onClick={handleBackdropClick}
        >
            <div className="api-key-modal-inner">
                <div className="api-key-modal-title">OpenAI API Key</div>
                <div className="api-key-modal-desc">
                    Enter your API key for voice companion feedback. Stored locally in your browser.
                </div>
                <input
                    type="password"
                    id="api-key-input"
                    placeholder="sk-..."
                    autoComplete="off"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                />
                <div className="api-key-modal-actions">
                    <button className="control-button" onClick={handleSave}>
                        <span>Save</span>
                    </button>
                    <button className="control-button" onClick={handleCancel}>
                        <span>Cancel</span>
                    </button>
                </div>
            </div>
        </div>,
        portalTarget
    ) : null;

    return (
        <>
            <button id="api-key-btn" className="control-button" onClick={handleOpen}>
                <span id="api-key-btn-label">{hasKey ? 'API Key Set' : 'Set API Key'}</span>
            </button>
            {modal}
        </>
    );
}
