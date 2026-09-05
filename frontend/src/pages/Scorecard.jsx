import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Brain, MessageSquare, Code, Layers,
  Download, RotateCcw, TrendingUp, CheckCircle, XCircle, AlertTriangle,
} from 'lucide-react';
import InterviewProgress from '../components/InterviewProgress';

const ACCENT = '#D8C4B6';
const TEXT = '#F5EFE7';
const TRACK = '#3E5879';
const CARD = '#000000';

// One hue per idea, reused across the scorecard and the progress panel
// so a colour means the same thing wherever it appears: green is what
// went well, amber is what did not, and each category keeps its own.
const GREEN = '#4ADE80';
const BLUE = '#60A5FA';
const AMBER = '#FBBF24';
const PURPLE = '#C084FC';
const CYAN = '#22D3EE';
const ROSE = '#F472B6';

// The AI service names its categories; the icons and colours live here.
const CATEGORY_ICONS = {
  technical_knowledge: <Code size={18} />,
  depth: <Layers size={18} />,
  problem_solving: <Brain size={18} />,
  communication: <MessageSquare size={18} />,
};

const CATEGORY_COLORS = {
  technical_knowledge: BLUE,
  depth: PURPLE,
  problem_solving: CYAN,
  communication: ROSE,
};

const VERDICT_STYLE = {
  strong: { color: GREEN, label: 'Strong' },
  partial: { color: AMBER, label: 'Partial' },
  weak: { color: ROSE, label: 'Weak' },
  none: { color: ROSE, label: 'No answer' },
};

function readResult() {
  try {
    const raw = sessionStorage.getItem('interviewResult');
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('[Scorecard] Could not parse stored result:', err);
    return null;
  }
}

