'use client';

export default function PublicationPage({ variant = 'dark', overlays = [], watermark, children, className = '' }) {
  const overlayClasses = overlays.map(o => `pub-${o}`).join(' ');

  return (
    <div className={`pub-page pub-page--${variant} ${overlayClasses} ${className}`}>
      {watermark && (
        <span className="pub-watermark">{watermark}</span>
      )}
      <div className="pub-page__content">
        {children}
      </div>
    </div>
  );
}
