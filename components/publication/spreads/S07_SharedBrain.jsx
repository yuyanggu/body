'use client';
import PublicationSpread from '../PublicationSpread';
import PublicationPage from '../PublicationPage';

export default function S07_SharedBrain() {
  return (
    <PublicationSpread id="s07">
      {/* Page 13: Terminal code block */}
      <PublicationPage variant="dark" overlays={['scanlines']} watermark="07">
        <h2 className="pub-title pub-title--section">The Shared Brain</h2>

        <div className="pub-terminal" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="pub-terminal__bar">
            <span className="pub-terminal__dot" />
            <span className="pub-terminal__dot" />
            <span className="pub-terminal__dot" />
            <span className="pub-terminal__title">CLAUDE.md</span>
          </div>
          <div className="pub-terminal__body" style={{ flex: 1, overflow: 'hidden' }}>
            <div><span className="t-section">## Stack</span></div>
            <div><span className="t-comment">  </span>Next.js 16 + React 19 + Three.js</div>
            <div><span className="t-comment">  </span>TensorFlow.js + MoveNet</div>
            <div><span className="t-comment">  </span>Zustand, OpenAI API</div>
            <br />
            <div><span className="t-section">## Architecture</span></div>
            <div><span className="t-comment">  </span>React shell wrapping imperative core</div>
            <div><span className="t-comment">  </span>Mutable singletons: config, bodyState</div>
            <br />
            <div><span className="t-section">## GPU Particle System</span></div>
            <div><span className="t-comment">  </span><span className="t-key">Layer A</span> — Body Fill (256 slots)</div>
            <div><span className="t-comment">  </span><span className="t-key">Layer B</span> — Skeleton Only (17 + bones)</div>
            <div><span className="t-comment">  </span>Pipeline: Sample → Noise → Sort → Shadow</div>
            <br />
            <div><span className="t-section">## Key Integration Points</span></div>
            <div><span className="t-comment">  </span><span className="t-value">bodyState.keypoints</span></div>
            <div><span className="t-comment">  </span><span className="t-value">processKeypoints()</span></div>
            <div><span className="t-comment">  </span><span className="t-value">keypointSamplerA.update()</span></div>
            <div><span className="t-comment">  </span><span className="t-value">animate()</span></div>
            <br />
            <div><span className="t-section">## Shader Uniforms</span></div>
            <div><span className="t-comment">  </span>speed: <span className="t-value">1.7</span> | curlSize: <span className="t-value">0.1</span></div>
            <div><span className="t-comment">  </span>attraction: <span className="t-value">2.9</span> | radius: <span className="t-value">308</span></div>
            <div><span className="t-comment">  </span>gridSpacing: <span className="t-value">1.3</span></div>
            <br />
            <div><span className="t-section">## Conventions</span></div>
            <div><span className="t-comment">  </span>No TypeScript. Pure JS/JSX.</div>
            <div><span className="t-comment">  </span>TensorFlow via CDN, not npm.</div>
            <div><span className="t-comment">  </span>Core modules: plain ES, no React.</div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <span className="pub-caption">07 / The Shared Brain — CLAUDE.md structure</span>
        </div>
      </PublicationPage>

      {/* Page 14: Essay */}
      <PublicationPage variant="dark-alt">
        <div className="pub-spacer--sm" />

        <div className="pub-body" style={{ flex: 1 }}>
          <p>
            An AI coding session starts by reading your project. If there&apos;s nothing to read,
            you spend ten minutes re-explaining your architecture, your constraints, your past
            decisions. Every session.
          </p>
          <p>
            A markdown file in your project folder changes that. It becomes persistent memory
            between you and the AI. Architecture decisions, naming conventions, integration points,
            failed approaches. All written for the next AI session, not for a human audience.
          </p>
          <p>
            With the file in place, sessions started competent. The AI knew the architecture.
            It didn&apos;t suggest refactoring patterns I&apos;d chosen on purpose. The difference:
            a collaborator who remembers last week versus one with amnesia.
          </p>
          <p>
            Start the file on day one. Update it when decisions change. Stale documentation
            is worse than none, because the AI trusts what it reads without question.
          </p>
        </div>

        <div className="pub-rule" />

        <blockquote className="pub-quote pub-quote--large">
          Documentation stopped being for humans. It became shared memory between sessions.
        </blockquote>
      </PublicationPage>
    </PublicationSpread>
  );
}
