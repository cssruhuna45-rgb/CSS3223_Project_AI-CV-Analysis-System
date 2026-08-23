import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Mic, BarChart2, Shield, Zap, ChevronRight, FileText, Users } from 'lucide-react';

const FEATURES = [
  { icon: <Brain size={22} />, color: '#D8C4B6', title: 'AI-Powered Questions', desc: 'FastAPI + LangChain RAG generates tailored questions from your CV and job description.' },
  { icon: <Mic size={22} />, color: '#D8C4B6', title: 'Voice Interview', desc: 'Speak your answers naturally with real-time speech-to-text transcription.' },
  { icon: <BarChart2 size={22} />, color: '#D8C4B6', title: '4-Axis Scoring', desc: 'Get evaluated on Technical, Communication, Problem Solving, and Cultural Fit.' },
  { icon: <FileText size={22} />, color: '#D8C4B6', title: 'CV Analysis', desc: 'Upload your PDF resume and let AI extract skills, experience, and key insights.' },
  { icon: <Users size={22} />, color: '#F5EFE7', title: 'Recruiter Dashboard', desc: 'Manage candidates, compare scorecards, and make data-driven hiring decisions.' },
  { icon: <Shield size={22} />, color: '#D8C4B6', title: 'Secure & Private', desc: 'JWT-secured sessions with Spring Boot backend and encrypted data storage.' },
];

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div>
      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '100px 24px 80px', textAlign: 'center' }}>
        {/* Glow blobs */}
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(216,196,182,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', right: '15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(216,196,182,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(216,196,182,0.1)', border: '1px solid rgba(216,196,182,0.2)', borderRadius: 20, padding: '6px 14px', marginBottom: 28 }}>
            <Zap size={13} color="#D8C4B6" />
            <span style={{ fontSize: 13, color: '#D8C4B6', fontWeight: 500 }}>Powered by FastAPI + LangChain RAG</span>
          </div>

          <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.15, marginBottom: 20, letterSpacing: '-1px' }}>
            AI-Powered<br />
            <span style={{ color: '#D8C4B6' }}>
              Interview Platform
            </span>
          </h1>

          <p style={{ fontSize: 18, color: '#F5EFE7', lineHeight: 1.7, marginBottom: 36, maxWidth: 520, margin: '0 auto 36px' }}>
            Upload your CV, get AI-tailored interview questions, and receive a detailed performance scorecard — all in one platform.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" style={{ padding: '14px 28px', fontSize: 15 }}
              onClick={() => navigate('/register')}>
              Start Interview <ChevronRight size={16} />
            </button>
            <button className="btn btn-outline" style={{ padding: '14px 28px', fontSize: 15 }}
              onClick={() => navigate('/login')}>
              Recruiter Login
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 10 }}>Everything you need</h2>
          <p style={{ color: '#F5EFE7', fontSize: 15 }}>A complete AI interview ecosystem for candidates and recruiters</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {FEATURES.map(f => (
            <div key={f.title} className="card" style={{ transition: 'transform 0.2s, border-color 0.2s', cursor: 'default', background: '#000000' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = f.color + '60'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#3E5879'; }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `${f.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, marginBottom: 16 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: '#F5EFE7', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ maxWidth: 600, margin: '0 auto 80px', padding: '0 24px', textAlign: 'center' }}>
        <div className="card" style={{ background: '#000000', border: '1px solid rgba(216,196,182,0.2)' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Ready to start your interview?</h2>
          <p style={{ color: '#F5EFE7', fontSize: 14, marginBottom: 24 }}>Join thousands of candidates who improved their interview skills with AI feedback.</p>
          <button className="btn btn-primary" style={{ padding: '13px 32px', fontSize: 15 }}
            onClick={() => navigate('/register')}>
            Get Started Free <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
