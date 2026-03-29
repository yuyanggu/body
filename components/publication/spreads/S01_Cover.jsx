'use client';
import PublicationSpread from '../PublicationSpread';
import PublicationPage from '../PublicationPage';
import StaticParticles from '../StaticParticles';

const tocItems = [
  { num: '01', name: 'To Design is to Build', page: '03' },
  { num: '02', name: 'The Tool Landscape', page: '05' },
  { num: '03', name: 'Vibe Coding', page: '07' },
  { num: '04', name: 'The Workflow Is No Longer Linear', page: '09' },
  { num: '05', name: 'Show, Don\'t Describe', page: '11' },
  { num: '06', name: 'Directing the Agent', page: '12' },
  { num: '07', name: 'The Shared Brain', page: '13' },
  { num: '08', name: 'Build the Instrument, Play It Yourself', page: '15' },
  { num: '09', name: 'Plugging In', page: '17' },
  { num: '10', name: 'Your Eye is the Last Mile', page: '19' },
  { num: '11', name: 'The Role is Transforming', page: '21' },
];

export default function S01_Cover() {
  return (
    <PublicationSpread id="cover">
      {/* Page 1: Cover */}
      <PublicationPage variant="dark" overlays={['scanlines']} className="pub-cover-page">
        <StaticParticles seed={7} count={500} variant="cloud" />
        <div className="pub-cover-content">
          <div className="pub-flex pub-justify-between pub-items-end">
            <span className="pub-label" style={{ opacity: 0.3 }}>Prompted by the Body</span>
            <span className="pub-label" style={{ opacity: 0.3 }}>2026</span>
          </div>

          <div className="pub-spacer" />

          <div>
            <h1 className="pub-title pub-title--hero" style={{ marginBottom: 12 }}>
              Code as<br />a Canvas
            </h1>
            <div className="pub-rule--accent" style={{ width: 40, height: 2, background: 'var(--pub-accent-teal)', marginBottom: 14 }} />
            <p className="pub-subtitle" style={{ marginBottom: 6 }}>Working with Agentic AI as a Designer</p>
            <p className="pub-label" style={{ opacity: 0.4 }}>Yuyang Gu</p>
          </div>

          <div className="pub-spacer--sm" />

          <div className="pub-flex pub-justify-between" style={{ opacity: 0.2 }}>
            <span className="pub-label">Residual Motion</span>
            <span className="pub-label">A5 Publication</span>
          </div>
        </div>
      </PublicationPage>

      {/* Page 2: Inside Cover — TOC */}
      <PublicationPage variant="dark-alt" overlays={['dotgrid']}>
        <div className="pub-flex pub-justify-between" style={{ marginBottom: 32 }}>
          <span className="pub-label pub-accent-teal">Contents</span>
          <span className="pub-label" style={{ opacity: 0.2 }}>28 Pages</span>
        </div>

        <ul className="pub-toc">
          {tocItems.map(item => (
            <li key={item.num} className="pub-toc__item">
              <span className="pub-toc__num">{item.num}</span>
              <span className="pub-toc__name">{item.name}</span>
              <span className="pub-toc__dots" />
              <span className="pub-toc__page">{item.page}</span>
            </li>
          ))}
        </ul>

        <div className="pub-spacer" />

        <div className="pub-terminal" style={{ marginTop: 'auto' }}>
          <div className="pub-terminal__bar">
            <span className="pub-terminal__dot" />
            <span className="pub-terminal__dot" />
            <span className="pub-terminal__dot" />
            <span className="pub-terminal__title">Abstract</span>
          </div>
          <div className="pub-terminal__body" style={{ fontFamily: 'var(--pub-font-body)', fontSize: '9.5px', lineHeight: 1.65 }}>
            <span className="t-comment">// </span>A designer explores agentic AI as creative
            medium through a body-tracking particle system.
            No mockups. No handoffs. The body is the only prompt.
          </div>
        </div>

        <div style={{ marginTop: 16 }} className="pub-flex pub-justify-between">
          <span className="pub-label" style={{ opacity: 0.15 }}>Part of the &quot;Prompted by the Body&quot; research series</span>
        </div>
      </PublicationPage>
    </PublicationSpread>
  );
}
