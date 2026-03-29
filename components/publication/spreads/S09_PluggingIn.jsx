'use client';
import PublicationSpread from '../PublicationSpread';
import PublicationPage from '../PublicationPage';

const spokes = [
  { label: 'GitHub', desc: 'Code, PRs', top: '18%', left: '12%' },
  { label: 'Figma', desc: 'Design files', top: '12%', left: '68%' },
  { label: 'Docs', desc: 'Library docs', top: '72%', left: '8%' },
  { label: 'Browser', desc: 'Preview, test', top: '75%', left: '65%' },
  { label: 'Database', desc: 'Supabase', top: '45%', left: '80%' },
];

export default function S09_PluggingIn() {
  return (
    <PublicationSpread id="s09">
      {/* Page 17: Hub-spoke diagram — LIGHT */}
      <PublicationPage variant="light" overlays={['dotgrid']} watermark="09">
        <h2 className="pub-title pub-title--section" style={{ color: 'var(--pub-text-dark)' }}>
          Plugging In
        </h2>

        <div className="pub-body" style={{ color: 'var(--pub-text-dark)', marginBottom: 16 }}>
          <p>
            MCPs are plugins for AI tools. They let the AI connect to external systems.
          </p>
        </div>

        {/* Hub-spoke diagram */}
        <div className="pub-hub" style={{ flex: 1 }}>
          {/* SVG lines connecting center to spokes */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}>
            {spokes.map((s, i) => (
              <line
                key={i}
                x1="50%" y1="50%"
                x2={s.left} y2={s.top}
                stroke="rgba(0,0,0,0.08)"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
            ))}
          </svg>

          <div className="pub-hub__center" style={{
            borderColor: 'var(--pub-accent-teal)',
            color: 'var(--pub-text-dark)',
            background: 'var(--pub-bg-light)',
          }}>
            AI Agent
          </div>

          {spokes.map((s, i) => (
            <div key={i} className="pub-hub__spoke" style={{
              top: s.top,
              left: s.left,
              borderColor: 'rgba(0,0,0,0.1)',
              color: 'var(--pub-text-dark)',
              background: 'var(--pub-bg-light)',
            }}>
              <div>{s.label}</div>
              <div style={{ fontSize: 7, opacity: 0.4, marginTop: 2 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          <span className="pub-caption" style={{ color: 'var(--pub-text-dark-dim)' }}>09 / Plugging In</span>
        </div>
      </PublicationPage>

      {/* Page 18: Essay — LIGHT */}
      <PublicationPage variant="light">
        <div className="pub-spacer--sm" />

        <div className="pub-body" style={{ color: 'var(--pub-text-dark)', flex: 1 }}>
          <p>
            A Figma MCP means the AI reads your design files. A documentation MCP means it reads
            library docs without you pasting them into chat. A browser MCP means it previews
            your running app and sees what renders.
          </p>
          <p>
            I connected a documentation MCP during a framework migration. The agent cross-referenced
            my codebase against the current docs in real time. I explained nothing. It already knew.
          </p>
          <p>
            Some designers are structuring their design systems so AI agents can read both Figma and code.
            When the tokens carry the same meaning in both places, the AI bridges the gap without
            you translating.
          </p>
        </div>

        <div style={{
          padding: 16,
          border: '1px solid rgba(0,0,0,0.08)',
          background: 'rgba(0,0,0,0.02)',
        }}>
          <div className="pub-label" style={{ color: 'var(--pub-accent-teal)', marginBottom: 8 }}>
            Signal
          </div>
          <div className="pub-body" style={{ color: 'var(--pub-text-dark)', marginBottom: 0 }}>
            <p style={{ margin: 0 }}>
              You don&apos;t need all the MCPs. You need the ones that kill your most
              frequent copy-paste.
            </p>
          </div>
        </div>
      </PublicationPage>
    </PublicationSpread>
  );
}
