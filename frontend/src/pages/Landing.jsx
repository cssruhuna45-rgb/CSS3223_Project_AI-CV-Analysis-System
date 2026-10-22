import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Mic, BarChart2, Shield, Zap, ChevronRight, FileText, Users, Sparkles, Award, Compass } from 'lucide-react';
import { PREDEFINED_JOB_FIELDS as JOB_FIELDS } from '../constants/jobFields';
import { homePathFor } from '../constants/accounts';

const FEATURES = [
  {
    icon: <Brain size={24} />,
    color: 'var(--accent)',
    bg: 'color-mix(in srgb, var(--accent) 15%, transparent)',
    glow: 'color-mix(in srgb, var(--accent) 30%, transparent)',
    title: 'AI-Powered Questions',
    desc: 'LangChain RAG retrieves deep technical context from industry standards and your specific CV to form tailored questions.',
  },
  {
    icon: <Mic size={24} />,
    color: 'var(--accent)',
    bg: 'color-mix(in srgb, var(--accent) 15%, transparent)',
    glow: 'color-mix(in srgb, var(--accent) 30%, transparent)',
    title: 'Real-Time Voice Studio',
    desc: 'Speak answers naturally with live speech-to-text recognition, timed turn pressure, and text-to-speech audio questions.',
  },
  {
    icon: <BarChart2 size={24} />,
    color: 'var(--success)',
    bg: 'color-mix(in srgb, var(--success) 15%, transparent)',
    glow: 'color-mix(in srgb, var(--success) 30%, transparent)',
    title: '4-Axis Competency Scoring',
    desc: 'Get evaluated objectively across Technical Knowledge, Implementation Depth, Problem Solving, and Communication Clarity.',
  },
  {
    icon: <FileText size={24} />,
    color: 'var(--warning)',
    bg: 'color-mix(in srgb, var(--warning) 15%, transparent)',
    glow: 'color-mix(in srgb, var(--warning) 30%, transparent)',
    title: 'Intelligent CV Parsing',
    desc: 'Instantly extract skills, seniority level, and discover hidden skill gaps tailored to your dream career track.',
  },
  {
    icon: <Compass size={24} />,
    color: 'var(--accent)',
    bg: 'color-mix(in srgb, var(--danger) 15%, transparent)',
    glow: 'color-mix(in srgb, var(--danger) 30%, transparent)',
    title: '14-Day Action Roadmap',
    desc: 'Transform interview mistakes into a daily curriculum with curated study topics, practical code exercises, and milestones.',
  },
  {
    icon: <Users size={24} />,
    color: 'var(--accent)',
    bg: 'color-mix(in srgb, var(--accent) 15%, transparent)',
    glow: 'color-mix(in srgb, var(--accent) 30%, transparent)',
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
  const startPath = !user ? '/register' : user.role === 'candidate' ? '/upload' : homePathFor(user);
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
          background: 'transparent',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 840, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Pill Tag */}
          <div className="hero-pill" style={{ marginBottom: 28 }}>
            <Sparkles size={14} color="var(--accent)" />
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent)', fontWeight: 600 }}>
              Next-Gen AI Interview Intelligence · 2026 Edition
            </span>
          </div>

          {/* Heading */}
          <h1 className="hero-title" style={{ marginBottom: 24 }}>
            Master Your Next Interview with{' '}
            <span style={{
              background: 'linear-gradient(var(--accent-solid), var(--accent-solid))',
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
              style={{ padding: '14px 28px', fontSize: 'var(--fs-base)' }}
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
              { label: 'Explained Scores', icon: <BarChart2 size={14} /> },
              { label: 'Secure Login', icon: <Shield size={14} /> },
            ].map((s) => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 20,
                background: 'color-mix(in srgb, var(--fg) 4%, transparent)',
                border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
                color: 'var(--text-muted)', fontSize: 'var(--fs-xs)', fontWeight: 500,
              }}>
                <span style={{ color: 'var(--accent)' }}>{s.icon}</span>
                {s.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="reveal-section" style={{ maxWidth: 1120, margin: '0 auto', padding: '60px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)' }}>
            Engineered for Precision
          </span>
          <h2 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, letterSpacing: '-0.02em', marginTop: 8, color: 'var(--text-primary)' }}>
            Everything You Need to Get Hired
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-base)', marginTop: 6 }}>
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
                  border: `1px solid color-mix(in srgb, ${f.color} 25%, transparent)`,
                  color: f.color,
                  boxShadow: 'none',
                }}
              >
                {f.icon}
              </div>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', lineHeight: 1.65 }}>
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
          {/* Facts about the product itself, each one checkable in the
              code. The figures that stood here before (10k+ sessions,
              95% satisfaction, a 4.8 rating, under 2s responses) were
              never measured, and the last was false: a Gemini call
              takes 4 to 20 seconds. */}
          {[
            { value: String(JOB_FIELDS.length), label: 'Job fields covered', color: 'var(--accent)' },
            { value: '4', label: 'Scoring categories', color: 'var(--accent)' },
            { value: '5', label: 'Questions per interview', color: 'var(--success)' },
            { value: '14', label: 'Day study roadmap', color: 'var(--warning)' },
          ].map((m) => (
            <div
              key={m.label}
              className="stat-card stagger-item"
              style={{ '--stat-accent': m.color, '--stat-glow': m.color, textAlign: 'center', padding: '28px 18px' }}
              aria-label={`${m.label}: ${m.value} (demo metric)`}
            >
              <div style={{
                fontSize: 'var(--fs-2xl)', fontWeight: 900, letterSpacing: '-0.02em',
                background: `linear-gradient(var(--text-primary), var(--text-primary))`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: 6,
              }}>
                {m.value}
              </div>
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', fontWeight: 500 }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action Banner */}
      <div className="reveal-section" style={{ maxWidth: 760, margin: '0 auto 100px', padding: '0 24px', textAlign: 'center' }}>
        <div className="card cta-banner" style={{
          background: 'linear-gradient(color-mix(in srgb, var(--accent) 14%, transparent), color-mix(in srgb, var(--accent) 14%, transparent))',
          border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
          padding: '56px 32px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'none',
        }}>
          {/* Decorative orbs */}
          <div style={{
            position: 'absolute', top: -50, right: -50, width: 180, height: 180,
            background: 'transparent',
            pointerEvents: 'none', animation: 'floatSlow 6s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', bottom: -30, left: -30, width: 140, height: 140,
            background: 'transparent',
            pointerEvents: 'none', animation: 'floatSlow 5s ease-in-out infinite reverse',
          }} />

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(color-mix(in srgb, var(--accent) 30%, transparent), color-mix(in srgb, var(--accent) 30%, transparent))',
              border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: 'none',
            }}>
              <Zap size={26} color="var(--accent)" />
            </div>
            <h2 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-0.02em' }}>
              Ready to Elevate Your Interview Game?
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-base)', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.6 }}>
              Upload your CV, sit a five-question interview for your target role, and see exactly which answers held up and what to study next.
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
