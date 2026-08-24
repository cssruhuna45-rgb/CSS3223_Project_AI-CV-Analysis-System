import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../services/api';

export default function Register({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'candidate' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authAPI.register(form.name, form.email, form.password, form.role);
      // Spring Boot returns { token, user }
      localStorage.setItem('token', data.token);
      const user = { name: data.user?.name || form.name, email: data.user?.email || form.email, role: data.user?.role || form.role };
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);
      navigate(form.role === 'recruiter' ? '/dashboard' : '/upload');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Create account</h1>
          <p style={{ color: '#F5EFE7', fontSize: 14 }}>Join the AI Interview Platform</p>
        </div>

        <div className="card" style={{ padding: 32, background: '#000000' }}>
          <div style={{ display: 'flex', background: '#213555', borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {['candidate', 'recruiter'].map(r => (
              <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, transition: 'all 0.2s',
                  background: form.role === r ? '#D8C4B6' : 'transparent',
                  color: form.role === r ? '#213555' : '#F5EFE7',
                }}>
                {r === 'candidate' ? 'Candidate' : 'Recruiter'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#F5EFE7' }} />
                <input className="input" placeholder="John Doe" style={{ paddingLeft: 42 }}
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className="label">Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#F5EFE7' }} />
                <input className="input" type="email" placeholder="you@example.com" style={{ paddingLeft: 42 }}
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#F5EFE7' }} />
                <input className="input" type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters"
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
              {loading ? 'Creating account...' : <><span>Create Account</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="glow-line" />
          <p style={{ textAlign: 'center', fontSize: 13, color: '#F5EFE7' }}>
            Already have an account?{' '}
            <span style={{ color: '#D8C4B6', cursor: 'pointer', fontWeight: 500 }}
              onClick={() => navigate('/login')}>Sign in</span>
          </p>
        </div>
      </div>
    </div>
  );
}
