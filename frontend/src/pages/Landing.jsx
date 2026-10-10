import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Mic, BarChart2, Shield, Zap, ChevronRight, FileText, Users, Sparkles, Award, Compass } from 'lucide-react';

const FEATURES = [
  {
    icon: <Brain size={24} />,
    color: '#818CF8',
    bg: 'rgba(99, 102, 241, 0.15)',
    glow: 'rgba(99, 102, 241, 0.3)',
    title: 'AI-Powered Questions',
    desc: 'LangChain RAG retrieves deep technical context from industry standards and your specific CV to form tailored questions.',
  },
  {
    icon: <Mic size={24} />,
    color: '#22D3EE',
    bg: 'rgba(6, 182, 212, 0.15)',
    glow: 'rgba(6, 182, 212, 0.3)',
    title: 'Real-Time Voice Studio',
    desc: 'Speak answers naturally with live speech-to-text recognition, timed turn pressure, and text-to-speech audio questions.',
  },
  {
    icon: <BarChart2 size={24} />,
    color: '#34D399',
    bg: 'rgba(16, 185, 129, 0.15)',
    glow: 'rgba(16, 185, 129, 0.3)',
    title: '4-Axis Competency Scoring',
    desc: 'Get evaluated objectively across Technical Knowledge, Implementation Depth, Problem Solving, and Communication Clarity.',
  },
  {
    icon: <FileText size={24} />,
    color: '#FBBF24',
    bg: 'rgba(245, 158, 11, 0.15)',
    glow: 'rgba(245, 158, 11, 0.3)',
    title: 'Intelligent CV Parsing',
    desc: 'Instantly extract skills, seniority level, and discover hidden skill gaps tailored to your dream career track.',
  },
  {
    icon: <Compass size={24} />,
    color: '#F472B6',
    bg: 'rgba(244, 114, 182, 0.15)',
    glow: 'rgba(244, 114, 182, 0.3)',
    title: '14-Day Action Roadmap',
    desc: 'Transform interview mistakes into a daily curriculum with curated study topics, practical code exercises, and milestones.',
  },
  {
    icon: <Users size={24} />,
    color: '#60A5FA',
    bg: 'rgba(59, 130, 246, 0.15)',
    glow: 'rgba(59, 130, 246, 0.3)',
    title: 'Recruiter Intelligence',
    desc: 'Rank candidates automatically, inspect verifiable turn-by-turn transcripts, and make confident data-driven hires.',
  },
];

