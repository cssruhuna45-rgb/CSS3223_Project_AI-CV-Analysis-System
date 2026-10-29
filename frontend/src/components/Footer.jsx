import React from 'react';
import { Link } from 'react-router-dom';
import { homePathFor } from '../constants/accounts';
import BrandLogo from './BrandLogo';

const PRODUCT_LINKS = [
  { label: 'CV Analysis', to: '/upload' },
  { label: 'Practice Interview', to: '/interview' },
  { label: 'Skill Gap Report', to: '/skill-gap' },
];

// The links depend on who is looking. A signed-in candidate was being
// offered "Sign In" and "Create Account", which they no longer need,
// instead of the pages they actually use.
function platformLinks(user) {
  if (!user) {
    return [
      { label: 'Home', to: '/' },
      { label: 'For Recruiters', to: '/login' },
      { label: 'Create Account', to: '/register' },
      { label: 'Sign In', to: '/login' },
    ];
  }

  if (user.role === 'admin') {
    return [{ label: 'Administration', to: '/admin' }];
  }

  if (user.role === 'recruiter') {
    // homePathFor sends a recruiter still waiting for approval to the
    // waiting page instead of a dashboard that would refuse them.
    return homePathFor(user) === '/recruiter'
      ? [{ label: 'Dashboard', to: '/recruiter' }, { label: 'Jobs', to: '/jobs' }]
      : [{ label: 'Dashboard', to: homePathFor(user) }];
  }

  return [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'My Progress', to: '/progress' },
    { label: 'Scorecards', to: '/scorecard' },
  ];
}

// Removed on purpose:
// - "Platform operational": a fixed badge that said the system was up
//   even when it was down. A status nobody measures misleads.
// - Privacy and Terms: both linked to the home page; there are no such
//   pages yet.
// - The arrow-out icon on every link: it means "opens another site",
//   and every link here stays inside the app.
export default function Footer({ user }) {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-main">
          <div className="footer-brand">
            {/* Mark as artwork, wordmark as text: the supplied lockup's
                wordmark is white, and the footer follows the theme. */}
            <Link className="footer-logo" to="/" aria-label="Vynterva AI home">
              <BrandLogo variant="mark" alt="" className="footer-logo-mark" />
              <span>VYNTERVA<span> AI</span></span>
            </Link>
            <p>Build confidence. Sharpen your story. Land the opportunity.</p>
          </div>

          {/* Candidate tools, so not offered to recruiters or administrators. */}
          {(!user || user.role === 'candidate') && (
            <nav className="footer-links-group" aria-label="Product">
              <h2>Product</h2>
              {PRODUCT_LINKS.map(link => <Link key={link.label} to={link.to}>{link.label}</Link>)}
            </nav>
          )}

          <nav className="footer-links-group" aria-label="Platform">
            <h2>Platform</h2>
            {platformLinks(user).map(link => <Link key={link.label} to={link.to}>{link.label}</Link>)}
          </nav>

          <div className="footer-note">
            <span className="footer-kicker">AI-powered preparation</span>
            <p>Thoughtful feedback for every step between your CV and your next great role.</p>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Vynterva AI. Built for better interviews.</span>
        </div>
      </div>
    </footer>
  );
}
