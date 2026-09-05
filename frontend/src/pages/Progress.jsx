import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import InterviewProgress from '../components/InterviewProgress';

/**
 * The candidate's own interview record, reachable at any time rather
 * than only in the moment after finishing one.
 */
export default function Progress() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
          My Interview Progress
        </h1>
        <p style={{ color: '#F5EFE7', fontSize: 15 }}>
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