// Shown when someone opens /scorecard without finishing an interview.
function EmptyState({ navigate, title, message }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
      <AlertTriangle size={40} color={AMBER} style={{ marginBottom: 16 }} />
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>{title}</h1>
      <p style={{ color: TEXT, fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>{message}</p>
      <button
        className="btn btn-primary"
        style={{ justifyContent: 'center', padding: '12px 24px' }}
        onClick={() => navigate('/upload')}
      >
        <RotateCcw size={15} /> Start an interview
      </button>
    </div>
  );
}

export default function Scorecard() {
  const navigate = useNavigate();
  const result = readResult();

  if (!result) {
    return (
      <EmptyState
        navigate={navigate}
        title="No interview to show"
        message="Finish an interview and your report will appear here."
      />
    );
  }

  // Grading failed upstream. Showing the zeros as if they were a real
  // result would be worse than saying so.
  if (result.evaluated === false) {
    return (
      <EmptyState
        navigate={navigate}
        title="We couldn't score this interview"
        message={
          result.evaluation_error ||
          'The AI service could not grade your answers. Your answers were not lost — please try again.'
        }
      />
    );
  }

  const categories = result.category_scores || [];
  const strengths = result.strengths || [];
  const improvements = result.improvements || [];
  const perQuestion = result.per_question || [];

  const overall = result.overall_score ?? 0;
  const grade =
    overall >= 85 ? 'Excellent' :
    overall >= 70 ? 'Good' :
    overall >= 55 ? 'Average' : 'Needs Work';
  // The headline colour is the grade, so the number is readable at a
  // glance before anybody reads the word next to it.
  const gradeColor =
    overall >= 85 ? GREEN :
    overall >= 70 ? CYAN :
    overall >= 55 ? AMBER : ROSE;
  const glow =
    overall >= 85 ? '74,222,128' :
    overall >= 70 ? '34,211,238' :
    overall >= 55 ? '251,191,36' : '244,114,182';

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: `rgba(${glow},0.15)`,
          border: `2px solid ${gradeColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Trophy size={32} color={gradeColor} />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Interview Complete!</h1>
        <p style={{ color: TEXT, fontSize: 15 }}>
          {perQuestion.length} of {result.total_questions} question
          {result.total_questions === 1 ? '' : 's'} answered
        </p>
      </div>

      {/* Overall Score */}
      <div className="card" style={{
        textAlign: 'center', marginBottom: 24, position: 'relative', overflow: 'hidden',
        background: CARD, borderTop: `3px solid ${gradeColor}`,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at center, rgba(${glow},0.12) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
        <p style={{ fontSize: 13, color: gradeColor, marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Overall Score
        </p>
        <div style={{ fontSize: 72, fontWeight: 800, color: gradeColor, lineHeight: 1, marginBottom: 8 }}>{overall}</div>
        <div style={{ fontSize: 13, color: TEXT, marginBottom: 16 }}>out of 100</div>
        <span className="badge" style={{
          background: `rgba(${glow},0.15)`,
          color: gradeColor, border: `1px solid ${gradeColor}40`, fontSize: 14, padding: '6px 16px',
        }}>
          <TrendingUp size={14} /> {grade}
        </span>
      </div>

      {/* Category scores */}
      {categories.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {categories.map(c => {
            const tone = CATEGORY_COLORS[c.key] || ACCENT;
            return (
              <div key={c.key} className="card" style={{
                padding: 20, background: CARD, borderTop: `3px solid ${tone}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${tone}1F`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: tone, border: `1px solid ${tone}59`,
                  }}>
                    {CATEGORY_ICONS[c.key] || <Brain size={18} />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: tone }}>{c.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 32, fontWeight: 700, color: tone, lineHeight: 1 }}>{c.score}</span>
                  <span style={{ fontSize: 13, color: TEXT, marginBottom: 4 }}>/100</span>
                </div>
                <div style={{ height: 6, background: TRACK, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, background: tone,
                    width: `${c.score}%`, transition: 'width 1s ease',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Strengths and improvements */}
      {(strengths.length > 0 || improvements.length > 0) && (
        <div className="card" style={{
          marginBottom: 24, background: CARD, borderTop: `3px solid ${ACCENT}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Brain size={18} color={ACCENT} />
            <span style={{ fontWeight: 700, fontSize: 15, color: ACCENT }}>AI Feedback</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {strengths.map((text, i) => (
              <div key={`s${i}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <CheckCircle size={16} color={GREEN} style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.6 }}>{text}</p>
              </div>
            ))}
            {improvements.map((text, i) => (
              <div key={`i${i}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <XCircle size={16} color={AMBER} style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.6 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question by question - what a complete answer needed */}
      {perQuestion.length > 0 && (
        <div className="card" style={{
          marginBottom: 24, background: CARD, borderTop: `3px solid ${BLUE}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Layers size={18} color={BLUE} />
            <span style={{ fontWeight: 700, fontSize: 15, color: BLUE }}>Question by question</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {perQuestion.map(q => {
              const style = VERDICT_STYLE[q.verdict] || VERDICT_STYLE.weak;
              return (
                <div
                  key={q.question_number}
                  style={{ borderTop: `1px solid ${TRACK}`, paddingTop: 16 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: BLUE }}>
                      Q{q.question_number}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: style.color, whiteSpace: 'nowrap' }}>
                      {q.score}/100 · {style.label}
                    </span>
                  </div>

                  <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.6, marginBottom: 10 }}>
                    {q.question}
                  </p>

                  {q.what_was_good && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
                      <CheckCircle size={14} color={GREEN} style={{ flexShrink: 0, marginTop: 3 }} />
                      <p style={{ fontSize: 13, color: TEXT, lineHeight: 1.6 }}>{q.what_was_good}</p>
                    </div>
                  )}

                  {q.what_was_missing && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <XCircle size={14} color={AMBER} style={{ flexShrink: 0, marginTop: 3 }} />
                      <p style={{ fontSize: 13, color: TEXT, lineHeight: 1.6 }}>{q.what_was_missing}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* How this interview compares with the earlier ones.
          Read from the database rather than from this result, so it
          is the same story on any device and after any restart. */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <TrendingUp size={18} color={GREEN} />
          <span style={{ fontWeight: 700, fontSize: 15, color: GREEN }}>Your progress</span>
        </div>
        <InterviewProgress compact />
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
