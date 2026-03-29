'use client';
import PublicationSpread from '../PublicationSpread';
import PublicationPage from '../PublicationPage';

export default function S11_RoleTransforming() {
  return (
    <PublicationSpread id="s11">
      {/* Page 21: Fading / Emerging columns */}
      <PublicationPage variant="dark" overlays={['scanlines']} watermark="11">
        <h2 className="pub-title pub-title--section">The Role is Transforming</h2>

        <div className="pub-body" style={{ marginBottom: 24 }}>
          <p>
            Some design work is now cheap. Laying out a settings page? Prompt.
            Building a card grid? Prompt. That work took skill. The cost collapsed.
          </p>
        </div>

        <div className="pub-columns">
          <div>
            <div className="pub-label" style={{ marginBottom: 12, opacity: 0.3 }}>Fading</div>
            <ul className="pub-columns__list pub-columns__list--fading">
              <li>Execution as differentiator</li>
              <li>Pixel-perfect delivery</li>
              <li>Component assembly</li>
              <li>Layout decisions</li>
              <li>Spec writing for simple features</li>
            </ul>
          </div>

          <div className="pub-columns__divider" />

          <div>
            <div className="pub-label" style={{ marginBottom: 12, color: 'var(--pub-accent-teal)' }}>Emerging</div>
            <ul className="pub-columns__list pub-columns__list--emerging">
              <li>Tool-building for creative control</li>
              <li>Restraint design</li>
              <li>Documentation as design material</li>
              <li>Parameter space exploration</li>
              <li>System architecture</li>
              <li>Taste</li>
            </ul>
          </div>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <span className="pub-caption">11 / The Role is Transforming</span>
        </div>
      </PublicationPage>

      {/* Page 22: Statement */}
      <PublicationPage variant="dark-alt" overlays={['dotgrid']}>
        <div className="pub-spacer" />

        <div className="pub-body" style={{ marginBottom: 24 }}>
          <p>
            73% of designers see AI as a collaborator. The role is moving toward what
            some call the &quot;design engineer&quot; — someone who uses AI for production
            while focusing on strategy, context, and craft.
          </p>
          <p>
            Execution speed is no longer the bottleneck. Seeing is. Tasting is.
            Looking at something defensible and saying: not yet.
          </p>
        </div>

        <div className="pub-rule--accent" style={{ width: '100%', height: 1, background: 'var(--pub-accent-teal)', opacity: 0.2, margin: '20px 0' }} />

        <div className="pub-statement" style={{ fontSize: 18, lineHeight: 1.4 }}>
          If you can describe it in a prompt,
          the prompt <span className="pub-accent-magenta">replaces you.</span>
        </div>

        <div className="pub-spacer" />

        <div className="pub-body" style={{ opacity: 0.5 }}>
          <p>
            The designers who do well from here will treat code as a material.
            They&apos;ll build things, not pictures of things. They&apos;ll develop taste
            that resists description.
          </p>
        </div>
      </PublicationPage>
    </PublicationSpread>
  );
}
