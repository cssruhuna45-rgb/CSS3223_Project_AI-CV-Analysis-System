import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users, TrendingUp, Clock, CheckCircle, Search, Eye,
  Brain, Code, MessageSquare, Layers, BarChart2, AlertTriangle, Sparkles, Briefcase,
} from 'lucide-react';
import { recruiterAPI } from '../services/api';
import { Button } from '../components/ui';

const ACCENT = 'var(--accent)';
const ACCENT_CYAN = 'var(--accent)';
const TEXT = 'var(--text-secondary)';
const TEXT_PRIMARY = 'var(--text-primary)';
const TRACK = 'color-mix(in srgb, var(--fg) 8%, transparent)';

// The AI service names the categories; the icons live here.
const CATEGORY_ICONS = {
  technical_knowledge: <Code size={13} />,
  depth: <Layers size={13} />,
  problem_solving: <Brain size={13} />,
  communication: <MessageSquare size={13} />,
};

// The backend stores active / completed / cancelled.
const STATUS_STYLE = {
  completed: { label: 'Completed', cls: 'badge-green' },
  active: { label: 'In Progress', cls: 'badge-yellow' },
  cancelled: { label: 'Cancelled', cls: 'badge badge-blue' },
};

// An interview takes about fifteen minutes. One still "active" hours
// later was abandoned, not in progress, and calling it "In Progress"
// buried the finished interviews among dozens that never will be.
const ABANDONED_AFTER_MS = 2 * 60 * 60 * 1000;

function statusOf(status, startedAt) {
  if (status === 'active' && startedAt
      && Date.now() - new Date(startedAt).getTime() > ABANDONED_AFTER_MS) {
    return { label: 'Not finished', cls: 'badge-neutral' };
  }
  return STATUS_STYLE[status] || { label: status || 'Unknown', cls: 'badge badge-blue' };
}

