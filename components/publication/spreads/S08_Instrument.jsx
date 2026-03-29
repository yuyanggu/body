'use client';
import PublicationSpread from '../PublicationSpread';
import PublicationPage from '../PublicationPage';

const sliders = [
  { label: 'Speed', value: '1.7', pct: 42 },
  { label: 'Die Speed', value: '0.01', pct: 5 },
  { label: 'Curl Size', value: '0.1', pct: 20 },
  { label: 'Attraction', value: '2.9', pct: 58 },
  { label: 'Radius', value: '308', pct: 62 },
  { label: 'Point Size', value: '100', pct: 40 },
  { label: 'Shadow', value: '3.5', pct: 70 },
  { label: 'Grid Space', value: '1.3', pct: 26 },
  { label: 'Body Act.', value: '0.3', pct: 30 },
  { label: 'Wind X', value: '0.9', pct: 55 },
];

export default function S08_Instrument() {
  return (
    <PublicationSpread id="s08">
      {/* Page 15: Control panel mockup */}
      <PublicationPage variant="dark" overlays={['scanlines']} watermark="08">
        <h2 className="pub-title pub-title--section">Build the Instrument</h2>

        <div className="pub-terminal" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="pub-terminal__bar">
            <span className="pub-terminal__dot" />
            <span className="pub-terminal__dot" />
            <span className="pub-terminal__dot" />
            <span className="pub-terminal__title">Shader Control Panel — Layer A</span>
          </div>
          <div style={{ padding: '16px 16px', flex: 1 }}>
            <div className="pub-slider-mock">
              {sliders.map(s => (
                <div key={s.label} className="pub-slider-mock__row">
                  <span className="pub-slider-mock__label">{s.label}</span>
                  <div className="pub-slider-mock__track">
                    <div className="pub-slider-mock__fill" style={{ width: `${s.pct}%` }} />
                    <div className="pub-slider-mock__thumb" style={{ left: `${s.pct}%` }} />
                  </div>
                  <span className="pub-slider-mock__value">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pub-caption" style={{ marginTop: 12 }}>
          Frosted-glass panel writing directly to GPU uniforms. No reload. Drag and see.
        </div>
      </PublicationPage>

      {/* Page 16: Feedback loop + essay */}
      <PublicationPage variant="dark" overlays={['dotgrid']}>
        <div className="pub-body" style={{ marginBottom: 20 }}>
          <p>
            The breakthrough was not asking AI for better particles. It was asking AI to build
            me a control panel for the particles.
          </p>
          <p>
            Within minutes I found configurations that hours of text prompts missed.
            I couldn&apos;t have described them because I didn&apos;t know I wanted them until
            I saw them. The AI built the instrument. I played it.
          </p>
        </div>

        {/* Feedback loop diagram */}
        <div className="pub-loop" style={{ margin: '20px 0' }}>
          <div className="pub-loop__node" style={{ borderColor: 'var(--pub-accent-teal)', color: 'var(--pub-accent-teal)' }}>
            Tune Sliders
          </div>
          <span className="pub-loop__arrow">→</span>
          <div className="pub-loop__node">See Result Live</div>
          <span className="pub-loop__arrow">→</span>
          <div className="pub-loop__node">Copy Diff</div>
          <span className="pub-loop__arrow">→</span>
          <div className="pub-loop__node" style={{ borderColor: 'var(--pub-accent-purple)', color: 'var(--pub-accent-purple)' }}>
            Paste to AI
          </div>
          <span className="pub-loop__arrow">↻</span>
        </div>

        <div className="pub-terminal" style={{ marginBottom: 20 }}>
          <div className="pub-terminal__bar">
            <span className="pub-terminal__dot" />
            <span className="pub-terminal__dot" />
            <span className="pub-terminal__dot" />
            <span className="pub-terminal__title">Copy Diff Output</span>
          </div>
          <div className="pub-terminal__body">
            <div>Speed: <span className="t-value">1.7</span> <span className="t-comment">(was 2)</span></div>
            <div>Curl Size: <span className="t-value">0.1</span> <span className="t-comment">(was 0.0175)</span></div>
            <div>Shadow Density: <span className="t-value">3.5</span> <span className="t-comment">(was 2)</span></div>
            <div>Grid Spacing: <span className="t-value">1.3</span> <span className="t-comment">(new)</span></div>
          </div>
        </div>

        <blockquote className="pub-quote" style={{ fontSize: 11 }}>
          Structured data beats natural language for creative refinement. Every time.
        </blockquote>

        <div style={{ marginTop: 'auto' }}>
          <span className="pub-caption">08 / Build the Instrument, Play It Yourself</span>
        </div>
      </PublicationPage>
    </PublicationSpread>
  );
}
