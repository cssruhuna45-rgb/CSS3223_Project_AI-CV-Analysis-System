import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Brain, LayoutDashboard, LogOut, ChevronDown, TrendingUp, Home, Award, Sparkles, Menu, X, ShieldCheck, Briefcase } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { homePathFor, isApprovedRecruiter } from '../constants/accounts';

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on Escape key (Nielsen's Heuristic #3: User Control)
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setMenuOpen(false);
      setMobileOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  const recruiterLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
    { path: '/jobs', label: 'Jobs', icon: <Briefcase size={15} /> },
  ];

  const candidateLinks = [
    { path: '/home', label: 'Workspace', icon: <Home size={15} /> },
    { path: '/progress', label: 'My Progress', icon: <TrendingUp size={15} /> },
    { path: '/scorecard', label: 'Scorecards', icon: <Award size={15} /> },
  ];

  const adminLinks = [
    { path: '/admin', label: 'Administration', icon: <ShieldCheck size={15} /> },
  ];

  // A recruiter still waiting for approval gets no links: the only page
  // open to them is the waiting page itself.
  const links =
    user?.role === 'admin' ? adminLinks
    : isApprovedRecruiter(user) ? recruiterLinks
    : user?.role === 'recruiter' ? []
    : candidateLinks;

  const ROLE_LABELS = { admin: 'Administrator', recruiter: 'Recruiter', candidate: 'Candidate' };

  return (
    <nav
      className="immersive-nav"
      role="navigation"
      aria-label="Main navigation"
      style={{
        boxShadow: scrolled ? '0 8px 32px color-mix(in srgb, var(--shadow-ink) 40%, transparent)' : 'none',
        background: scrolled ? 'color-mix(in srgb, var(--bg-surface) 92%, transparent)' : 'color-mix(in srgb, var(--bg-surface) 72%, transparent)',
      }}
    >
      {/* Brand Logo */}
      <div
        className="nav-brand"
        onClick={() => navigate(homePathFor(user))}
        role="button"
        tabIndex={0}
        aria-label="Go to home page"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(homePathFor(user));
          }
        }}
      >
        <div className="nav-brand-icon">
          <Brain size={20} color="var(--on-accent)" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 'var(--fs-lg)', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            AI<span style={{
              background: 'linear-gradient(var(--accent-solid), var(--accent-solid))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Interview</span>
          </span>
          <span style={{
            fontSize: 'var(--fs-xs)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '2px 7px',
            borderRadius: 6,
            background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
            color: 'var(--accent)',
          }}>
            AI 2.0
          </span>
        </div>
      </div>

      {/* Mobile Hamburger Button */}
      {user && (
        <button
          className="nav-mobile-toggle"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      )}

      {/* Desktop Nav Links */}
      {user && (
        <div className="nav-links-desktop" role="menubar" aria-label="Page navigation">
          {links.map((l) => {
            const active = location.pathname === l.path;
            return (
              <button
                key={l.path}
                className={`nav-link-pill ${active ? 'nav-link-pill--active' : ''}`}
                onClick={() => navigate(l.path)}
                role="menuitem"
                aria-current={active ? 'page' : undefined}
                aria-label={`Navigate to ${l.label}`}
              >
                {l.icon} {l.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile Nav Menu (slide-down overlay) */}
      {user && mobileOpen && (
        <div
          id="mobile-nav-menu"
          className="nav-mobile-menu animate-fade-in"
          ref={mobileMenuRef}
          role="menu"
          aria-label="Mobile navigation"
        >
          {links.map((l) => {
            const active = location.pathname === l.path;
            return (
              <button
                key={l.path}
                className={`nav-mobile-link ${active ? 'nav-mobile-link--active' : ''}`}
                onClick={() => { navigate(l.path); setMobileOpen(false); }}
                role="menuitem"
                aria-current={active ? 'page' : undefined}
              >
                {l.icon} {l.label}
              </button>
            );
          })}
          <div className="glow-line" style={{ margin: '8px 0' }} />
          <button
            className="nav-mobile-link"
            style={{ color: 'var(--danger-light)' }}
            onClick={() => { setMobileOpen(false); onLogout(); }}
            role="menuitem"
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      )}

      {/* Theme switch and user actions, kept together on the right */}
      <div className="nav-actions">
      <ThemeToggle />
      {user ? (
        <div style={{ position: 'relative' }} ref={dropdownRef} className="nav-user-desktop">
          <button
            className="btn btn-ghost"
            style={{
              gap: 10,
              fontSize: 'var(--fs-sm)',
              padding: '6px 12px',
              borderRadius: 12,
              background: 'color-mix(in srgb, var(--fg) 3%, transparent)',
              border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
              transition: 'all 0.25s ease',
            }}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="User account menu"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <div style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'linear-gradient(var(--accent-solid), var(--accent-solid))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--fs-sm)',
              fontWeight: 700,
              color: 'var(--on-accent)',
              boxShadow: '0 2px 8px color-mix(in srgb, var(--accent) 30%, transparent)',
            }}>
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</span>
            <ChevronDown size={14} color="var(--text-muted)" style={{
              transition: 'transform 0.25s ease',
              transform: menuOpen ? 'rotate(180deg)' : 'rotate(0)',
            }} />
          </button>

          {menuOpen && (
            <div
              className="animate-fade-in-up"
              role="menu"
              aria-label="User account options"
              style={{
                position: 'absolute',
                right: 0,
                top: '120%',
                background: 'color-mix(in srgb, var(--bg-surface) 95%, transparent)',
                border: '1px solid color-mix(in srgb, var(--fg) 12%, transparent)',
                borderRadius: 14,
                padding: '8px',
                minWidth: 210,
                boxShadow: 'none',
                animationDuration: '0.25s',
              }}
            >
              <div style={{ padding: '10px 12px', borderBottom: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)', marginBottom: 6 }}>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{user.email}</div>
                <span style={{
                  display: 'inline-block',
                  fontSize: 'var(--fs-xs)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                  background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
                  borderRadius: 6,
                  padding: '2px 6px',
                  marginTop: 6,
                }}>
                  {ROLE_LABELS[user.role] || 'Candidate'}
                </span>
              </div>
              <button
                className="btn btn-ghost"
                role="menuitem"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  fontSize: 'var(--fs-sm)',
                  gap: 8,
                  padding: '8px 12px',
                  color: 'var(--danger-light)',
                  borderRadius: 8,
                }}
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 'var(--fs-sm)' }}
            onClick={() => navigate('/login')}
            aria-label="Sign in to your account"
          >
            Sign In
          </button>
          <button
            className="btn btn-primary"
            style={{ fontSize: 'var(--fs-sm)', padding: '8px 18px' }}
            onClick={() => navigate('/register')}
            aria-label="Create a new account"
          >
            Get Started
          </button>
        </div>
      )}
      </div>
    </nav>
  );
}