// The backend sends the job description the interview was started
// with, which is the prompt sentence "I am interviewing for a Backend
// Development position. Please evaluate...". The recruiter only needs
// the role, so take it out of that sentence; anything else is shown
// as it came.
function roleLabel(role) {
  const match = /interviewing for an? (.+?) position/i.exec(role || '');
  return match ? match[1] : (role || '—');
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function ScoreBar({ value }) {
  const shown = typeof value === 'number' ? value : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: TRACK, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${shown ?? 0}%`,
          background: 'linear-gradient(var(--accent-solid), var(--accent-solid))',
          borderRadius: 3,
          boxShadow: 'none',
          transition: 'width 0.8s var(--ease-out-expo)',
        }} />
      </div>
      <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: TEXT_PRIMARY, width: 28, textAlign: 'right' }}>
        {shown ?? '—'}
      </span>
    </div>
  );
}

function Message({ icon, title, body }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }} className="animate-fade-in-up">
      <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
        border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 18px',
      }} className="animate-breathe">
        {icon}
      </div>
      <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, margin: '0 0 10px', color: TEXT_PRIMARY }}>{title}</h2>
      <p style={{ color: TEXT, fontSize: 'var(--fs-base)', lineHeight: 1.6 }}>{body}</p>
    </div>
  );
}

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // One job at a time when chosen on the Jobs page; all of them otherwise.
  const jobId = searchParams.get('job') || '';

  const [data, setData] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    recruiterAPI.jobs()
      .then(setJobs)
      .catch(err => console.error('[Recruiter] Could not load jobs:', err));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelected(null);

    recruiterAPI.overview(jobId || null)
      .then(result => { if (!cancelled) setData(result); })
      .catch(err => {
        console.error('[Recruiter] Could not load the dashboard:', err);
        if (!cancelled) setError(err.message || 'Could not load the dashboard.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [jobId]);

  const candidates = useMemo(() => data?.candidates || [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter(c => {
      const matchesSearch =
        !q ||
        (c.candidateName || '').toLowerCase().includes(q) ||
        (c.role || '').toLowerCase().includes(q);
      const matchesFilter = filter === 'all' || c.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [candidates, search, filter]);

  const candidate = selected ? candidates.find(c => c.id === selected) : null;

  if (loading) {
    return <Message
      icon={<Clock size={32} color={ACCENT} className="animate-spin" />}
      title="Loading interviews"
      body="Reading the candidates' results."
    />;
  }

  if (error) {
    return <Message
      icon={<AlertTriangle size={32} color={ACCENT} />}
      title="Could not load the dashboard"
      body={error}
    />;
  }

  const statData = [
    { label: 'Candidates', value: data.totalCandidates, icon: <Users size={20} />, color: 'var(--accent)' },
    { label: 'Completed', value: data.completedInterviews, icon: <CheckCircle size={20} />, color: 'var(--success)' },
    {
      label: 'Avg Score',
      value: data.averageScore == null ? '—' : `${data.averageScore}/100`,
      icon: <TrendingUp size={20} />,
      color: 'var(--accent)',
    },
    { label: 'Not completed', value: data.inProgressInterviews, icon: <Clock size={20} />, color: 'var(--warning)' },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }} className="animate-fade-in-up">

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '4px 10px',
          borderRadius: 20, background: 'color-mix(in srgb, var(--accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
          animation: 'pillGlow 3s ease-in-out infinite',
        }}>
          <Sparkles size={13} color={ACCENT_CYAN} />
          <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--accent)' }}>Recruiter Intelligence</span>
        </div>
        <h1 style={{
          fontSize: 'var(--fs-2xl)', fontWeight: 700, marginBottom: 6,
          background: 'linear-gradient(var(--text-primary), var(--text-primary))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>Recruiter Dashboard</h1>
        <p style={{ color: TEXT, fontSize: 'var(--fs-sm)' }}>
          {data.totalInterviews === 0
            ? 'No interviews have been taken yet.'
            : `${data.totalInterviews} interview${data.totalInterviews === 1 ? '' : 's'} across ${data.totalCandidates} candidate${data.totalCandidates === 1 ? '' : 's'}`}
        </p>

        {jobs.length > 0 && (
          <div style={{ marginTop: 'var(--space-4)', maxWidth: 360 }}>
            <label className="label" htmlFor="job-filter">Job</label>
            <select
              id="job-filter"
              className="input"
              value={jobId}
              onChange={(e) => setSearchParams(e.target.value ? { job: e.target.value } : {})}
            >
              <option value="">All my jobs</option>
              {jobs.map((j) => (
                <option key={j.id} value={String(j.id)}>{j.title}{j.open ? '' : ' (closed)'}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {statData.map((s, i) => (
          <div key={s.label} className="stat-card stagger-item" style={{
            '--stat-accent': s.color,
            '--stat-glow': s.color,
            padding: 22,
            animationDelay: `${i * 0.08}s`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 'var(--fs-sm)', color: TEXT, fontWeight: 500 }}>{s.label}</span>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: `linear-gradient(color-mix(in srgb, ${s.color} 20%, transparent), color-mix(in srgb, ${s.color} 20%, transparent))`,
                border: `1px solid color-mix(in srgb, ${s.color} 27%, transparent)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color,
                transition: 'transform 0.3s var(--ease-spring)',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(-5deg) scale(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'rotate(0) scale(1)'; }}
              >
                {s.icon}
              </div>
            </div>
            <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: TEXT_PRIMARY, letterSpacing: '-0.5px' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {candidates.length === 0 ? (
        <div className="card card-glow" style={{
          padding: 48,
          textAlign: 'center',
          background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)',
          border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
          borderRadius: 18,
        }}>
          <Users size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 14px' }} className="animate-float" />
          <p style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 6 }}>No interviews yet</p>
          <p style={{ fontSize: 'var(--fs-sm)', color: TEXT, lineHeight: 1.6, marginBottom: jobs.length === 0 ? 'var(--space-4)' : 0 }}>
            {jobs.length === 0
              ? 'Create a job and share its invite link. Interviews candidates take through it appear here; nothing else candidates do on the platform is shown to you.'
              : 'Interviews candidates take through your jobs’ invite links appear here.'}
          </p>
          {jobs.length === 0 && (
            <Button icon={<Briefcase size={16} />} onClick={() => navigate('/jobs')}>Create a job</Button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: candidate ? '1fr 380px' : '1fr', gap: 20 }}>

          {/* Candidate table */}
          <div className="card" style={{
            padding: 0,
            overflow: 'hidden',
            background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)',
            border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
            borderRadius: 18,
          }}>

            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${TRACK}`, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  placeholder="Search candidates..."
                  style={{ paddingLeft: 36, height: 40, fontSize: 'var(--fs-sm)' }}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, background: 'color-mix(in srgb, var(--fg) 4%, transparent)', padding: 3, borderRadius: 10 }}>
                {[
                  ['all', 'All'],
                  ['completed', 'Completed'],
                  ['active', 'Not completed'],
                ].map(([value, label]) => (
                  <button key={value} onClick={() => setFilter(value)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-xs)', fontWeight: 600,
                      transition: 'all 0.25s var(--ease-smooth)',
                      background: filter === value ? `linear-gradient(color-mix(in srgb, ${ACCENT} 30%, transparent), color-mix(in srgb, ${ACCENT} 30%, transparent))` : 'transparent',
                      color: filter === value ? 'var(--accent)' : TEXT,
                      boxShadow: filter === value ? `0 2px 12px color-mix(in srgb, ${ACCENT} 20%, transparent)` : 'none',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${TRACK}` }}>
                    {['Candidate', 'Role', 'Score', 'Status', 'Date', ''].map(h => (
                      <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 'var(--fs-xs)', color: TEXT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const isSelected = selected === c.id;
                    const badge = statusOf(c.status, c.startedAt);
                    return (
                      <tr key={c.id}
                        onClick={() => setSelected(isSelected ? null : c.id)}
                        className="table-row-interactive"
                        style={{
                          borderBottom: `1px solid ${TRACK}`,
                          background: isSelected ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                        }}>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%',
                              background: 'linear-gradient(var(--accent-solid), var(--accent-solid))',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 'var(--fs-sm)', fontWeight: 700, flexShrink: 0, color: 'var(--on-accent)',
                              boxShadow: '0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent)',
                            }}>
                              {(c.candidateName || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: TEXT_PRIMARY }}>{c.candidateName}</div>
                              {c.candidateEmail && (
                                <div style={{ fontSize: 'var(--fs-xs)', color: TEXT }}>{c.candidateEmail}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 'var(--fs-sm)', color: TEXT }}>{roleLabel(c.role)}</td>
                        <td style={{ padding: '14px 20px' }}>
                          {typeof c.score === 'number' ? (
                            <span style={{
                              fontSize: 'var(--fs-base)', fontWeight: 800,
                              color: c.score >= 75 ? 'var(--success)' : c.score >= 50 ? 'var(--accent)' : 'var(--warning)'
                            }}>
                              {c.score}
                            </span>
                          ) : (
                            <span style={{ color: TEXT, fontSize: 'var(--fs-sm)' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span className={`badge ${badge.cls}`}>{badge.label}</span>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 'var(--fs-sm)', color: TEXT }}>
                          {formatDate(c.completedAt || c.startedAt)}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 'var(--fs-xs)' }}>
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <p style={{ padding: '32px 20px', textAlign: 'center', fontSize: 'var(--fs-sm)', color: TEXT }}>
                  No candidates match that search.
                </p>
              )}
            </div>
          </div>

          {/* Detail panel */}
          {candidate && (
            <div className="card card-glow animate-fade-in-up" style={{
              padding: 26,
              alignSelf: 'start',
              background: 'color-mix(in srgb, var(--bg-surface) 85%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
              borderRadius: 18,
              boxShadow: 'none',
              animationDuration: '0.35s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{
                  width: 50, height: 50, borderRadius: '50%',
                  background: 'linear-gradient(var(--accent-solid), var(--accent-solid))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--on-accent)',
                  boxShadow: '0 4px 14px color-mix(in srgb, var(--accent) 40%, transparent)',
                }}>
                  {(candidate.candidateName || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 'var(--fs-base)', color: TEXT_PRIMARY, margin: 0 }}>{candidate.candidateName}</p>
                  <p style={{ fontSize: 'var(--fs-sm)', color: TEXT, margin: '3px 0 0' }}>{roleLabel(candidate.role)}</p>
                </div>
              </div>

              <div className="glow-line" style={{ margin: '0 0 20px' }} />

              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{
                  fontSize: 48, fontWeight: 900,
                  color: typeof candidate.score === 'number'
                    ? (candidate.score >= 75 ? 'var(--success)' : candidate.score >= 50 ? 'var(--accent)' : 'var(--warning)')
                    : TEXT,
                  lineHeight: 1,
                  animation: 'fadeInScale 0.5s var(--ease-out-expo)',
                }}>
                  {typeof candidate.score === 'number' ? candidate.score : '—'}
                </div>
                <p style={{ fontSize: 'var(--fs-xs)', color: TEXT, marginTop: 6, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  {typeof candidate.score === 'number' ? 'Overall Score' : 'Not scored yet'}
                </p>
              </div>

              <p style={{ fontSize: 'var(--fs-xs)', color: TEXT, marginBottom: 18, textAlign: 'center' }}>
                {candidate.answeredCount} of {candidate.questionCount} question
                {candidate.questionCount === 1 ? '' : 's'} answered
              </p>

              {candidate.categoryScores && candidate.categoryScores.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {candidate.categoryScores.map(cat => (
                    <div key={cat.key}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ color: ACCENT_CYAN }}>
                          {CATEGORY_ICONS[cat.key] || <Brain size={13} />}
                        </span>
                        <span style={{ fontSize: 'var(--fs-xs)', color: TEXT, fontWeight: 500 }}>{cat.label}</span>
                      </div>
                      <ScoreBar value={cat.score} />
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 'var(--fs-sm)', color: TEXT, textAlign: 'center', lineHeight: 1.6 }}>
                  No category breakdown for this interview.
                </p>
              )}

              <div className="glow-line" style={{ margin: '22px 0' }} />
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 'var(--fs-sm)', padding: '11px', fontWeight: 700 }}>
                <BarChart2 size={15} /> Full Report
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
