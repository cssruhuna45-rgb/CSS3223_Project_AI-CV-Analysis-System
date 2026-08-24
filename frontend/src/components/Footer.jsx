import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Brain, CheckCircle2 } from 'lucide-react';

const PRODUCT_LINKS = [
  { label: 'CV Analysis', to: '/upload' },
  { label: 'Practice Interview', to: '/interview' },
  { label: 'Skill Gap Report', to: '/skill-gap' },
];

const PLATFORM_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'For Recruiters', to: '/login' },
  { label: 'Create Account', to: '/register' },
  { label: 'Sign In', to: '/login' },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-main">
          <div className="footer-brand">
            <Link className="footer-logo" to="/" aria-label="AIInterview home">
              <span className="footer-logo-mark"><Brain size={18} /></span>
              <span>AI<span>Interview</span></span>
            </Link>
            <p>Build confidence. Sharpen your story. Land the opportunity.</p>
            <div className="footer-status"><CheckCircle2 size={14} /> Platform operational</div>
          </div>

          <div className="footer-links-group">
            <h2>Product</h2>
            {PRODUCT_LINKS.map(link => <Link key={link.label} to={link.to}>{link.label}<ArrowUpRight size={13} /></Link>)}
          </div>

          <div className="footer-links-group">
            <h2>Platform</h2>
            {PLATFORM_LINKS.map(link => <Link key={link.label} to={link.to}>{link.label}<ArrowUpRight size={13} /></Link>)}
          </div>

          <div className="footer-note">
            <span className="footer-kicker">AI-powered preparation</span>
            <p>Thoughtful feedback for every step between your CV and your next great role.</p>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 AIInterview. Built for better interviews.</span>
          <div><Link to="/">Privacy</Link><Link to="/">Terms</Link></div>
        </div>
      </div>
    </footer>
  );
}