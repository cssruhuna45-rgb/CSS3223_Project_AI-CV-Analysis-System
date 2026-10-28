import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, ArrowRight, ChevronRight } from 'lucide-react';

import BrandLogo from '../components/BrandLogo';

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
    <div className="focus-home">
      <header className="focus-intro">
        <h2 className="focus-intro-title">Welcome to your workspace</h2>
        <p className="focus-intro-text">
          Get AI-powered insights, improve your CV, and practise for
          interviews &mdash; all in one place.
        </p>
      </header>

      <section className="focus-feature" aria-labelledby="focus-feature-title">
        <div className="focus-feature-body">
          <p className="focus-eyebrow">Career growth starts here</p>

          <h3 id="focus-feature-title" className="focus-feature-title">
            Ready for your next opportunity?
          </h3>

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

      <nav className="focus-actions" aria-label="Get started">
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
    </div>
  );
}
