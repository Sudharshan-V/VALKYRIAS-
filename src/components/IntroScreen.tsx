import React, { useEffect } from 'react';
import { ValkyriasLogo } from './ValkyriasLogo';

interface IntroScreenProps {
  onComplete: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(onComplete, prefersReducedMotion ? 650 : 2300);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="studio-intro"
      data-scroll-reveal-ignore
      role="status"
      aria-live="polite"
      aria-label="Valkyrias is preparing your creative workspace"
      aria-busy="true"
    >
      <div className="studio-intro__atmosphere" aria-hidden="true">
        <span className="studio-intro__grid" />
        <span className="studio-intro__beam" />
        <span className="studio-intro__halo studio-intro__halo--outer" />
        <span className="studio-intro__halo studio-intro__halo--inner" />
        <span className="studio-intro__spark studio-intro__spark--one" />
        <span className="studio-intro__spark studio-intro__spark--two" />
        <span className="studio-intro__spark studio-intro__spark--three" />
      </div>

      <span className="studio-intro__curtain studio-intro__curtain--left" aria-hidden="true" />
      <span className="studio-intro__curtain studio-intro__curtain--right" aria-hidden="true" />

      <div className="studio-intro__stage">
        <div className="studio-intro__eyebrow" aria-hidden="true">
          <span>V / 22</span>
          <span className="studio-intro__eyebrow-line" />
          <span>Creative command</span>
        </div>

        <div className="studio-intro__seal-shell" aria-hidden="true">
          <div className="studio-intro__seal">
            <span className="studio-intro__seal-rim" />
            <span className="studio-intro__seal-scan" />
            <div className="studio-intro__logo">
              <ValkyriasLogo size="xl" showText={false} />
            </div>
          </div>
        </div>

        <div className="studio-intro__wordmark">
          <h1>VALKYRIAS</h1>
          <span aria-hidden="true" />
        </div>

        <p className="studio-intro__manifesto">
          Cinematic craft <span aria-hidden="true">•</span> Secure delivery <span aria-hidden="true">•</span> Precise execution
        </p>

        <div className="studio-intro__status" aria-hidden="true">
          <span>Studio link</span>
          <span className="studio-intro__status-dots"><i /><i /><i /></span>
          <span>Ready</span>
        </div>
      </div>
    </div>
  );
};
