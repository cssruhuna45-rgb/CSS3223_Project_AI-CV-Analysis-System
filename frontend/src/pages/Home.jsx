import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Play, Upload, BarChart2, TrendingUp, TrendingDown,
  Minus, Flag, Clock, Trophy, AlertTriangle, ChevronRight,
} from 'lucide-react';
import { resumeAPI, interviewAPI } from '../services/api';

// Same palette as InterviewProgress, so the two pages read as one app.
const ACCENT = '#D8C4B6';
const TEXT = '#F5EFE7';
const TRACK = '#3E5879';
const CARD = '#000000';

const GREEN = '#4ADE80';
const BLUE = '#60A5FA';
const AMBER = '#FBBF24';
const ROSE = '#F472B6';

const TREND = {
  IMPROVING: { color: GREEN, icon: <TrendingUp size={14} />, label: 'Improving' },
  DECREASING: { color: ROSE, icon: <TrendingDown size={14} />, label: 'Slipping' },
  STABLE: { color: AMBER, icon: <Minus size={14} />, label: 'Holding steady' },
  FIRST_INTERVIEW: { color: BLUE, icon: <Flag size={14} />, label: 'Baseline' },
  NO_DATA: { color: BLUE, icon: <Flag size={14} />, label: 'Not started' },
};

