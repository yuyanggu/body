'use client';
import { useMemo } from 'react';
import PublicationSpread from '../PublicationSpread';
import PublicationPage from '../PublicationPage';

// Seeded deterministic pseudo-random for consistent dot pattern
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export default function S14_BackCover() {
  const dots = useMemo(() => {
    const rand = seededRandom(42);
    const result = [];
    for (let i = 0; i < 180; i++) {
      const x = rand() * 100;
      const y = 30 + rand() * 60;
      const size = 1.5 + rand() * 4;
      const opacity = 0.15 + rand() * 0.55;
      const isFilled = rand() > 0.3;
      result.push({ x, y, size, opacity, isFilled });
    }
    return result;
  }, []);

  return (
    <PublicationSpread id="s14">
      {/* Page 27: Blank */}
      <PublicationPage variant="dark" />

      {/* Page 28: Back cover — generative dot pattern */}
      <PublicationPage variant="dark" overlays={['scanlines']}>
        <div className="pub-generative-dots">
          {dots.map((d, i) => (
            <div
              key={i}
              className="pub-generative-dots__dot"
              style={{
                left: `${d.x}%`,
                top: `${d.y}%`,
                width: d.size,
                height: d.size,
                opacity: d.opacity,
                background: d.isFilled ? 'var(--pub-accent-teal)' : 'transparent',
                border: d.isFilled ? 'none' : `0.5px solid var(--pub-accent-teal)`,
              }}
            />
          ))}
        </div>

        <div className="pub-cover-content" style={{ justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="pub-label" style={{ opacity: 0.25, marginBottom: 4 }}>
              Code as a Canvas
            </div>
            <div className="pub-label" style={{ opacity: 0.15 }}>
              Yuyang Gu — 2026
            </div>
          </div>
        </div>
      </PublicationPage>
    </PublicationSpread>
  );
}
