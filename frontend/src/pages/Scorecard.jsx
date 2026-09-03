import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Brain, MessageSquare, Code, Users, Download, RotateCcw, TrendingUp, CheckCircle, XCircle } from 'lucide-react';

const SCORES = [
  { label: 'Technical Knowledge', icon: <Code size={18} />, score: 78, color: '#D8C4B6' },
  { label: 'Communication', icon: <MessageSquare size={18} />, score: 85, color: '#D8C4B6' },
  { label: 'Problem Solving', icon: <Brain size={18} />, score: 72, color: '#D8C4B6' },
  { label: 'Cultural Fit', icon: <Users size={18} />, score: 90, color: '#D8C4B6' },
];

const FEEDBACK = [
  { type: 'strength', text: 'Strong communication skills with clear and structured answers.' },
  { type: 'strength', text: 'Good understanding of REST API design principles.' },
  { type: 'strength', text: 'Demonstrated solid experience with React state management.' },
  { type: 'improve', text: 'Could elaborate more on system design and scalability considerations.' },
  { type: 'improve', text: 'Provide more concrete metrics when describing past achievements.' },
];

export default function Scorecard() {
  const navigate = useNavigate();
  const overall = Math.round(SCORES.reduce((s, x) => s + x.score, 0) / SCORES.length);
  const grade = overall >= 85 ? 'Excellent' : overall >= 70 ? 'Good' : overall >= 55 ? 'Average' : 'Needs Work';
  const gradeColor = overall >= 70 ? '#D8C4B6' : '#F5EFE7';

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: `rgba(${overall >= 70 ? '0,173,181' : '238,238,238'},0.15)`,
          border: `2px solid ${gradeColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Trophy size={32} color={gradeColor} />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Interview Complete!</h1>
        <p style={{ color: '#F5EFE7', fontSize: 15 }}>Here's your AI-generated performance report</p>
      </div>

      {/* Overall Score */}
      <div className="card" style={{ textAlign: 'center', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at center, rgba(${overall >= 70 ? '0,173,181' : '238,238,238'},0.06) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
        <p style={{ fontSize: 13, color: '#F5EFE7', marginBottom: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Score</p>
        <div style={{ fontSize: 72, fontWeight: 800, color: gradeColor, lineHeight: 1, marginBottom: 8 }}>{overall}</div>
        <div style={{ fontSize: 13, color: '#F5EFE7', marginBottom: 16 }}>out of 100</div>
        <span className="badge" style={{
          background: `rgba(${overall >= 70 ? '0,173,181' : '238,238,238'},0.15)`,
          color: gradeColor, border: `1px solid ${gradeColor}40`, fontSize: 14, padding: '6px 16px',
        }}>
          <TrendingUp size={14} /> {grade}
        </span>
      </div>

      {/* 4-Axis Scores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {SCORES.map(s => (
          <div key={s.label} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: s.color,
              }}>
                {s.icon}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#F5EFE7' }}>{s.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.score}</span>
              <span style={{ fontSize: 13, color: '#F5EFE7', marginBottom: 4 }}>/100</span>
            </div>
            <div style={{ height: 6, background: '#3E5879', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3, background: s.color,
                width: `${s.score}%`, transition: 'width 1s ease',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* AI Feedback */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Brain size={18} color="#D8C4B6" />
          <span style={{ fontWeight: 600, fontSize: 15 }}>AI Feedback</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FEEDBACK.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {f.type === 'strength'
                ? <CheckCircle size={16} color="#D8C4B6" style={{ flexShrink: 0, marginTop: 2 }} />
                : <XCircle size={16} color="#F5EFE7" style={{ flexShrink: 0, marginTop: 2 }} />}
              <p style={{ fontSize: 14, color: '#F5EFE7', lineHeight: 1.6 }}>{f.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
          onClick={() => navigate('/upload')}>
          <RotateCcw size={15} /> Try Again
        </button>
        <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', padding: '12px' }}
          onClick={() => window.print()}>
          <Download size={15} /> Download Report
        </button>
      </div>
    </div>
  );
}
