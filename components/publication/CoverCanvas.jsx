'use client';
import { useEffect, useRef } from 'react';

// Lightweight generative particle canvas for publication cover/closing
// Uses 2D canvas with simplex-noise-like drift, not full Three.js pipeline
export default function CoverCanvas({ variant = 'cover', mountId }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    mount.appendChild(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    // Particle system
    const PARTICLE_COUNT = variant === 'cover' ? 3000 : 2000;
    const particles = [];

    // Color palette from the particle system
    const colors = [
      [13, 140, 179],    // teal
      [38, 64, 255],     // blue
      [140, 26, 255],    // purple
      [255, 31, 140],    // magenta
      [255, 102, 77],    // amber
    ];

    // Simple hash for pseudo-random
    const hash = (x, y) => {
      let h = x * 374761393 + y * 668265263;
      h = (h ^ (h >> 13)) * 1274126177;
      return (h ^ (h >> 16)) / 4294967296 + 0.5;
    };

    // Initialize particles
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const cx = w * 0.5;
      const cy = h * (variant === 'cover' ? 0.45 : 0.5);
      const spread = variant === 'cover' ? Math.min(w, h) * 0.4 : Math.min(w, h) * 0.35;

      // Gaussian-ish distribution around center
      const angle = Math.random() * Math.PI * 2;
      const r = spread * (Math.random() * 0.6 + Math.random() * 0.4);

      particles.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        size: 0.5 + Math.random() * 2,
        life: Math.random(),
        speed: 0.2 + Math.random() * 0.4,
        colorIdx: Math.floor(Math.random() * colors.length),
        alpha: 0.1 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;
    let lastFrame = performance.now();

    const animate = (now) => {
      const dt = Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;
      time += dt;

      const rect = mount.getBoundingClientRect();
      const cw = rect.width;
      const ch = rect.height;

      ctx.clearRect(0, 0, cw, ch);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Curl-noise-like drift
        const nx = p.x * 0.005;
        const ny = p.y * 0.005;
        const t = time * 0.3;

        // Approximated curl noise with sin/cos
        const curlX = Math.sin(ny * 2.1 + t) * Math.cos(nx * 1.7 + t * 0.7) * 0.8;
        const curlY = Math.cos(nx * 2.3 + t * 0.8) * Math.sin(ny * 1.9 + t * 0.5) * 0.8;

        p.vx = p.vx * 0.95 + curlX * p.speed * dt * 30;
        p.vy = p.vy * 0.95 + curlY * p.speed * dt * 30;

        // Slight wind
        p.vx += 0.02 * dt;
        p.vy -= 0.01 * dt;

        p.x += p.vx;
        p.y += p.vy;

        // Life decay and respawn
        p.life -= dt * 0.08;
        if (p.life <= 0 || p.x < -20 || p.x > cw + 20 || p.y < -20 || p.y > ch + 20) {
          const cx = cw * 0.5;
          const cy = ch * (variant === 'cover' ? 0.45 : 0.5);
          const spread = Math.min(cw, ch) * 0.35;
          const angle = Math.random() * Math.PI * 2;
          const r = spread * Math.random();
          p.x = cx + Math.cos(angle) * r;
          p.y = cy + Math.sin(angle) * r;
          p.vx = 0;
          p.vy = 0;
          p.life = 0.5 + Math.random() * 0.5;
          p.colorIdx = Math.floor(Math.random() * colors.length);
        }

        // Render
        const c = colors[p.colorIdx];
        const fadeAlpha = p.alpha * Math.min(p.life * 3, 1);
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${fadeAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    const resizeObserver = new ResizeObserver(() => {
      const rect = mount.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    });
    resizeObserver.observe(mount);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      resizeObserver.disconnect();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [mountId, variant]);

  return null;
}
