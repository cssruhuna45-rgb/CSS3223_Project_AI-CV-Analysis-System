import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Brain, LayoutDashboard, LogOut, ChevronDown, TrendingUp, Home, Award, Sparkles, Menu, X } from 'lucide-react';

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
  ];

  const candidateLinks = [
    { path: '/home', label: 'Workspace', icon: <Home size={15} /> },
    { path: '/progress', label: 'My Progress', icon: <TrendingUp size={15} /> },
    { path: '/scorecard', label: 'Scorecards', icon: <Award size={15} /> },
  ];

  const links = user?.role === 'recruiter' ? recruiterLinks : candidateLinks;

  return (
    <nav
      className="immersive-nav"
      role="navigation"
      aria-label="Main navigation"
      style={{
        boxShadow: scrolled ? '0 8px 32px rgba(0, 0, 0, 0.4)' : 'none',
        background: scrolled ? 'rgba(8, 12, 20, 0.92)' : 'rgba(8, 12, 20, 0.72)',
      }}
    >
      {/* Brand Logo */}
      <div
        className="nav-brand"
        onClick={() => navigate(user ? (user.role === 'recruiter' ? '/dashboard' : '/home') : '/')}
        role="button"
        tabIndex={0}
        aria-label="Go to home page"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(user ? (user.role === 'recruiter' ? '/dashboard' : '/home') : '/');
          }
        }}
      >
        <div className="nav-brand-icon">
          <Brain size={20} color="#FFFFFF" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', color: '#F8FAFC' }}>
            AI<span style={{
              background: 'linear-gradient(135deg, #818CF8 0%, #22D3EE 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Interview</span>
          </span>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '2px 7px',
            borderRadius: 6,
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#A5B4FC',
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

      {/* User Actions */}
      {user ? (
        <div style={{ position: 'relative' }} ref={dropdownRef} className="nav-user-desktop">
          <button
            className="btn btn-ghost"
            style={{
              gap: 10,
              fontSize: 13.5,
              padding: '6px 12px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
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
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
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
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 14,
                padding: '8px',
                minWidth: 210,
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.06)',
                animationDuration: '0.25s',
              }}
            >
              <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: 6 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{user.email}</div>
                <span style={{
                  display: 'inline-block',
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: '#22D3EE',
                  background: 'rgba(6, 182, 212, 0.12)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  borderRadius: 6,
                  padding: '2px 6px',
                  marginTop: 6,
                }}>
                  {user.role === 'recruiter' ? 'Recruiter' : 'Candidate'}
                </span>
              </div>
              <button
                className="btn btn-ghost"
                role="menuitem"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  fontSize: 13,
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
            style={{ fontSize: 13.5 }}
            onClick={() => navigate('/login')}
            aria-label="Sign in to your account"
          >
            Sign In
          </button>
          <button
            className="btn btn-primary"
            style={{ fontSize: 13.5, padding: '8px 18px' }}
            onClick={() => navigate('/register')}
            aria-label="Create a new account"
          >
            Get Started
          </button>
        </div>
      )}
    </nav>
  );
}
