'use client';
import PublicationSpread from '../PublicationSpread';
import PublicationPage from '../PublicationPage';

export default function S02_DesignIsBuild() {
  return (
    <PublicationSpread id="s02">
      {/* Page 3: Essay */}
      <PublicationPage variant="dark" overlays={['scanlines']} watermark="01">
        <h2 className="pub-title pub-title--section">To Design is to Build</h2>

        <div className="pub-body" style={{ flex: 1 }}>
          <p>
            Designers have been designing for the end outcome all along. The software, the service,
            the thing someone uses. Mockups were the cheapest way to convey an idea. They&apos;re not anymore.
          </p>
          <p>
            A conversation, a rough sketch, a quick build. The first concept is faster now. Not a mockup
            of the concept. The thing itself, running on your screen. Building now costs less than specifying,
            and that inverts how I think about design.
          </p>
          <p>
            The gap between imagining and making has collapsed. The artifact you share in a review
            is no longer a proxy. It is the thing. You design in the material now, not in documents
            about the material.
          </p>
        </div>

        <div className="pub-rule" />

        <blockquote className="pub-quote">
          Mockups were never the point. The thing was. We couldn&apos;t afford to start there before.
        </blockquote>

        <div style={{ marginTop: 12 }}>
          <span className="pub-caption">01 / To Design is to Build</span>
        </div>
      </PublicationPage>

      {/* Page 4: Statement poster — LIGHT */}
      <PublicationPage variant="light" overlays={['scanlines']}>
        <div className="pub-spacer" />

        <div className="pub-statement" style={{ color: 'var(--pub-text-dark)', maxWidth: '90%' }}>
          The gap between imagining and making has collapsed.
          The artifact you share in a review is no longer a proxy.
          It is the thing.
        </div>

        <div className="pub-spacer" />

        <div className="pub-flex pub-justify-between" style={{ alignItems: 'flex-end' }}>
          <div>
            <div className="pub-label" style={{ color: 'var(--pub-text-dark-dim)', marginBottom: 4 }}>
              Before
            </div>
            <div className="pub-number" style={{ color: 'var(--pub-text-dark)', fontSize: 9, letterSpacing: '0.04em' }}>
              Figma → Handoff → Developer → Product
            </div>
            <div className="pub-caption" style={{ color: 'var(--pub-text-dark-dim)', marginTop: 2 }}>(Weeks)</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="pub-label" style={{ color: 'var(--pub-text-dark-dim)', marginBottom: 4 }}>
              Now
            </div>
            <div className="pub-number" style={{ color: 'var(--pub-text-dark)', fontSize: 9, letterSpacing: '0.04em' }}>
              Conversation → Working Prototype
            </div>
            <div className="pub-caption" style={{ color: 'var(--pub-text-dark-dim)', marginTop: 2 }}>(Hours)</div>
          </div>
        </div>
      </PublicationPage>
    </PublicationSpread>
  );
}
