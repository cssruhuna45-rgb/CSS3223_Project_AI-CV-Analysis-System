import React, { useState } from 'react';
import { Users, TrendingUp, Clock, CheckCircle, Search, Filter, Eye, Brain, Code, MessageSquare, Star, BarChart2 } from 'lucide-react';

const CANDIDATES = [
  { id: 1, name: 'Alice Johnson', role: 'Full Stack Developer', score: 88, status: 'completed', date: '2025-01-15', tech: 90, comm: 85, problem: 88, fit: 89 },
  { id: 2, name: 'Bob Martinez', role: 'Backend Developer', score: 74, status: 'completed', date: '2025-01-14', tech: 78, comm: 70, problem: 72, fit: 76 },
  { id: 3, name: 'Carol Chen', role: 'Data Scientist', score: 92, status: 'completed', date: '2025-01-13', tech: 95, comm: 90, problem: 93, fit: 90 },
  { id: 4, name: 'David Kim', role: 'DevOps Engineer', score: 65, status: 'completed', date: '2025-01-12', tech: 68, comm: 62, problem: 65, fit: 65 },
  { id: 5, name: 'Emma Wilson', role: 'Frontend Developer', score: 81, status: 'in-progress', date: '2025-01-11', tech: 82, comm: 80, problem: 79, fit: 83 },
  { id: 6, name: 'Frank Lee', role: 'ML Engineer', score: 0, status: 'pending', date: '2025-01-10', tech: 0, comm: 0, problem: 0, fit: 0 },
];

const STATS = [
  { label: 'Total Candidates', value: 6, icon: <Users size={20} />, color: '#D8C4B6' },
  { label: 'Completed', value: 4, icon: <CheckCircle size={20} />, color: '#D8C4B6' },
  { label: 'Avg Score', value: '80%', icon: <TrendingUp size={20} />, color: '#D8C4B6' },
  { label: 'In Progress', value: 1, icon: <Clock size={20} />, color: '#F5EFE7' },
];

const statusStyle = {
  completed: { label: 'Completed', cls: 'badge-green' },
  'in-progress': { label: 'In Progress', cls: 'badge-yellow' },
  pending: { label: 'Pending', cls: 'badge badge-blue' },
};

function ScoreBar({ value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: '#3E5879', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, color: '#F5EFE7', width: 28, textAlign: 'right' }}>{value || '—'}</span>
    </div>
  );
}

export default function RecruiterDashboard() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  const filtered = CANDIDATES.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.role.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || c.status === filter;
    return matchSearch && matchFilter;
  });

  const candidate = selected ? CANDIDATES.find(c => c.id === selected) : null;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Recruiter Dashboard</h1>
        <p style={{ color: '#F5EFE7', fontSize: 14 }}>Monitor candidate interviews and AI evaluation reports</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {STATS.map(s => (
          <div key={s.label} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#F5EFE7' }}>{s.label}</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                {s.icon}
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20 }}>
        {/* Candidate Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #3E5879', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#F5EFE7' }} />
              <input className="input" placeholder="Search candidates..." style={{ paddingLeft: 36, height: 38, fontSize: 13 }}
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'completed', 'in-progress', 'pending'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500,
                    background: filter === f ? 'rgba(216,196,182,0.15)' : 'transparent',
                    color: filter === f ? '#D8C4B6' : '#F5EFE7',
                  }}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #3E5879' }}>
                {['Candidate', 'Role', 'Score', 'Status', 'Date', ''].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, color: '#F5EFE7', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}
                  onClick={() => setSelected(selected === c.id ? null : c.id)}
                  style={{
                    borderBottom: '1px solid #3E5879', cursor: 'pointer', transition: 'background 0.15s',
                    background: selected === c.id ? 'rgba(216,196,182,0.06)' : 'transparent',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = selected === c.id ? 'rgba(216,196,182,0.08)' : 'rgba(245,239,231,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = selected === c.id ? 'rgba(216,196,182,0.06)' : 'transparent'}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #D8C4B6, #D8C4B6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 600, flexShrink: 0,
                      }}>
                        {c.name[0]}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#F5EFE7' }}>{c.role}</td>
                  <td style={{ padding: '14px 20px' }}>
                    {c.score > 0 ? (
                      <span style={{ fontSize: 15, fontWeight: 700, color: c.score >= 80 ? '#D8C4B6' : '#F5EFE7' }}>
                        {c.score}
                      </span>
                    ) : <span style={{ color: '#F5EFE7', fontSize: 13 }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className={`badge ${statusStyle[c.status].cls}`}>{statusStyle[c.status].label}</span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#F5EFE7' }}>{c.date}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
                      <Eye size={14} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail Panel */}
        {candidate && (
          <div className="card" style={{ padding: 24, alignSelf: 'start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg, #D8C4B6, #D8C4B6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700,
              }}>
                {candidate.name[0]}
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 15 }}>{candidate.name}</p>
                <p style={{ fontSize: 13, color: '#F5EFE7' }}>{candidate.role}</p>
              </div>
            </div>

            <div className="glow-line" style={{ margin: '0 0 20px' }} />

            {/* Overall */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: candidate.score >= 80 ? '#D8C4B6' : '#F5EFE7', lineHeight: 1 }}>
                {candidate.score || '—'}
              </div>
              <p style={{ fontSize: 12, color: '#F5EFE7', marginTop: 4 }}>Overall Score</p>
            </div>

            {/* Axis Scores */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Technical', value: candidate.tech, color: '#D8C4B6', icon: <Code size={13} /> },
                { label: 'Communication', value: candidate.comm, color: '#D8C4B6', icon: <MessageSquare size={13} /> },
                { label: 'Problem Solving', value: candidate.problem, color: '#D8C4B6', icon: <Brain size={13} /> },
                { label: 'Cultural Fit', value: candidate.fit, color: '#D8C4B6', icon: <Star size={13} /> },
              ].map(a => (
                <div key={a.label}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ color: a.color }}>{a.icon}</span>
                    <span style={{ fontSize: 12, color: '#F5EFE7' }}>{a.label}</span>
                  </div>
                  <ScoreBar value={a.value} color={a.color} />
                </div>
              ))}
            </div>

            <div className="glow-line" style={{ margin: '20px 0' }} />
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}>
              <BarChart2 size={14} /> Full Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