/* Intersection Observer hook for scroll-based reveals */
function useReveal(ref) {
  useEffect(() => {
    if (!ref.current) return;
    const sections = ref.current.querySelectorAll('.reveal-section');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [ref]);
}

export default function Landing({ user }) {
  const navigate = useNavigate();
  const startPath = user ? (user.role === 'recruiter' ? '/dashboard' : '/upload') : '/register';
  const pageRef = useRef(null);
  useReveal(pageRef);

  return (
    <div ref={pageRef} style={{ position: 'relative', overflowX: 'hidden' }}>
      {/* Hero Section */}
      <div style={{ position: 'relative', padding: '110px 24px 80px', textAlign: 'center' }}>
        {/* Top ambient glow */}
        <div style={{
          position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
          width: 1000, height: 600,
          background: 'radial-gradient(ellipse at 50% 20%, rgba(99, 102, 241, 0.2) 0%, rgba(6, 182, 212, 0.08) 40%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 840, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Pill Tag */}
          <div className="hero-pill" style={{ marginBottom: 28 }}>
            <Sparkles size={14} color="#22D3EE" />
            <span style={{ fontSize: 13, color: '#A5B4FC', fontWeight: 600 }}>
              Next-Gen AI Interview Intelligence · 2026 Edition
            </span>
          </div>

          {/* Heading */}
          <h1 className="hero-title" style={{ marginBottom: 24 }}>
            Master Your Next Interview with{' '}
            <span style={{
              background: 'linear-gradient(135deg, #818CF8 0%, #22D3EE 50%, #34D399 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundSize: '200% auto',
              animation: 'shimmer 4s linear infinite',
            }}>
              Autonomous AI
            </span>
          </h1>

          <p className="hero-subtitle" style={{ marginBottom: 38 }}>
            Upload your CV, experience adaptive voice-enabled technical interviews, receive turn-by-turn evaluations, and unlock a personalized 14-day study roadmap.
          </p>

          {/* Action Buttons */}
          <div className="hero-actions">
            <button
              className="btn btn-cta"
              onClick={() => navigate(startPath)}
            >
              Start Free Practice <ChevronRight size={17} />
            </button>
            <button
              className="btn btn-outline"
              style={{ padding: '14px 28px', fontSize: 15.5 }}
              onClick={() => navigate('/login')}
            >
              Recruiter Dashboard
            </button>
          </div>

          {/* Floating stats pills */}
          <div style={{
            display: 'flex', gap: 24, justifyContent: 'center', marginTop: 50,
            flexWrap: 'wrap',
            animation: 'fadeInUp 1s var(--ease-out-expo) 0.5s forwards',
            opacity: 0,
          }}>
            {[
              { label: 'RAG-Powered', icon: <Brain size={14} /> },
              { label: 'Voice Enabled', icon: <Mic size={14} /> },
              { label: 'Instant Scoring', icon: <BarChart2 size={14} /> },
              { label: 'Enterprise Secure', icon: <Shield size={14} /> },
            ].map((s) => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 20,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#94A3B8', fontSize: 12.5, fontWeight: 500,
              }}>
                <span style={{ color: '#22D3EE' }}>{s.icon}</span>
                {s.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="reveal-section" style={{ maxWidth: 1120, margin: '0 auto', padding: '60px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#22D3EE' }}>
            Engineered for Precision
          </span>
          <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 8, color: '#F8FAFC' }}>
            Everything You Need to Get Hired
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 6 }}>
            Designed using cognitive HCI principles and modern retrieval-augmented generation.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
        }}>
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="feature-card-static stagger-item"
              style={{
                '--feature-accent': f.color,
                '--feature-glow': f.glow,
              }}
            >
              <div
                className="feature-icon"
                style={{
                  background: f.bg,
                  border: `1px solid ${f.color}40`,
                  color: f.color,
                  boxShadow: `0 0 16px ${f.color}20`,
                }}
              >
                {f.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#F8FAFC', marginBottom: 10 }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.65 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Section */}
      <div className="reveal-section" style={{ maxWidth: 1120, margin: '0 auto', padding: '20px 24px 80px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20,
        }}>
          {[
            { value: '10k+', label: 'Practice Sessions', color: '#818CF8' },
            { value: '95%', label: 'User Satisfaction', color: '#22D3EE' },
            { value: '4.8/5', label: 'Average Rating', color: '#34D399' },
            { value: '<2s', label: 'Response Time', color: '#FBBF24' },
          ].map((m) => (
            <div
              key={m.label}
              className="stat-card stagger-item"
              style={{ '--stat-accent': m.color, '--stat-glow': m.color, textAlign: 'center', padding: '28px 18px' }}
              aria-label={`${m.label}: ${m.value} (demo metric)`}
            >
              <div style={{
                fontSize: 36, fontWeight: 900, letterSpacing: '-0.02em',
                background: `linear-gradient(135deg, ${m.color}, #F8FAFC)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: 6,
              }}>
                {m.value}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action Banner */}
      <div className="reveal-section" style={{ maxWidth: 760, margin: '0 auto 100px', padding: '0 24px', textAlign: 'center' }}>
        <div className="card cta-banner" style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.14) 0%, rgba(6, 182, 212, 0.14) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          padding: '56px 32px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.15)',
        }}>
          {/* Decorative orbs */}
          <div style={{
            position: 'absolute', top: -50, right: -50, width: 180, height: 180,
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, transparent 70%)',
            pointerEvents: 'none', animation: 'floatSlow 6s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', bottom: -30, left: -30, width: 140, height: 140,
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none', animation: 'floatSlow 5s ease-in-out infinite reverse',
          }} />

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(6, 182, 212, 0.3))',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 0 30px rgba(99, 102, 241, 0.3)',
            }}>
              <Zap size={26} color="#22D3EE" />
            </div>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: '#F8FAFC', marginBottom: 12, letterSpacing: '-0.02em' }}>
              Ready to Elevate Your Interview Game?
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 32, maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.6 }}>
              Join thousands of software engineers, architects, and candidates who sharpened their responses and landed top tech offers.
            </p>
            <button
              className="btn btn-cta"
              onClick={() => navigate(startPath)}
            >
              Get Started Free <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
