import React, { useEffect, useMemo, useState } from 'react';
import {
  Users, TrendingUp, Clock, CheckCircle, Search, Eye,
  Brain, Code, MessageSquare, Layers, BarChart2, AlertTriangle,
} from 'lucide-react';
import { recruiterAPI } from '../services/api';

const ACCENT = '#D8C4B6';
const TEXT = '#F5EFE7';
const TRACK = '#3E5879';

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

function statusOf(status) {
  return STATUS_STYLE[status] || { label: status || 'Unknown', cls: 'badge badge-blue' };
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
      <div style={{ flex: 1, height: 5, background: TRACK, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${shown ?? 0}%`, background: ACCENT, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, color: TEXT, width: 28, textAlign: 'right' }}>
        {shown ?? '—'}
      </span>
    </div>
  );
}

function Message({ icon, title, body }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
      {icon}
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '16px 0 10px' }}>{title}</h2>
      <p style={{ color: TEXT, fontSize: 15, lineHeight: 1.6 }}>{body}</p>
    </div>
  );
}

export default function RecruiterDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;

    recruiterAPI.overview()
      .then(result => { if (!cancelled) setData(result); })
      .catch(err => {
        console.error('[Recruiter] Could not load the dashboard:', err);
        if (!cancelled) setError(err.message || 'Could not load the dashboard.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

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
      icon={<Clock size={36} color={ACCENT} />}
      title="Loading interviews"
      body="Reading the candidates' results."
    />;
  }

  if (error) {
    return <Message
      icon={<AlertTriangle size={36} color={ACCENT} />}
      title="Could not load the dashboard"
      body={error}
    />;
  }

  const stats = [
    { label: 'Candidates', value: data.totalCandidates, icon: <Users size={20} /> },
    { label: 'Completed', value: data.completedInterviews, icon: <CheckCircle size={20} /> },
    {
      label: 'Avg Score',
      value: data.averageScore == null ? '—' : `${data.averageScore}%`,
      icon: <TrendingUp size={20} />,
    },
    { label: 'In Progress', value: data.inProgressInterviews, icon: <Clock size={20} /> },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Recruiter Dashboard</h1>
        <p style={{ color: TEXT, fontSize: 14 }}>
          {data.totalInterviews === 0
            ? 'No interviews have been taken yet.'
            : `${data.totalInterviews} interview${data.totalInterviews === 1 ? '' : 's'} across ${data.totalCandidates} candidate${data.totalCandidates === 1 ? '' : 's'}`}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: TEXT }}>{s.label}</span>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: `${ACCENT}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT,
              }}>
                {s.icon}
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: ACCENT }}>{s.value}</div>
          </div>
        ))}
      </div>

      {candidates.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <Users size={32} color={ACCENT} style={{ marginBottom: 14 }} />
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No interviews yet</p>
          <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.6 }}>
            Once candidates complete interviews their results appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: candidate ? '1fr 380px' : '1fr', gap: 20 }}>

          {/* Candidate table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${TRACK}`, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: TEXT }} />
                <input
                  className="input"
                  placeholder="Search candidates..."
                  style={{ paddingLeft: 36, height: 38, fontSize: 13 }}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  ['all', 'All'],
                  ['completed', 'Completed'],
                  ['active', 'In Progress'],
                ].map(([value, label]) => (
                  <button key={value} onClick={() => setFilter(value)}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500,
                      background: filter === value ? 'rgba(216,196,182,0.15)' : 'transparent',
                      color: filter === value ? ACCENT : TEXT,
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
                      <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, color: TEXT, fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const isSelected = selected === c.id;
                    const badge = statusOf(c.status);
                    return (
                      <tr key={c.id}
                        onClick={() => setSelected(isSelected ? null : c.id)}
                        style={{
                          borderBottom: `1px solid ${TRACK}`, cursor: 'pointer', transition: 'background 0.15s',
                          background: isSelected ? 'rgba(216,196,182,0.06)' : 'transparent',
                        }}>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: '50%', background: ACCENT,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: 600, flexShrink: 0, color: '#213555',
                            }}>
                              {(c.candidateName || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 500 }}>{c.candidateName}</div>
                              {c.candidateEmail && (
                                <div style={{ fontSize: 12, color: TEXT, opacity: 0.7 }}>{c.candidateEmail}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 13, color: TEXT }}>{c.role}</td>
                        <td style={{ padding: '14px 20px' }}>
                          {typeof c.score === 'number' ? (
                            <span style={{ fontSize: 15, fontWeight: 700, color: ACCENT }}>{c.score}</span>
                          ) : (
                            <span style={{ color: TEXT, fontSize: 13, opacity: 0.7 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span className={`badge ${badge.cls}`}>{badge.label}</span>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 13, color: TEXT }}>
                          {formatDate(c.completedAt || c.startedAt)}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <p style={{ padding: '28px 20px', textAlign: 'center', fontSize: 14, color: TEXT }}>
                  No candidates match that search.
                </p>
              )}
            </div>
          </div>

          {/* Detail panel */}
          {candidate && (
            <div className="card" style={{ padding: 24, alignSelf: 'start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: ACCENT,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, color: '#213555',
                }}>
                  {(candidate.candidateName || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15 }}>{candidate.candidateName}</p>
                  <p style={{ fontSize: 13, color: TEXT }}>{candidate.role}</p>
                </div>
              </div>

              <div className="glow-line" style={{ margin: '0 0 20px' }} />

              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 48, fontWeight: 800, color: ACCENT, lineHeight: 1 }}>
                  {typeof candidate.score === 'number' ? candidate.score : '—'}
                </div>
                <p style={{ fontSize: 12, color: TEXT, marginTop: 4 }}>
                  {typeof candidate.score === 'number' ? 'Overall Score' : 'Not scored yet'}
                </p>
              </div>

              <p style={{ fontSize: 12, color: TEXT, marginBottom: 16, textAlign: 'center', opacity: 0.8 }}>
                {candidate.answeredCount} of {candidate.questionCount} question
                {candidate.questionCount === 1 ? '' : 's'} answered
              </p>

              {candidate.categoryScores && candidate.categoryScores.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {candidate.categoryScores.map(cat => (
                    <div key={cat.key}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ color: ACCENT }}>
                          {CATEGORY_ICONS[cat.key] || <Brain size={13} />}
                        </span>
                        <span style={{ fontSize: 12, color: TEXT }}>{cat.label}</span>
                      </div>
                      <ScoreBar value={cat.score} />
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: TEXT, textAlign: 'center', lineHeight: 1.6, opacity: 0.8 }}>
                  No category breakdown for this interview.
                </p>
              )}

              <div className="glow-line" style={{ margin: '20px 0' }} />
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}>
                <BarChart2 size={14} /> Full Report
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
