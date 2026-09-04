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
      navigate(role === 'recruiter' ? '/dashboard' : '/upload');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 300, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(216,196,182,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: '#D8C4B6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(216,196,182,0.3)',
          }}>
            <Brain size={28} color="#213555" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Welcome back</h1>
          <p style={{ color: '#F5EFE7', fontSize: 14 }}>Sign in to your AI Interview account</p>
        </div>

        <div className="card" style={{ padding: 32, background: '#000000' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#F5EFE7' }} />
                <input className="input" type="email" placeholder="you@example.com"
                  style={{ paddingLeft: 42 }}
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#F5EFE7' }} />
                <input className="input" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  style={{ paddingLeft: 42, paddingRight: 42 }}
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#F5EFE7' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(245,239,231,0.1)', border: '1px solid rgba(245,239,231,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#F5EFE7' }}>
                {error}
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 4 }}>
              {loading ? 'Signing in...' : <><span>Sign In</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="glow-line" />
          <p style={{ textAlign: 'center', fontSize: 13, color: '#F5EFE7' }}>
            Don't have an account?{' '}
            <span style={{ color: '#D8C4B6', cursor: 'pointer', fontWeight: 500 }}
              onClick={() => navigate('/register')}>Create one</span>
          </p>
        </div>
      </div>
    </div>
  );
}
