import { useToast } from '../components/ToastProvider';
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import AuthStory from '../components/AuthStory';
import { authAPI } from '../services/api';
import { homePathFor, toStoredUser } from '../constants/accounts';

// The error region both fields reference, so a screen reader reading
// either one also hears why the form was refused.
const ERROR_ID = 'login-error';

export default function Login({ onLogin }) {
  const notify = useToast();
  const navigate = useNavigate();
  const location = useLocation();
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
      // Spring Boot returns { token, user: { id, name, email, role,
      // approvalStatus } }. Both must come from the server: letting the
      // sign-in form choose them would hand anyone the recruiter
      // dashboard.
      localStorage.setItem('token', data.token);
      const userData = toStoredUser(data.user, form.email.split('@')[0], form.email);
      localStorage.setItem('user', JSON.stringify(userData));
      onLogin(userData);
      notify('Signed in successfully.');
      // Back to where they were going (an invite link, say), if anywhere.
      navigate(location.state?.from || homePathFor(userData), { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Ambient background glow */}
      <AuthStory />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }} className="animate-fade-in-up">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <BrandLogo variant="mark" alt="Vynterva AI" className="auth-logo" />
          <h1 style={{
            fontSize: 'var(--fs-2xl)', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6,
            background: 'linear-gradient(var(--text-primary), var(--text-primary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Welcome back</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)' }}>Sign in to your Vynterva AI account</p>
        </div>

        <div className="card auth-card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label className="label" htmlFor="login-email">Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} aria-hidden="true" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="login-email" className="input" type="email" placeholder="you@example.com"
                  autoComplete="email"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? ERROR_ID : undefined}
                  style={{ paddingLeft: 42 }}
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="login-password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} aria-hidden="true" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="login-password" className="input" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? ERROR_ID : undefined}
                  style={{ paddingLeft: 42, paddingRight: 42 }}
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  aria-label={showPass ? 'Hide password' : 'Show password'} aria-pressed={showPass}
                  style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'color 0.2s' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Link to="/forgot-password" state={{ email: form.email }} style={{ color: 'var(--accent-cyan)', alignSelf: 'flex-end', fontSize: 'var(--fs-sm)' }}>Forgot password?</Link>

            {error && (
              <div id={ERROR_ID} role="alert" style={{
                background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 'var(--fs-sm)',
                color: 'var(--danger)',
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
          <p style={{ textAlign: 'center', fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
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
              onClick={() => navigate('/register', { state: location.state })}
              onMouseEnter={(e) => { e.target.style.textShadow = '0 0 12px color-mix(in srgb, var(--accent) 50%, transparent)'; }}
              onMouseLeave={(e) => { e.target.style.textShadow = 'none'; }}
            >Create one</button>
          </p>
        </div>
      </div>
    </div>
  );
}
