'use client';
import { useMemo } from 'react';

// Seeded deterministic pseudo-random
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Static particle scatter for print — no animation, pure CSS positioned dots
export default function StaticParticles({ seed = 7, count = 400, variant = 'cloud' }) {
  const particles = useMemo(() => {
    const rand = seededRandom(seed);
    const result = [];

    const colors = [
      'rgb(13, 140, 179)',   // teal
      'rgb(38, 64, 255)',    // blue
      'rgb(140, 26, 255)',   // purple
      'rgb(255, 31, 140)',   // magenta
      'rgb(255, 102, 77)',   // amber
    ];

    for (let i = 0; i < count; i++) {
      let x, y;

      if (variant === 'cloud') {
        // Gaussian-ish cluster centered at 50%, 40%
        const angle = rand() * Math.PI * 2;
        const r = (rand() * 0.3 + rand() * 0.2) * 50;
        x = 50 + Math.cos(angle) * r * 1.1;
        y = 38 + Math.sin(angle) * r * 1.3;
      } else if (variant === 'body') {
        // Body silhouette approximation — vertical ellipse with limb extensions
        const zone = rand();
        if (zone < 0.15) {
          // Head
          const a = rand() * Math.PI * 2;
          const r = rand() * 6;
          x = 50 + Math.cos(a) * r;
          y = 18 + Math.sin(a) * r * 0.8;
        } else if (zone < 0.5) {
          // Torso
          x = 42 + rand() * 16;
          y = 28 + rand() * 28;
        } else if (zone < 0.7) {
          // Arms
          const side = rand() > 0.5 ? 1 : -1;
          x = 50 + side * (12 + rand() * 14);
          y = 30 + rand() * 18;
        } else {
          // Legs
          const side = rand() > 0.5 ? 1 : -1;
          x = 50 + side * (2 + rand() * 8);
          y = 56 + rand() * 30;
        }
        // Add noise
        x += (rand() - 0.5) * 6;
        y += (rand() - 0.5) * 4;
      } else {
        x = rand() * 100;
        y = rand() * 100;
      }

      const size = 1 + rand() * 3.5;
      const opacity = 0.08 + rand() * 0.55;
      const color = colors[Math.floor(rand() * colors.length)];

      result.push({ x, y, size, opacity, color });
    }

    return result;
  }, [seed, count, variant]);

  return (
    <div className="pub-static-particles">
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            opacity: p.opacity,
            pointerEvents: 'none',
          }}
        />
      ))}
    </div>
  );
}
