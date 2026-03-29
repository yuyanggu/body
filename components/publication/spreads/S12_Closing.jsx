'use client';
import PublicationSpread from '../PublicationSpread';
import PublicationPage from '../PublicationPage';
import StaticParticles from '../StaticParticles';

export default function S12_Closing() {
  return (
    <PublicationSpread id="s12">
      {/* Page 23: Closing visual — static particle body */}
      <PublicationPage variant="dark" overlays={['scanlines']}>
        <StaticParticles seed={42} count={600} variant="body" />
        <div className="pub-cover-content" style={{ justifyContent: 'flex-end' }}>
          <div className="pub-body" style={{ maxWidth: '85%', marginBottom: 8, opacity: 0.85 }}>
            <p>
              Residual Motion was built in six weeks by a designer who had never shipped a web app.
              The body provided the context. The AI provided the capability.
              The design decisions remained human.
            </p>
          </div>
        </div>
      </PublicationPage>

      {/* Page 24: Colophon */}
      <PublicationPage variant="dark">
        <div className="pub-spacer" />

        <div style={{ textAlign: 'center' }}>
          <div className="pub-title pub-title--large" style={{ marginBottom: 16 }}>
            The body is the prompt.
          </div>
          <div className="pub-subtitle" style={{ marginBottom: 4 }}>Language follows.</div>
        </div>

        <div className="pub-spacer" />

        <div className="pub-rule" />

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <div className="pub-label" style={{ marginBottom: 12, opacity: 0.5 }}>Yuyang Gu</div>
          <div className="pub-label" style={{ opacity: 0.3 }}>2026</div>
        </div>

        <div className="pub-spacer" />

        <div style={{ textAlign: 'center' }}>
          <div className="pub-caption" style={{ lineHeight: 1.8 }}>
            Part of the &quot;Prompted by the Body&quot; research series<br />
            Set in Geist Pixel<br />
            Built with Next.js, Three.js, TensorFlow.js<br />
            262,144 GPU particles
          </div>
        </div>
      </PublicationPage>
    </PublicationSpread>
  );
}
