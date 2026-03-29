'use client';
import PublicationSpread from '../PublicationSpread';
import PublicationPage from '../PublicationPage';

export default function S10_LastMile() {
  return (
    <PublicationSpread id="s10">
      {/* Page 19: Essay */}
      <PublicationPage variant="dark" overlays={['scanlines']} watermark="10">
        <h2 className="pub-title pub-title--section">Your Eye is the Last Mile</h2>

        <div className="pub-body" style={{ flex: 1 }}>
          <p>
            AI accelerates every step except one: recognizing whether something is good.
          </p>
          <p>
            AI guessed reasonable values for every visual parameter in my project.
            Each guess was defensible and wrong. Each iteration revealed the next problem.
            The skeletal outline showed the body lacked volume. Volume showed it lacked depth.
            Depth showed it lacked life.
          </p>
          <p>
            AI speeds up each fix but doesn&apos;t skip the sequence.
            The compounding judgment — &quot;this is off, push it this way&quot; — through hundreds
            of micro-decisions, that&apos;s the design. No model replicates that.
          </p>
        </div>

        <blockquote className="pub-quote">
          Three decimal places separate clinical from alive.
        </blockquote>

        <div style={{ marginTop: 12 }}>
          <span className="pub-caption">10 / Your Eye is the Last Mile</span>
        </div>
      </PublicationPage>

      {/* Page 20: Evolution strip */}
      <PublicationPage variant="dark-alt" overlays={['dotgrid']}>
        <div className="pub-label pub-accent-teal" style={{ marginBottom: 24 }}>
          Evolution of the Particle Body
        </div>

        <div className="pub-evolution" style={{ marginBottom: 24 }}>
          <div className="pub-evolution__stage">
            <div className="pub-evolution__box pub-evolution__box--wireframe">
              {/* Wireframe dots */}
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', opacity: 0.3 }}>
                <circle cx="50" cy="15" r="2" fill="currentColor" />
                <circle cx="50" cy="30" r="1.5" fill="currentColor" />
                <circle cx="35" cy="45" r="1.5" fill="currentColor" />
                <circle cx="65" cy="45" r="1.5" fill="currentColor" />
                <circle cx="50" cy="55" r="1.5" fill="currentColor" />
                <circle cx="40" cy="75" r="1.5" fill="currentColor" />
                <circle cx="60" cy="75" r="1.5" fill="currentColor" />
                <line x1="50" y1="15" x2="50" y2="55" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
                <line x1="50" y1="30" x2="35" y2="45" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
                <line x1="50" y1="30" x2="65" y2="45" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
                <line x1="50" y1="55" x2="40" y2="75" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
                <line x1="50" y1="55" x2="60" y2="75" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
              </svg>
            </div>
            <span className="pub-caption">Wireframe</span>
          </div>

          <div className="pub-evolution__stage">
            <div className="pub-evolution__box pub-evolution__box--volume" />
            <span className="pub-caption">Volume</span>
          </div>

          <div className="pub-evolution__stage">
            <div className="pub-evolution__box pub-evolution__box--dual" />
            <span className="pub-caption">Dual Layer</span>
          </div>

          <div className="pub-evolution__stage">
            <div className="pub-evolution__box pub-evolution__box--final">
              {/* Dense dot pattern */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: `
                  radial-gradient(circle at 40% 35%, rgba(13,140,179,0.5) 1.5px, transparent 1.5px),
                  radial-gradient(circle at 60% 50%, rgba(140,26,255,0.4) 1px, transparent 1px),
                  radial-gradient(circle at 50% 65%, rgba(255,31,140,0.3) 1.5px, transparent 1.5px),
                  radial-gradient(circle, rgba(255,255,255,0.1) 0.8px, transparent 0.8px)
                `,
                backgroundSize: '8px 8px, 6px 7px, 10px 9px, 5px 5px',
              }} />
            </div>
            <span className="pub-caption" style={{ color: 'var(--pub-accent-teal)' }}>Tuned</span>
          </div>
        </div>

        <div className="pub-body">
          <p>
            AI built each iteration. A human decided each one was wrong.
          </p>
        </div>

        <div className="pub-spacer" />

        <div className="pub-statement" style={{ fontSize: 16, textAlign: 'center', opacity: 0.8 }}>
          Assembly is cheap now.<br />
          Discernment is not.
        </div>
      </PublicationPage>
    </PublicationSpread>
  );
}
