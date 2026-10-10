import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Zap, Mic, CheckCircle2, Lock } from 'lucide-react';

export default function StepBar({ current = 1 }) {
  const navigate = useNavigate();

  // Inspect storage to determine whether candidate can navigate to step 2 or 3
  const hasAnalysis = typeof window !== 'undefined' && Boolean(
    sessionStorage.getItem('resumeAnalysis') || sessionStorage.getItem('resumeId')
  );
  const hasJobField = typeof window !== 'undefined' && Boolean(
    sessionStorage.getItem('selectedJobField')
  );
  const hasInterview = typeof window !== 'undefined' && Boolean(
    sessionStorage.getItem('interviewId') || sessionStorage.getItem('sessionId')
  );

  const steps = [
    {
      n: 1,
      label: 'Upload & Analyze CV',
      icon: Brain,
      path: '/upload',
      isAccessible: true,
    },
    {
      n: 2,
      label: 'Skill Gap Analysis',
      icon: Zap,
      path: '/skill-gap',
      isAccessible: current >= 2 || (hasAnalysis && hasJobField),
    },
    {
      n: 3,
      label: 'AI Mock Interview',
      icon: Mic,
      path: '/interview',
      isAccessible: current >= 3 || hasInterview,
    },
  ];

  return (
    <nav aria-label="Platform workflow progress" className="stepbar-nav">
      <ol className="stepbar-list">
        {steps.map((s, i) => {
          const isDone = s.n < current;
          const isActive = s.n === current;
          const Icon = s.icon;
          const isClickable = s.isAccessible && !isActive;

          return (
            <React.Fragment key={s.n}>
              <li className="stepbar-item">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => {
                    if (isClickable) {
                      navigate(s.path);
                    }
                  }}
                  className={`stepbar-btn ${isActive ? 'stepbar-active' : ''} ${isDone ? 'stepbar-done' : ''} ${!s.isAccessible ? 'stepbar-locked' : ''}`}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Step ${s.n}: ${s.label}. ${
                    isActive
                      ? 'Current step'
                      : isDone
                      ? 'Completed step, click to return'
                      : s.isAccessible
                      ? 'Available step, click to view'
                      : 'Locked step'
                  }`}
                  title={
                    isActive
                      ? `Step ${s.n}: ${s.label} (Current)`
                      : isDone
                      ? `Step ${s.n}: ${s.label} (Click to return)`
                      : s.isAccessible
                      ? `Step ${s.n}: ${s.label} (Click to open)`
                      : `Step ${s.n}: Complete previous steps to unlock`
                  }
                >
                  <div className="stepbar-circle">
                    {isDone ? (
                      <CheckCircle2 size={18} />
                    ) : !s.isAccessible ? (
                      <Lock size={13} style={{ opacity: 0.75 }} />
                    ) : (
                      <Icon size={15} />
                    )}
                  </div>
                  <span className="stepbar-label">
                    {s.label}
                  </span>
                </button>
              </li>
              {i < steps.length - 1 && (
                <div
                  className={`stepbar-line ${isDone ? 'stepbar-line-done' : ''}`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
