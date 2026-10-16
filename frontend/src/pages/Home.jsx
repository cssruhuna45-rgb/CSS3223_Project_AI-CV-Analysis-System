import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Play, Upload, BarChart2, TrendingUp, TrendingDown,
  Minus, Flag, Clock, Trophy, AlertTriangle, ChevronRight, Sparkles, Award
} from 'lucide-react';
import { resumeAPI, interviewAPI } from '../services/api';

const ACCENT = 'var(--accent)';
const ACCENT_LIGHT = 'var(--accent)';
const CYAN = 'var(--accent)';
const TEXT = 'var(--text-primary)';
const MUTED = 'var(--text-muted)';
const SUB = 'var(--text-sub)';
const TRACK = 'color-mix(in srgb, var(--fg) 8%, transparent)';
const CARD = 'color-mix(in srgb, var(--bg-surface) 72%, transparent)';

const GREEN = 'var(--success)';
const BLUE = 'var(--accent)';
const AMBER = 'var(--warning)';
const ROSE = 'var(--danger)';

const TREND = {
  IMPROVING: { color: GREEN, icon: <TrendingUp size={14} />, label: 'Improving' },
  DECREASING: { color: ROSE, icon: <TrendingDown size={14} />, label: 'Slipping' },
  STABLE: { color: AMBER, icon: <Minus size={14} />, label: 'Holding steady' },
  FIRST_INTERVIEW: { color: BLUE, icon: <Flag size={14} />, label: 'Baseline' },
  NO_DATA: { color: BLUE, icon: <Flag size={14} />, label: 'Not started' },
};

