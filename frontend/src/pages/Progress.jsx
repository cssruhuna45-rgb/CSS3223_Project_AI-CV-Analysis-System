import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Sparkles } from 'lucide-react';
import InterviewProgress from '../components/InterviewProgress';
import { PageHeader } from '../components/ui';

/**
 * The candidate's own interview record, reachable at any time rather
 * than only in the moment after finishing one.
 */
export default function Progress() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0' }} className="workspace-page workspace-page--progress animate-fade-in-up">

      {/* position: 'relative' stays: the eyebrow pill, heading and text
          below are unaffected, and an unrelated layout change here was
          not part of this pass. */}
      <PageHeader icon={<Sparkles size={20} />} title="My Interview Progress" subtitle="See how your scores have moved across completed interviews, and decide what to focus on next." />

      <InterviewProgress compact />

      <div style={{ marginTop: 16 }}>
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
