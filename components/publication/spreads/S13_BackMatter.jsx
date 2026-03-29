'use client';
import PublicationSpread from '../PublicationSpread';
import PublicationPage from '../PublicationPage';

const tools = [
  { name: 'Claude Code', desc: 'Agentic AI coding — terminal interface, full-repo context' },
  { name: 'Next.js 16', desc: 'App Router, React 19, client-side rendering' },
  { name: 'Three.js', desc: 'GPU particle system, dual-layer rendering, post-processing' },
  { name: 'TensorFlow.js', desc: 'MoveNet SINGLEPOSE_LIGHTNING, 17-keypoint pose detection' },
  { name: 'OpenAI API', desc: 'GPT-4o-mini for AI companion, TTS for voice output' },
  { name: 'Zustand', desc: 'Lightweight state management bridging React and imperative core' },
  { name: 'XIAO ESP32S3', desc: 'Knee-worn IMU sensor, MPU-6050, WiFi WebSocket streaming' },
  { name: 'Geist Pixel', desc: 'Display typeface — Line, Grid, Circle, Square, Triangle variants' },
];

export default function S13_BackMatter() {
  return (
    <PublicationSpread id="s13">
      {/* Page 25: Tools */}
      <PublicationPage variant="dark" overlays={['dotgrid']}>
        <div className="pub-label pub-accent-teal" style={{ marginBottom: 24 }}>
          Tools &amp; Technologies
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          {tools.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
              <span className="pub-number" style={{
                fontFamily: 'var(--pub-font-square)',
                fontSize: 8,
                opacity: 0.2,
                width: 16,
                textAlign: 'right',
                flexShrink: 0,
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <div style={{
                  fontFamily: 'var(--pub-font-line)',
                  fontSize: 10,
                  letterSpacing: '0.04em',
                  marginBottom: 2,
                }}>
                  {t.name}
                </div>
                <div style={{
                  fontFamily: 'var(--pub-font-body)',
                  fontSize: 8.5,
                  opacity: 0.4,
                  lineHeight: 1.4,
                }}>
                  {t.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pub-rule" />
        <div className="pub-caption">Stack assembled over 6 weeks, Feb–Mar 2026</div>
      </PublicationPage>

      {/* Page 26: Project info */}
      <PublicationPage variant="dark-alt" overlays={['scanlines']}>
        <div className="pub-spacer" />

        <div style={{ textAlign: 'center' }}>
          <div className="pub-title" style={{ fontSize: 14, marginBottom: 8 }}>
            Residual Motion
          </div>
          <div className="pub-subtitle" style={{ marginBottom: 24 }}>
            Prompted by the Body
          </div>

          <div className="pub-terminal" style={{ textAlign: 'left', maxWidth: 300, margin: '0 auto' }}>
            <div className="pub-terminal__bar">
              <span className="pub-terminal__dot" />
              <span className="pub-terminal__dot" />
              <span className="pub-terminal__dot" />
              <span className="pub-terminal__title">project</span>
            </div>
            <div className="pub-terminal__body">
              <div><span className="t-key">repo:</span> github.com/yuyanggu/body</div>
              <div><span className="t-key">stack:</span> next.js + three.js + tf.js</div>
              <div><span className="t-key">particles:</span> <span className="t-value">262,144</span></div>
              <div><span className="t-key">layers:</span> <span className="t-value">2</span> (body + skeleton)</div>
              <div><span className="t-key">input:</span> camera + knee IMU</div>
              <div><span className="t-key">typing:</span> <span className="t-value">0</span></div>
            </div>
          </div>
        </div>

        <div className="pub-spacer" />

        <div className="pub-caption" style={{ textAlign: 'center' }}>
          The body is the entire prompt.
        </div>
      </PublicationPage>
    </PublicationSpread>
  );
}
