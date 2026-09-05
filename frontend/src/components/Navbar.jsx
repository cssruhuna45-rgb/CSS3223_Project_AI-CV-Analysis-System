import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Brain, LayoutDashboard, LogOut, ChevronDown, TrendingUp } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const recruiterLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
  ];

  // Candidates get their own interview record; recruiters have no
  // progress of their own to look at.
  const candidateLinks = [
    { path: '/progress', label: 'My Progress', icon: <TrendingUp size={15} /> },
  ];

  const links = user?.role === 'recruiter' ? recruiterLinks : candidateLinks;

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: '#112D4E', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid #3E5879',
      padding: '0 32px', height: '64px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        onClick={() => navigate(user ? (user.role === 'recruiter' ? '/dashboard' : '/upload') : '/')}>
        
        <span style={{ fontWeight: 700, fontSize: 25, letterSpacing: '-0.3px' }}>
          AI<span style={{ color: '#D8C4B6' }}>Interview</span>
        </span>
      </div>

      {/* Nav Links */}
      {user && (
        <div style={{ display: 'flex', gap: 4 }}>
          {links.map(l => (
            <button key={l.path} className="btn btn-ghost"
              onClick={() => navigate(l.path)}
              style={{
                color: location.pathname === l.path ? '#D8C4B6' : undefined,
                background: location.pathname === l.path ? 'rgba(216,196,182,0.1)' : undefined,
                fontSize: 13,
              }}>
              {l.icon} {l.label}
            </button>
          ))}
        </div>
      )}

      {/* User Menu */}
      {user ? (
        <div style={{ position: 'relative' }}>
          <button className="btn btn-ghost" style={{ gap: 8, fontSize: 13 }}
            onClick={() => setMenuOpen(o => !o)}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: '#D8C4B6',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600,
            }}>
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span>{user.name}</span>
            <ChevronDown size={14} />
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '110%',
              background: '#3E5879', border: '1px solid #3E5879',
              borderRadius: 12, padding: 8, minWidth: 180,
              boxShadow: '0 8px 32px rgba(33,53,85,0.4)',
            }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #3E5879', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{user.name}</div>
                <div style={{ fontSize: 11, color: '#F5EFE7' }}>{user.email}</div>
              </div>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: 13, gap: 8 }}
                onClick={() => { setMenuOpen(false); onLogout(); }}>
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => navigate('/login')}>Sign In</button>
          <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => navigate('/register')}>Get Started</button>
        </div>
      )}
    </nav>
  );
}
