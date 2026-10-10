import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { authAPI } from '../services/api';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authAPI.login(form.email, form.password);
      // Spring Boot returns { token, user: { id, name, email, role } }.
      // The role must come from the server: letting the sign-in form
      // choose it would hand anyone the recruiter dashboard.
      const role = data.user?.role || 'candidate';
      localStorage.setItem('token', data.token);
      const userData = {
        name: data.user?.name || form.email.split('@')[0],
        email: data.user?.email || form.email,
        role,
      };
      localStorage.setItem('user', JSON.stringify(userData));
      onLogin(userData);
      navigate(role === 'recruiter' ? '/dashboard' : '/home');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Ambient background glow */}
      <div className="auth-ambient" />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }} className="animate-fade-in-up">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="auth-icon">
            <Brain size={30} color="#FFFFFF" />
          </div>
          <h1 style={{
            fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6,
            background: 'linear-gradient(135deg, #F8FAFC 0%, #A5B4FC 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Welcome back</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Sign in to your AI Interview account</p>
        </div>

        <div className="card auth-card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label className="label">Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="input" type="email" placeholder="you@example.com"
                  style={{ paddingLeft: 42 }}
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="input" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  style={{ paddingLeft: 42, paddingRight: 42 }}
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'color 0.2s' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 13,
                color: '#FCA5A5',
                animation: 'fadeIn 0.3s ease',
              }}>
                {error}
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{
                width: '100%', justifyContent: 'center', padding: '13px', marginTop: 4, fontWeight: 700,
                transition: 'all 0.3s var(--ease-spring)',
              }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="animate-spin" style={{ display: 'inline-block' }}>⟳</span> Signing in...
                </span>
              ) : (
                <><span>Sign In</span><ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div className="glow-line" />
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <button
              type="button"
              aria-label="Create a new account"
              style={{
                color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 600,
                transition: 'all 0.2s ease',
                background: 'none', border: 'none', padding: 0,
                fontFamily: 'var(--font-sans)', fontSize: 'inherit',
                textDecoration: 'underline', textUnderlineOffset: '3px',
              }}
              onClick={() => navigate('/register')}
              onMouseEnter={(e) => { e.target.style.textShadow = '0 0 12px rgba(6, 182, 212, 0.5)'; }}
              onMouseLeave={(e) => { e.target.style.textShadow = 'none'; }}
            >Create one</button>
          </p>
        </div>
      </div>
    </div>
  );
}
