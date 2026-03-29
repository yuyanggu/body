'use client';
import PublicationSpread from '../PublicationSpread';
import PublicationPage from '../PublicationPage';

export default function S03_ToolLandscape() {
  return (
    <PublicationSpread id="s03">
      {/* Page 5: 3-layer diagram */}
      <PublicationPage variant="dark" overlays={['dotgrid']} watermark="02">
        <h2 className="pub-title pub-title--section">The Tool Landscape</h2>

        <div className="pub-body" style={{ marginBottom: 24 }}>
          <p>
            &quot;Which AI should I use?&quot; is the wrong question. There are three layers,
            and confusing them will cost you weeks.
          </p>
        </div>

        <div className="pub-stack" style={{ marginBottom: 24 }}>
          <div className="pub-stack__bar pub-stack__bar--top">
            <span>How You Use It</span>
            <span style={{ fontFamily: 'var(--pub-font-body)', fontSize: 8, opacity: 0.6 }}>
              Workflows, documentation, prompts
            </span>
          </div>
          <div className="pub-stack__bar pub-stack__bar--middle">
            <span>Harness</span>
            <span style={{ fontFamily: 'var(--pub-font-body)', fontSize: 8, opacity: 0.6 }}>
              v0, Cursor, Claude Code
            </span>
          </div>
          <div className="pub-stack__bar pub-stack__bar--bottom">
            <span>Model</span>
            <span style={{ fontFamily: 'var(--pub-font-body)', fontSize: 8, opacity: 0.6 }}>
              GPT-4, Claude, Gemini
            </span>
          </div>
        </div>

        <div className="pub-body" style={{ marginTop: 'auto' }}>
          <p>
            The model is the sensor in a camera. Important, commoditized, and not what makes
            the photograph. The harness is the camera body. How you use it is the photographer.
          </p>
        </div>

        <div style={{ marginTop: 12 }}>
          <span className="pub-caption">02 / The Tool Landscape</span>
        </div>
      </PublicationPage>

      {/* Page 6: Comparison table */}
      <PublicationPage variant="dark" overlays={['scanlines']}>
        <div className="pub-label pub-accent-teal" style={{ marginBottom: 16 }}>Comparison</div>

        <table className="pub-table">
          <thead>
            <tr>
              <th style={{ width: '25%' }}></th>
              <th style={{ borderBottomColor: 'var(--pub-accent-teal)' }}>Describe &amp; Generate</th>
              <th style={{ borderBottomColor: 'var(--pub-accent-purple)' }}>Edit in Context</th>
              <th style={{ borderBottomColor: 'var(--pub-accent-magenta)' }}>Direct an Agent</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="col-label">Tools</td>
              <td>v0, Loveable</td>
              <td>Cursor, Antigravity</td>
              <td>Claude Code</td>
            </tr>
            <tr>
              <td className="col-label">What it sees</td>
              <td>Your prompt</td>
              <td>Open files</td>
              <td>Your entire project</td>
            </tr>
            <tr>
              <td className="col-label">Control</td>
              <td>Low</td>
              <td>Medium</td>
              <td>High</td>
            </tr>
            <tr>
              <td className="col-label">Ceiling</td>
              <td>UI prototypes</td>
              <td>Feature work</td>
              <td>System changes</td>
            </tr>
          </tbody>
        </table>

        <div className="pub-spacer" />

        <div className="pub-body">
          <p>
            Each jump traded polish for power. v0 felt like magic on day one.
            Claude Code felt like nothing was happening on day one. By week three,
            the relationship had reversed.
          </p>
        </div>

        <div className="pub-rule" />
        <span className="pub-caption" style={{ opacity: 0.25 }}>
          ↑ Where value accrues: not in the model, but in how you use the harness
        </span>
      </PublicationPage>
    </PublicationSpread>
  );
}