function scoreColor(score) {
  if (typeof score !== 'number') return MUTED;
  if (score >= 70) return GREEN;
  if (score >= 45) return AMBER;
  return ROSE;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function Stat({ label, value, hint, color, delay = 0 }) {
  return (
    <div
      className="stat-card stagger-item"
      style={{
        '--stat-accent': color || ACCENT,
        '--stat-glow': color || ACCENT,
        animationDelay: `${delay}s`,
      }}
    >
      <p style={{ fontSize: 'var(--fs-xs)', color: MUTED, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 }}>
        {label}
      </p>
      <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: color || 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </div>
      {hint && (
        <p style={{ fontSize: 'var(--fs-xs)', color: SUB, marginTop: 8 }}>{hint}</p>
      )}
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14, gap: 16,
      }}>
        <h2 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: TEXT, letterSpacing: '-0.01em' }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function Home({ user }) {
  const navigate = useNavigate();

  const [resumes, setResumes] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([resumeAPI.getAll(), interviewAPI.progress()])
      .then(([resumeResult, progressResult]) => {
        if (cancelled) return;

        if (resumeResult.status === 'fulfilled') {
          setResumes(resumeResult.value || []);
        } else {
          console.error('[Home] Could not load resumes:', resumeResult.reason);
          setError(resumeResult.reason?.message || 'Could not load your CVs.');
        }

        if (progressResult.status === 'fulfilled') {
          setProgress(progressResult.value);
        } else {
          console.error('[Home] Could not load progress:', progressResult.reason);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const latestResume = resumes.length
    ? [...resumes].sort(
        (a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)
      )[0]
    : null;

  const interviews = progress?.interviews || [];
  const trend = TREND[progress?.trend] || TREND.NO_DATA;

  const startFromSaved = () => {
    if (!latestResume) return;
    sessionStorage.setItem('resumeId', String(latestResume.id));
    if (latestResume.extractedText) {
      sessionStorage.setItem('resumeText', latestResume.extractedText);
    }
    navigate('/upload');
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 940, margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
          animation: 'breathe 2s ease-in-out infinite',
        }}>
          <Clock size={28} color={ACCENT_LIGHT} className="animate-spin" />
        </div>
        <p style={{ color: TEXT, fontSize: 'var(--fs-base)', fontWeight: 600 }}>Loading your workspace…</p>
        <p style={{ color: MUTED, fontSize: 'var(--fs-sm)', marginTop: 4 }}>Syncing your interviews, CV profile, and performance metrics.</p>
      </div>
    );
  }

  const firstName = (user?.name || '').trim().split(' ')[0] || 'there';

  return (
    <div style={{ maxWidth: 940, margin: '0 auto', padding: '40px 24px 80px' }} className="animate-fade-in-up">

      {/* Greeting Header */}
      <div style={{ marginBottom: 32, position: 'relative' }}>
        <div style={{
          position: 'absolute', top: -30, right: 0, width: 300, height: 200,
          background: 'transparent',
          pointerEvents: 'none',
        }} />
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '4px 10px',
          borderRadius: 20, background: 'color-mix(in srgb, var(--accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
          animation: 'pillGlow 3s ease-in-out infinite',
        }}>
          <Sparkles size={13} color={CYAN} />
          <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--accent)' }}>Candidate Cockpit</span>
        </div>
        <h1 style={{
          fontSize: 'var(--fs-2xl)', fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em',
          background: 'linear-gradient(var(--text-primary), var(--text-primary))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Welcome back, {firstName}
        </h1>
        <p style={{ color: MUTED, fontSize: 'var(--fs-sm)' }}>
          {interviews.length === 0
            ? 'Upload your CV to identify skill gaps and sit your first practice interview.'
            : `You have completed ${progress.totalInterviews} interview${progress.totalInterviews === 1 ? '' : 's'}. Review your progress or prepare for your next challenge.`}
        </p>
      </div>

      {error && (
        <div className="card" style={{
          background: 'color-mix(in srgb, var(--danger) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--danger) 25%, transparent)',
          padding: 16, marginBottom: 28, display: 'flex', gap: 12, alignItems: 'center',
          animation: 'fadeIn 0.4s ease',
        }}>
          <AlertTriangle size={18} color={ROSE} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--danger)' }}>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      {progress && progress.totalInterviews > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 36 }}>
          <Stat label="Total Interviews" value={progress.totalInterviews} color="var(--text-primary)" delay={0.05} />
          <Stat
            label="Latest Score"
            value={progress.latestScore != null ? `${progress.latestScore}/100` : '—'}
            color={scoreColor(progress.latestScore)}
            delay={0.1}
          />
          <Stat
            label="Best Score"
            value={progress.bestScore != null ? `${progress.bestScore}/100` : '—'}
            color={scoreColor(progress.bestScore)}
            delay={0.15}
          />
          <Stat
            label="Trend"
            value={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-lg)' }}>
                {trend.icon}
                {progress.scoreDifference != null && progress.scoreDifference !== 0
                  ? `${progress.scoreDifference > 0 ? '+' : ''}${progress.scoreDifference}`
                  : trend.label}
              </span>
            }
            color={trend.color}
            delay={0.2}
          />
        </div>
      )}

      {/* Your CV Section */}
      <Section
        title="Your Resume / CV"
        action={
          latestResume && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 'var(--fs-sm)', padding: '6px 12px', gap: 6 }}
              onClick={() => navigate('/upload')}
            >
              <Upload size={14} /> Upload another CV
            </button>
          )
        }
      >
        {latestResume ? (
          <div className="card card-glow" style={{ background: CARD, padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'linear-gradient(color-mix(in srgb, var(--accent) 20%, transparent), color-mix(in srgb, var(--accent) 20%, transparent))',
                border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: ACCENT_LIGHT, flexShrink: 0,
                transition: 'transform 0.3s var(--ease-spring)',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(-5deg) scale(1.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'rotate(0) scale(1)'; }}
              >
                <FileText size={24} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: TEXT }}>{latestResume.originalFileName}</p>
                <p style={{ fontSize: 'var(--fs-sm)', color: MUTED, marginTop: 3 }}>
                  Uploaded {formatDate(latestResume.uploadedAt)}
                  {resumes.length > 1 && ` · ${resumes.length} CVs on file`}
                </p>
              </div>
              <button
                className="btn btn-cta"
                style={{ fontSize: 'var(--fs-sm)', padding: '12px 24px' }}
                onClick={startFromSaved}
              >
                <Play size={15} /> Start an interview
              </button>
            </div>
          </div>
        ) : (
          <div className="card card-glow" style={{ background: CARD, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }} className="animate-float">
              <Upload size={24} color={CYAN} />
            </div>
            <p style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: TEXT, marginBottom: 6 }}>No CV uploaded yet</p>
            <p style={{ fontSize: 'var(--fs-sm)', color: MUTED, marginBottom: 22, maxWidth: 460, margin: '0 auto 22px', lineHeight: 1.6 }}>
              Upload your resume and our AI will extract your skills, highlight experience gaps, and generate questions tailored to your target job role.
            </p>
            <button
              className="btn btn-cta"
              style={{ fontSize: 'var(--fs-sm)', padding: '13px 26px' }}
              onClick={() => navigate('/upload')}
            >
              <Upload size={15} /> Upload your CV
            </button>
          </div>
        )}
      </Section>

      {/* Past Interviews Section */}
      {interviews.length > 0 && (
        <Section
          title="Past Practice Interviews"
          action={
            <button
              className="btn btn-ghost"
              style={{ fontSize: 'var(--fs-sm)', padding: '6px 12px', gap: 6 }}
              onClick={() => navigate('/progress')}
            >
              <BarChart2 size={14} /> Full Analytics
            </button>
          }
        >
          <div className="card" style={{ background: CARD, padding: 0, overflow: 'hidden' }}>
            {interviews.slice(0, 5).map((it, i) => (
              <div
                key={it.sessionId || i}
                role="button"
                tabIndex={0}
                onClick={() => it.sessionId && navigate(`/scorecard?session=${encodeURIComponent(it.sessionId)}`)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && it.sessionId) {
                    e.preventDefault();
                    navigate(`/scorecard?session=${encodeURIComponent(it.sessionId)}`);
                  }
                }}
                className="table-row-interactive"
                style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '16px 22px',
                  borderTop: i === 0 ? 'none' : `1px solid ${TRACK}`,
                  cursor: it.sessionId ? 'pointer' : 'default',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: `${scoreColor(it.score)}1A`,
                  border: `1.5px solid ${scoreColor(it.score)}4D`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: scoreColor(it.score), fontWeight: 800, fontSize: 'var(--fs-base)', flexShrink: 0,
                  boxShadow: `0 0 12px ${scoreColor(it.score)}22`,
                  transition: 'transform 0.25s var(--ease-spring), box-shadow 0.25s ease',
                }}>
                  {typeof it.score === 'number' ? it.score : '—'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: TEXT }}>
                    {formatDate(it.completedAt || it.startedAt)}
                    {it.status !== 'completed' && (
                      <span style={{
                        color: AMBER, fontSize: 'var(--fs-xs)', marginLeft: 10,
                        padding: '2px 8px', borderRadius: 8, background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
                      }}>
                        Incomplete
                      </span>
                    )}
                  </p>
                  {it.feedbackSummary && (
                    <p style={{
                      fontSize: 'var(--fs-sm)', color: MUTED, marginTop: 3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {it.feedbackSummary}
                    </p>
                  )}
                </div>

                {typeof it.scoreChange === 'number' && it.scoreChange !== 0 && (
                  <span style={{
                    fontSize: 'var(--fs-sm)', fontWeight: 700, whiteSpace: 'nowrap',
                    color: it.scoreChange > 0 ? GREEN : ROSE,
                  }}>
                    {it.scoreChange > 0 ? '+' : ''}{it.scoreChange}
                  </span>
                )}

                {it.sessionId && (
                  <span style={{
                    fontSize: 'var(--fs-xs)',
                    color: CYAN,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    whiteSpace: 'nowrap',
                    fontWeight: 600,
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
                    transition: 'all 0.2s ease',
                  }}>
                    View Scorecard <ChevronRight size={14} />
                  </span>
                )}
              </div>
            ))}

            {interviews.length > 5 && (
              <button
                onClick={() => navigate('/progress')}
                style={{
                  width: '100%', padding: '14px 20px', border: 'none', cursor: 'pointer',
                  borderTop: `1px solid ${TRACK}`, background: 'transparent',
                  color: ACCENT_LIGHT, fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-sm)',
                  fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 6%, transparent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                See all {interviews.length} interviews <ChevronRight size={14} />
              </button>
            )}
          </div>
        </Section>
      )}

      {/* First-Run Nudge Card */}
      {latestResume && interviews.length === 0 && (
        <div className="card card-glow" style={{
          background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
          padding: '24px 28px', display: 'flex', gap: 16, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'color-mix(in srgb, var(--accent) 20%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: ACCENT_LIGHT, flexShrink: 0,
          }} className="animate-float">
            <Trophy size={22} />
          </div>
          <div>
            <p style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: TEXT, marginBottom: 4 }}>
              You have not sat your first interview yet
            </p>
            <p style={{ fontSize: 'var(--fs-sm)', color: MUTED, lineHeight: 1.6 }}>
              Questions will be dynamically synthesized from your CV and tailored to your target job track.
              Once finished, you will receive an in-depth scorecard with audio transcripts, feedback, and a 14-day study plan.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
