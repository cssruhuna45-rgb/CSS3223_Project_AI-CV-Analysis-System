import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { authAPI } from '../services/api';
import { FieldError, FormAlert, useFormErrors } from '../components/FormErrors';

export default function PasswordRecovery({ reset = false, onReset }) {
  const location = useLocation();
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') || '');
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const errors = useFormErrors('recovery', ['email', 'password'], {
    ids: { email: 'recovery-email', password: 'new-password' },
  });
  const [message, setMessage] = useState('');
  const validLink = /^[A-Za-z0-9_-]{43}$/.test(token);

  async function submit(event) {
    event.preventDefault();
    errors.clear();
    if (reset && password !== confirm) {
      errors.report(null, 'The passwords do not match. Enter the same password in both boxes.');
      return;
    }
    setLoading(true);
    try {
      const result = reset
        ? await authAPI.resetPassword(token, password)
        : await authAPI.forgotPassword(email.trim());
      setMessage(result.message);
      if (reset) {
        setPassword('');
        setConfirm('');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
        window.history.replaceState(null, '', location.pathname);
        onReset?.();
      }
    } catch (err) {
      // The request-a-link answer is the same whether or not the account
      // exists, so nothing here can reveal which emails are registered.
      errors.report(err, reset
        ? "We couldn't reset your password. Please try again."
        : "We couldn't send a reset link right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-ambient" />
      <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="auth-icon"><LockKeyhole size={30} color="var(--on-accent)" /></div>
          <h1 style={{ fontSize: 'var(--fs-2xl)', marginBottom: 8 }}>{reset ? 'Reset your password' : 'Forgot password?'}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{reset ? 'Choose a new password for your account.' : 'Enter your email and we’ll send you a reset link.'}</p>
        </div>
        <div className="card auth-card">
          {message ? <p role="status">{message}</p> : reset && !validLink ? (
            <p role="alert">This reset link is missing or invalid. Request a new link below.</p>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {reset ? <>
                <div><label className="label" htmlFor="new-password">New password</label>
                  <input id="new-password" className="input" type="password" autoComplete="new-password" required minLength={6} maxLength={72} value={password} onChange={e => { errors.clearField('password'); setPassword(e.target.value); }} {...errors.fieldProps('password', 'password-hint')} />
                  <p id="password-hint" style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', marginTop: 6 }}>Use 6–72 characters.</p>
                  <FieldError errors={errors} field="password" /></div>
                <div><label className="label" htmlFor="confirm-password">Confirm new password</label>
                  <input id="confirm-password" className="input" type="password" autoComplete="new-password" required minLength={6} maxLength={72} value={confirm} onChange={e => setConfirm(e.target.value)} /></div>
              </> : <div>
                <label className="label" htmlFor="recovery-email">Email address</label>
                <input id="recovery-email" className="input" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => { errors.clearField('email'); setEmail(e.target.value); }} placeholder="you@example.com" {...errors.fieldProps('email')} />
                <FieldError errors={errors} field="email" />
              </div>}
              <FormAlert id="recovery-alert" message={errors.message} />
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: 'center' }}>
                {loading ? 'Please wait...' : reset ? 'Reset password' : 'Send reset link'}
              </button>
            </form>
          )}
          <div className="glow-line" />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 'var(--fs-sm)' }}>
            <Link to="/login" style={{ color: 'var(--accent-cyan)' }}>Back to sign in</Link>
            {reset && !message && <Link to="/forgot-password" style={{ color: 'var(--accent-cyan)' }}>Request a new link</Link>}
            {!reset && message && <button type="button" className="btn" onClick={() => setMessage('')}>Try again</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
