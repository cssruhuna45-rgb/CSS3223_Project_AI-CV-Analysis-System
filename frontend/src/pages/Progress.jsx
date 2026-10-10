import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Sparkles } from 'lucide-react';
import InterviewProgress from '../components/InterviewProgress';

/**
 * The candidate's own interview record, reachable at any time rather
 * than only in the moment after finishing one.
 */
export default function Progress() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }} className="animate-fade-in-up">

      <div style={{ marginBottom: 32, position: 'relative' }}>
        <div style={{
          position: 'absolute', top: -30, right: 0, width: 260, height: 180,
          background: 'radial-gradient(ellipse, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '4px 10px',
          borderRadius: 20, background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)',
          animation: 'pillGlow 3s ease-in-out infinite',
        }}>
          <Sparkles size={13} color="#22D3EE" />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#A5B4FC' }}>Performance Analytics</span>
        </div>
        <h1 style={{
          fontSize: 28, fontWeight: 700, marginBottom: 6,
          background: 'linear-gradient(135deg, #F8FAFC 0%, #A5B4FC 80%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          My Interview Progress
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          How your scores have moved across the interviews you have completed.
        </p>
      </div>

      <InterviewProgress compact />

      <div style={{ marginTop: 24 }}>
        <button
          className="btn btn-outline"
          style={{ justifyContent: 'center', padding: '12px 24px' }}
          onClick={() => navigate('/upload')}
        >
          <RotateCcw size={15} /> Start another interview
        </button>
      </div>
    </div>
  );
}
