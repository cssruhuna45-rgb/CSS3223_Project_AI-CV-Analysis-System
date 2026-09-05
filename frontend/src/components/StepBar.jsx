import React from 'react';
import { Brain, Zap, Mic, CheckCircle } from 'lucide-react';

export default function StepBar({ current = 1 }) {
  const steps = [
    { n: 1, label: 'Upload & Analyze CV', icon: <Brain size={15} /> },
    { n: 2, label: 'Skill Gap Analysis',  icon: <Zap size={15} /> },
    { n: 3, label: 'Mock Interview',      icon: <Mic size={15} /> },
  ];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      marginBottom: 36,
      width: '100%',
      maxWidth: 680,
      margin: '0 auto 36px',
    }}>
      {steps.map((s, i) => {
        const isDone = s.n < current;
        const isActive = s.n === current;

        return (
          <React.Fragment key={s.n}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
            }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isDone || isActive ? '#D8C4B6' : '#3E5879',
                color: isDone || isActive ? '#213555' : '#F5EFE7',
                fontSize: 13,
                fontWeight: 700,
                boxShadow: isActive ? '0 0 0 4px rgba(216,196,182,0.2)' : 'none',
                transition: 'all 0.25s ease',
              }}>
                {isDone ? <CheckCircle size={17} /> : s.icon}
              </div>
              <span style={{
                fontSize: 13,
                whiteSpace: 'nowrap',
                fontWeight: isActive ? 600 : 400,
                color: isActive || isDone ? '#D8C4B6' : 'rgba(245,239,231,0.6)',
              }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1,
                height: 2,
                margin: '0 12px',
                background: s.n < current ? '#D8C4B6' : '#3E5879',
                borderRadius: 2,
                minWidth: 20,
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
