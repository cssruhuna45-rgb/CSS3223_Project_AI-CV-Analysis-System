import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, ArrowRight, ChevronRight } from 'lucide-react';

import BrandLogo from '../components/BrandLogo';
import useScrollReveal from '../hooks/useScrollReveal';

/**
 * The signed-in candidate's front door.
 *
 * <p>Orientation and a next step, not a second copy of the data.
 * /dashboard already carries the latest CV, the score summary and
 * recent scorecards; repeating any of that here would leave two
 * screens claiming to be the current state of one account, and one of
 * them would go stale.
 *
 * <p>Nothing on this page is invented. Every card goes to a route the
 * account can already open, and no number, score or activity count is
 * shown - the page has made no request, so it has nothing to report.
 */
export default function CandidateHome() {
  const navigate = useNavigate();
  const pageRef = useRef(null);
  useScrollReveal(pageRef);

  const actions = [
    {
      path: '/upload',
      label: 'Analyse your CV',
      text: 'Discover strengths and skill gaps.',
      icon: FileText,
    },
    {
      path: '/join',
      label: 'Join an interview',
      text: 'Enter your recruiter invitation code.',
      icon: Users,
    },
  ];

  return (
    <div className="focus-home workspace-page" ref={pageRef}>
      <header className="focus-intro">
        <h1 className="focus-intro-title">Welcome to your workspace</h1>
        <p className="focus-intro-text">
          Get AI-powered insights, improve your CV, and practise for
          interviews &mdash; all in one place.
        </p>
      </header>

      <section className="focus-feature" aria-labelledby="focus-feature-title">
        <div className="focus-feature-body">
          <p className="focus-eyebrow">Career growth starts here</p>

          <h2 id="focus-feature-title" className="focus-feature-title">
            Ready for your next opportunity?
          </h2>

          <p className="focus-feature-text">
            Improve your CV, uncover skill gaps and practise with realistic
            interview questions.
          </p>

          {/* An interview starts from an analysed CV, so this opens the
              upload step rather than jumping past it to /interview. */}
          <button
            type="button"
            className="btn btn-primary focus-feature-cta"
            onClick={() => navigate('/upload')}
          >
            Analyse my CV
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="focus-feature-art">
          {/* The mark alone: this tint changes with the theme, and the
              full lockup's white wordmark would vanish on the light one. */}
          <BrandLogo variant="mark" alt="" className="focus-feature-logo" />
        </div>
      </section>

      <nav className="focus-actions subreveal" aria-label="Get started">
        {actions.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              type="button"
              className="focus-action"
              onClick={() => navigate(item.path)}
            >
              <span className="focus-action-icon">
                <Icon size={20} aria-hidden="true" />
              </span>

              <span className="focus-action-text">
                <span className="focus-action-label">{item.label}</span>
                <span className="focus-action-description">{item.text}</span>
              </span>

              <ChevronRight
                size={18}
                aria-hidden="true"
                className="focus-action-chevron"
              />
            </button>
          );
        })}
      </nav>
      <ol className="welcome-journey subreveal" aria-label="Your preparation journey">
        <li><span className="welcome-journey-number">01</span><div><strong>Understand your experience</strong><p>Start with your CV and skills.</p></div></li>
        <li><span className="welcome-journey-number">02</span><div><strong>Practise with direction</strong><p>Focus on your target career track.</p></div></li>
        <li><span className="welcome-journey-number">03</span><div><strong>Build on your feedback</strong><p>Turn your results into a learning plan.</p></div></li>
      </ol>
    </div>
  );
}
