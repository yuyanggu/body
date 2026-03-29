'use client';
import PublicationSpread from '../PublicationSpread';
import PublicationPage from '../PublicationPage';

export default function S04_VibeCoding() {
  return (
    <PublicationSpread id="s04">
      {/* Page 7: Essay */}
      <PublicationPage variant="dark" overlays={['scanlines']} watermark="03">
        <h2 className="pub-title pub-title--section">Vibe Coding</h2>

        <div className="pub-body" style={{ flex: 1 }}>
          <p>
            Vibe coding: you describe what you want, the AI builds it, you react and redirect.
            No syntax, no planning.
          </p>
          <p>
            It works. You can go from nothing to a working interface in an afternoon. For designers
            who&apos;ve never written code, the first time feels like a wall has disappeared.
          </p>
          <p>
            The catch: vibe coding gets you from zero to something. It breaks down when something
            needs to become <em>the right thing</em>. The outputs look close to functional but miss the
            spacing, hierarchy, and contrast that separate polished work from &quot;almost there.&quot;
          </p>
          <p>
            I built the first version of my particle system in hours. I spent three months after that
            learning why it was wrong. You can splash paint fast. Composition takes intention.
            The work hasn&apos;t disappeared. It moved from construction to judgment.
          </p>
        </div>

        <div style={{ marginTop: 12 }}>
          <span className="pub-caption">03 / Vibe Coding</span>
        </div>
      </PublicationPage>

      {/* Page 8: Typographic visual */}
      <PublicationPage variant="dark-alt" overlays={['dotgrid']}>
        <div className="pub-spacer" />

        <div style={{ textAlign: 'center' }}>
          <div className="pub-label" style={{ marginBottom: 24, opacity: 0.3 }}>The Trajectory</div>

          <div className="pub-title" style={{ fontSize: 36, marginBottom: 8, opacity: 0.3 }}>
            0 → Something
          </div>

          <div style={{
            width: '100%',
            height: 40,
            margin: '16px 0',
            background: 'linear-gradient(90deg, var(--pub-accent-teal) 0%, var(--pub-accent-purple) 35%, var(--pub-accent-magenta) 65%, var(--pub-accent-amber) 100%)',
            opacity: 0.2,
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'repeating-linear-gradient(90deg, transparent, transparent 3px, var(--pub-bg-dark-alt) 3px, var(--pub-bg-dark-alt) 4px)',
            }} />
          </div>

          <div className="pub-title" style={{ fontSize: 36 }}>
            Something → <span className="pub-accent-teal">The Right Thing</span>
          </div>
        </div>

        <div className="pub-spacer" />

        <blockquote className="pub-quote" style={{ textAlign: 'center', borderLeft: 'none', padding: 0 }}>
          You can splash paint fast.<br />
          Composition takes intention.
        </blockquote>

        <div className="pub-spacer--sm" />
      </PublicationPage>
    </PublicationSpread>
  );
}
