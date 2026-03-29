'use client';
import PublicationSpread from '../PublicationSpread';
import PublicationPage from '../PublicationPage';

export default function S06_ShowDontDescribe() {
  return (
    <PublicationSpread id="s06">
      {/* Page 11: Show Don't Describe + dot comparison */}
      <PublicationPage variant="dark" overlays={['scanlines']} watermark="05">
        <h2 className="pub-title pub-title--section">Show, Don&apos;t Describe</h2>

        <div className="pub-body" style={{ marginBottom: 20 }}>
          <p>
            You already know how to communicate visual intent. Moodboards, reference images,
            annotated screenshots. These skills transfer to AI and outperform technical prompts.
          </p>
          <p>
            I described &quot;denser, more volumetric&quot; in text. The AI made changes that were
            technically faithful and visually dead. I shared reference images. The AI understood
            the spatial strategy in seconds.
          </p>
        </div>

        {/* Dot comparison */}
        <div className="pub-dotcomp" style={{ marginBottom: 16 }}>
          <div className="pub-dotcomp__box pub-dotcomp__box--sparse">
            <span className="pub-dotcomp__label">Text Prompt</span>
          </div>
          <div className="pub-dotcomp__box pub-dotcomp__box--dense">
            <span className="pub-dotcomp__label">Reference Image</span>
          </div>
        </div>

        <div className="pub-caption" style={{ marginBottom: 'auto' }}>
          Sparse, uniform result vs. clustered, alive result
        </div>

        <blockquote className="pub-quote" style={{ fontSize: 11 }}>
          AI reads images as technical specifications, not aesthetic targets.
          The feel is yours to tune.
        </blockquote>

        <div style={{ marginTop: 12 }}>
          <span className="pub-caption">05 / Show, Don&apos;t Describe</span>
        </div>
      </PublicationPage>

      {/* Page 12: Directing the Agent — 2x2 grid */}
      <PublicationPage variant="dark" overlays={['dotgrid']} watermark="06">
        <h2 className="pub-title pub-title--section">Directing the Agent</h2>

        <div className="pub-body" style={{ marginBottom: 20 }}>
          <p>
            Working with an agentic AI is a design process. It rewards the same instincts
            you already have: iterating, giving directional feedback, knowing when something
            needs another pass.
          </p>
        </div>

        <div className="pub-grid-2x2">
          <div className="pub-grid-2x2__cell">
            <div className="pub-grid-2x2__cell-title">Plan before you build</div>
            <div className="pub-grid-2x2__cell-body">
              Ask the AI to make a plan. Read it. Push back. Revise. Then let it execute.
            </div>
          </div>
          <div className="pub-grid-2x2__cell">
            <div className="pub-grid-2x2__cell-title">Ask it to ask you</div>
            <div className="pub-grid-2x2__cell-body">
              Don&apos;t write the perfect brief. Say: &quot;before you start, ask me what you need to know.&quot;
            </div>
          </div>
          <div className="pub-grid-2x2__cell">
            <div className="pub-grid-2x2__cell-title">Start simple, then layer</div>
            <div className="pub-grid-2x2__cell-body">
              Get the basic version running. Low fidelity first, increase resolution as you learn.
            </div>
          </div>
          <div className="pub-grid-2x2__cell">
            <div className="pub-grid-2x2__cell-title">Iterate the prompt</div>
            <div className="pub-grid-2x2__cell-body">
              Your first prompt will be wrong. Your tenth will fit how you think. The prompt is the prototype.
            </div>
          </div>
        </div>

        <div className="pub-spacer" />

        <div style={{ marginTop: 12 }}>
          <span className="pub-caption">06 / Directing the Agent</span>
        </div>
      </PublicationPage>
    </PublicationSpread>
  );
}
