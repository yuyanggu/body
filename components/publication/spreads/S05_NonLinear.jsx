'use client';
import PublicationSpread from '../PublicationSpread';
import PublicationPage from '../PublicationPage';

export default function S05_NonLinear() {
  return (
    <PublicationSpread id="s05">
      {/* Page 9: Track diagram — LIGHT */}
      <PublicationPage variant="light" overlays={['scanlines']} watermark="04">
        <h2 className="pub-title pub-title--section" style={{ color: 'var(--pub-text-dark)' }}>
          The Workflow Is No Longer Linear
        </h2>

        <div className="pub-body" style={{ color: 'var(--pub-text-dark)', marginBottom: 24 }}>
          <p>
            PRD, then design, then build. That sequence assumes you know what to build
            before you build it. The assumption depended on building being expensive.
          </p>
        </div>

        {/* 3 parallel tracks */}
        <div className="pub-tracks" style={{ marginBottom: 24 }}>
          <div className="pub-tracks__lane">
            <span className="pub-tracks__label" style={{ color: 'var(--pub-accent-teal)' }}>Design</span>
            <div className="pub-tracks__line" style={{ background: 'var(--pub-accent-teal)', opacity: 0.25 }}>
              <div className="pub-tracks__dot" style={{ left: '15%', background: 'var(--pub-accent-teal)' }} />
              <div className="pub-tracks__dot" style={{ left: '55%', background: 'var(--pub-accent-teal)' }} />
              <div className="pub-tracks__dot" style={{ left: '82%', background: 'var(--pub-accent-teal)' }} />
            </div>
          </div>

          {/* Connector lines (CSS approximation) */}
          <svg viewBox="0 0 400 20" style={{ width: '100%', height: 20, marginLeft: 75, opacity: 0.12 }}>
            <line x1="60" y1="0" x2="140" y2="20" stroke="currentColor" strokeWidth="1" />
            <line x1="220" y1="0" x2="180" y2="20" stroke="currentColor" strokeWidth="1" />
            <line x1="330" y1="0" x2="300" y2="20" stroke="currentColor" strokeWidth="1" />
          </svg>

          <div className="pub-tracks__lane">
            <span className="pub-tracks__label" style={{ color: 'var(--pub-accent-purple)' }}>Code</span>
            <div className="pub-tracks__line" style={{ background: 'var(--pub-accent-purple)', opacity: 0.25 }}>
              <div className="pub-tracks__dot" style={{ left: '25%', background: 'var(--pub-accent-purple)' }} />
              <div className="pub-tracks__dot" style={{ left: '48%', background: 'var(--pub-accent-purple)' }} />
              <div className="pub-tracks__dot" style={{ left: '72%', background: 'var(--pub-accent-purple)' }} />
              <div className="pub-tracks__dot" style={{ left: '92%', background: 'var(--pub-accent-purple)' }} />
            </div>
          </div>

          <svg viewBox="0 0 400 20" style={{ width: '100%', height: 20, marginLeft: 75, opacity: 0.12 }}>
            <line x1="100" y1="0" x2="160" y2="20" stroke="currentColor" strokeWidth="1" />
            <line x1="192" y1="0" x2="260" y2="20" stroke="currentColor" strokeWidth="1" />
            <line x1="290" y1="0" x2="340" y2="20" stroke="currentColor" strokeWidth="1" />
          </svg>

          <div className="pub-tracks__lane">
            <span className="pub-tracks__label" style={{ color: 'var(--pub-accent-magenta)' }}>Discovery</span>
            <div className="pub-tracks__line" style={{ background: 'var(--pub-accent-magenta)', opacity: 0.25 }}>
              <div className="pub-tracks__dot" style={{ left: '10%', background: 'var(--pub-accent-magenta)' }} />
              <div className="pub-tracks__dot" style={{ left: '40%', background: 'var(--pub-accent-magenta)' }} />
              <div className="pub-tracks__dot" style={{ left: '65%', background: 'var(--pub-accent-magenta)' }} />
              <div className="pub-tracks__dot" style={{ left: '88%', background: 'var(--pub-accent-magenta)' }} />
            </div>
          </div>
        </div>

        <div className="pub-caption" style={{ color: 'var(--pub-text-dark-dim)' }}>
          Nothing stays in its lane. Design, code, and discovery cross-pollinate constantly.
        </div>

        <div style={{ marginTop: 'auto' }}>
          <span className="pub-caption" style={{ color: 'var(--pub-text-dark-dim)' }}>04 / The Workflow</span>
        </div>
      </PublicationPage>

      {/* Page 10: Essay text — LIGHT */}
      <PublicationPage variant="light">
        <div className="pub-spacer--sm" />

        <div className="pub-body" style={{ color: 'var(--pub-text-dark)', flex: 1 }}>
          <p>
            A working prototype now costs twenty minutes, not two sprints. Building has become
            the way I think. I built a control panel for one particle layer and realized the system
            needed two. I wired up a sensor and it changed the creative direction. The spec
            didn&apos;t precede the work. I wrote it after, describing what I&apos;d learned by building.
          </p>
          <p>
            Designers are trained to converge on a direction, then execute. But when execution costs
            nothing, premature convergence becomes the risk. The mockup is no longer the cheapest test.
            The build is.
          </p>
          <p>
            My project&apos;s architecture doc grew from nothing to 400 lines, not from upfront planning,
            but because each session revealed something the next session needed to know.
          </p>
        </div>

        <div className="pub-rule" style={{ background: 'var(--pub-text-dark)', opacity: 0.08 }} />

        <blockquote className="pub-quote" style={{ borderLeftColor: 'var(--pub-text-dark)', color: 'var(--pub-text-dark)' }}>
          Premature convergence becomes the risk.
        </blockquote>

        <div className="pub-spacer" />

        <div style={{ textAlign: 'right' }}>
          <span className="pub-number" style={{
            fontSize: 64,
            color: 'var(--pub-text-dark)',
            opacity: 0.06,
            fontFamily: 'var(--pub-font-square)',
            lineHeight: 1
          }}>
            400
          </span>
          <div className="pub-caption" style={{ color: 'var(--pub-text-dark-dim)' }}>
            Lines of architecture docs. Written after the fact.
          </div>
        </div>
      </PublicationPage>
    </PublicationSpread>
  );
}