// A score means nothing without knowing whether it is good.
function scoreColor(score) {
  if (typeof score !== 'number') return TEXT;
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

function Stat({ label, value, hint, color }) {
  return (
    <div className="card" style={{ padding: 18, background: CARD }}>
      <p style={{ fontSize: 12, color: TEXT, opacity: 0.75, marginBottom: 8 }}>{label}</p>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || ACCENT, lineHeight: 1 }}>
        {value}
      </div>
      {hint && (
        <p style={{ fontSize: 11.5, color: TEXT, opacity: 0.6, marginTop: 8 }}>{hint}</p>
      )}
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 12, gap: 16,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h2>
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

    // Both are independent; one failing should not blank the page.
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

  // Newest first; the backend does not guarantee an order.
  const latestResume = resumes.length
    ? [...resumes].sort(
        (a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)
      )[0]
    : null;

  const interviews = progress?.interviews || [];
  const trend = TREND[progress?.trend] || TREND.NO_DATA;

  // Carry the saved CV into the upload page so it can offer to reuse it
  // rather than making the candidate find the file again.
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
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <Clock size={32} color={ACCENT} />
        <p style={{ color: TEXT, marginTop: 14 }}>Loading your workspace…</p>
      </div>
    );
  }

  const firstName = (user?.name || '').trim().split(' ')[0] || 'there';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>
          Welcome back, {firstName}
        </h1>
        <p style={{ color: TEXT, fontSize: 14, opacity: 0.8 }}>
          {interviews.length === 0
            ? 'Upload your CV and sit your first practice interview.'
            : `You have completed ${progress.totalInterviews} interview${progress.totalInterviews === 1 ? '' : 's'}. Pick up where you left off.`}
        </p>
      </div>

      {error && (
        <div className="card" style={{ background: CARD, padding: 16, marginBottom: 24, display: 'flex', gap: 10 }}>
          <AlertTriangle size={16} color={AMBER} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 14, color: TEXT }}>{error}</span>
        </div>
      )}

      {/* Stats — only once there is something to show */}
      {progress && progress.totalInterviews > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 30 }}>
          <Stat label="Interviews" value={progress.totalInterviews} />
          <Stat
            label="Latest score"
            value={progress.latestScore ?? '—'}
            color={scoreColor(progress.latestScore)}
          />
          <Stat
            label="Best score"
            value={progress.bestScore ?? '—'}
            color={scoreColor(progress.bestScore)}
          />
          <Stat
            label="Trend"
            value={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 18 }}>
                {trend.icon}
                {progress.scoreDifference != null && progress.scoreDifference !== 0
                  ? `${progress.scoreDifference > 0 ? '+' : ''}${progress.scoreDifference}`
                  : trend.label}
              </span>
            }
            color={trend.color}
          />
        </div>
      )}

      {/* Your CV — the thing that used to be forgotten every session */}
      <Section
        title="Your CV"
        action={
          latestResume && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12.5, padding: '6px 10px' }}
              onClick={() => navigate('/upload')}
            >
              <Upload size={13} /> Upload a different CV
            </button>
          )
        }
      >
        {latestResume ? (
          <div className="card" style={{ background: CARD, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10, background: `${ACCENT}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: ACCENT, flexShrink: 0,
              }}>
                <FileText size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ fontSize: 15, fontWeight: 600 }}>{latestResume.originalFileName}</p>
                <p style={{ fontSize: 12.5, color: TEXT, opacity: 0.7, marginTop: 2 }}>
                  Uploaded {formatDate(latestResume.uploadedAt)}
                  {resumes.length > 1 && ` · ${resumes.length} CVs saved`}
                </p>
              </div>
              <button
                className="btn btn-primary"
                style={{ fontSize: 13, padding: '10px 18px' }}
                onClick={startFromSaved}
              >
                <Play size={14} /> Start an interview
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ background: CARD, padding: 28, textAlign: 'center' }}>
            <Upload size={26} color={ACCENT} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No CV yet</p>
            <p style={{ fontSize: 13.5, color: TEXT, opacity: 0.8, marginBottom: 18, lineHeight: 1.6 }}>
              Upload one and we will review it, find your skill gaps, and build an interview around them.
            </p>
            <button
              className="btn btn-primary"
              style={{ fontSize: 13, padding: '10px 20px' }}
              onClick={() => navigate('/upload')}
            >
              <Upload size={14} /> Upload your CV
            </button>
          </div>
        )}
      </Section>

      {/* Past interviews */}
      {interviews.length > 0 && (
        <Section
          title="Past interviews"
          action={
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12.5, padding: '6px 10px' }}
              onClick={() => navigate('/progress')}
            >
              <BarChart2 size={13} /> See progress
            </button>
          }
        >
          <div className="card" style={{ background: CARD, padding: 0, overflow: 'hidden' }}>
            {interviews.slice(0, 5).map((it, i) => (
              <div
                key={it.sessionId || i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                  borderTop: i === 0 ? 'none' : `1px solid ${TRACK}`,
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: `${scoreColor(it.score)}1F`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: scoreColor(it.score), fontWeight: 700, fontSize: 13, flexShrink: 0,
                }}>
                  {typeof it.score === 'number' ? it.score : '—'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 500 }}>
                    {formatDate(it.completedAt || it.startedAt)}
                    {it.status !== 'completed' && (
                      <span style={{ color: AMBER, fontSize: 12, marginLeft: 8 }}>
                        · unfinished
                      </span>
                    )}
                  </p>
                  {it.feedbackSummary && (
                    <p style={{
                      fontSize: 12.5, color: TEXT, opacity: 0.7, marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {it.feedbackSummary}
                    </p>
                  )}
                </div>

                {typeof it.scoreChange === 'number' && it.scoreChange !== 0 && (
                  <span style={{
                    fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                    color: it.scoreChange > 0 ? GREEN : ROSE,
                  }}>
                    {it.scoreChange > 0 ? '+' : ''}{it.scoreChange}
                  </span>
                )}
              </div>
            ))}

            {interviews.length > 5 && (
              <button
                onClick={() => navigate('/progress')}
                style={{
                  width: '100%', padding: '12px 20px', border: 'none', cursor: 'pointer',
                  borderTop: `1px solid ${TRACK}`, background: 'transparent',
                  color: ACCENT, fontFamily: 'Inter, sans-serif', fontSize: 12.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                See all {interviews.length} interviews <ChevronRight size={13} />
              </button>
            )}
          </div>
        </Section>
      )}

      {/* First-run nudge, once a CV exists but no interview has been sat */}
      {latestResume && interviews.length === 0 && (
        <div className="card" style={{ background: CARD, padding: 20, display: 'flex', gap: 12 }}>
          <Trophy size={18} color={ACCENT} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              You have not sat an interview yet
            </p>
            <p style={{ fontSize: 13, color: TEXT, opacity: 0.8, lineHeight: 1.6 }}>
              Questions are built from your CV and the skills your target role needs.
              Your score and a question-by-question breakdown come at the end.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
