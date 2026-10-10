import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Trophy,
  Brain,
  MessageSquare,
  Code,
  Layers,
  Download,
  RotateCcw,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Share2,
  Check,
  ArrowLeft,
  BookOpen,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Award,
  Sparkles,
  Calendar,
} from 'lucide-react';
import InterviewProgress from '../components/InterviewProgress';
import LearningRoadmap from '../components/LearningRoadmap';
import { interviewAPI } from '../services/api';

const ACCENT = '#6366F1';
const ACCENT_LIGHT = '#818CF8';
const TEXT = '#F8FAFC';
const MUTED = '#94A3B8';
const TRACK = 'rgba(255, 255, 255, 0.08)';
const CARD = 'rgba(15, 23, 42, 0.75)';
const CARD_BG = 'rgba(15, 23, 42, 0.75)';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.08)';

const GREEN = '#10B981';
const BLUE = '#38BDF8';
const AMBER = '#F59E0B';
const PURPLE = '#A855F7';
const CYAN = '#06B6D4';
const ROSE = '#F43F5E';

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

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Shown when no interview is found and history is completely empty
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
  const [params] = useSearchParams();

  const sessionId = params.get('session');

  // Immediately use cached result if available to prevent any flashing or delayed rendering
  const [result, setResult] = useState(() => {
    const cached = readResult();
    if (cached && (!sessionId || cached.session_id === sessionId || cached.sessionId === sessionId)) {
      return cached;
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    if (!sessionId) return false;
    const cached = readResult();
    if (cached && (cached.session_id === sessionId || cached.sessionId === sessionId)) {
      return false;
    }
    return true;
  });

  const [loadError, setLoadError] = useState('');

  // History archive state when no session is selected
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Model answer accordion expanded states
  const [expandedAnswers, setExpandedAnswers] = useState(new Set());
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!sessionId) {
      if (!result) {
        setHistoryLoading(true);
        interviewAPI
          .history()
          .then((items) => {
            if (!cancelled) setHistoryList(items || []);
          })
          .catch((err) => console.error('[Scorecard] Could not load history:', err))
          .finally(() => {
            if (!cancelled) setHistoryLoading(false);
          });
      }
      return;
    }

    // If we already have the matching result loaded, do not refetch or trigger loading state
    const cached = readResult();
    if (cached && (cached.session_id === sessionId || cached.sessionId === sessionId)) {
      setResult(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');

    interviewAPI
      .getScorecard(sessionId)
      .then((stored) => {
        if (!cancelled && stored) {
          setResult(stored);
          try {
            sessionStorage.setItem('interviewResult', JSON.stringify(stored));
          } catch (e) {}
        }
      })
      .catch((err) => {
        console.error('[Scorecard] Could not load that interview:', err);
        if (!cancelled) setLoadError(err.message || 'Could not load that interview.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]); // ONLY depend on sessionId to prevent infinite re-render loop

  const toggleModelAnswer = (qNum) => {
    setExpandedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(qNum)) next.delete(qNum);
      else next.add(qNum);
      return next;
    });
  };

  const handleCopyLink = () => {
    const curSession = sessionId || result?.session_id;
    const url = curSession
      ? `${window.location.origin}/scorecard?session=${encodeURIComponent(curSession)}`
      : window.location.href;

    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  if (loading || historyLoading) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <Clock size={32} color={ACCENT} />
        <p style={{ color: TEXT, marginTop: 14 }}>
          {sessionId ? 'Retrieving your interview scorecard…' : 'Loading interview archive…'}
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <EmptyState
        navigate={navigate}
        title="Could not open that interview"
        message={loadError}
      />
    );
  }

  // If no result is loaded, but past interviews exist in the database, show the Archive Selector!
  if (!result) {
    if (historyList.length > 0) {
      return (
        <div style={{ maxWidth: 840, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Award size={22} color={CYAN} />
                <h1 style={{ fontSize: 24, fontWeight: 700 }}>Interview Reports Archive</h1>
              </div>
              <p style={{ color: MUTED, fontSize: 14 }}>
                Select any completed interview to view its detailed scorecard, transcripts, and 14-day learning roadmap.
              </p>
            </div>
            <button
              className="btn btn-primary"
              style={{ fontSize: 13, padding: '10px 18px' }}
              onClick={() => navigate('/upload')}
            >
              <RotateCcw size={14} /> New Interview
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {historyList.map((it, idx) => {
              const score = it.score ?? 0;
              const tone = score >= 75 ? GREEN : score >= 50 ? AMBER : ROSE;
              return (
                <div
                  key={it.sessionId || idx}
                  onClick={() => it.sessionId && navigate(`/scorecard?session=${encodeURIComponent(it.sessionId)}`)}
                  style={{
                    background: CARD_BG,
                    border: `1px solid ${BORDER_COLOR}`,
                    borderRadius: 12,
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: it.sessionId ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = CYAN;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = BORDER_COLOR;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: `${tone}1F`,
                        border: `1px solid ${tone}59`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 16,
                        color: tone,
                      }}
                    >
                      {it.score ?? '—'}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>
                          Interview #{historyList.length - idx}
                        </span>
                        <span style={{ fontSize: 12, color: MUTED }}>
                          • {formatDate(it.completedAt || it.startedAt)}
                        </span>
                        {it.status !== 'completed' && (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: `${AMBER}22`, color: AMBER }}>
                            Unfinished
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: MUTED, margin: 0, maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {it.feedbackSummary || 'Evaluation report available with category breakdown and study roadmap.'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: CYAN, fontSize: 13, fontWeight: 600 }}>
                    Open Report <ChevronRight size={16} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <EmptyState
        navigate={navigate}
        title="No interview to show"
        message="Finish an interview and your report will appear here."
      />
    );
  }

  // Grading failed upstream
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
  const turns = result.turns || [];

  const overall = result.overall_score ?? 0;
  const grade =
    overall >= 85 ? 'Excellent' :
    overall >= 70 ? 'Good' :
    overall >= 55 ? 'Average' : 'Needs Work';

  const readiness =
    overall >= 85 ? 'Senior / Production Ready' :
    overall >= 70 ? 'Interview Ready' :
    overall >= 55 ? 'Developing Competency' : 'Foundational Practice Required';

  const gradeColor =
    overall >= 85 ? GREEN :
    overall >= 70 ? CYAN :
    overall >= 55 ? AMBER : ROSE;

  const glow =
    overall >= 85 ? '74,222,128' :
    overall >= 70 ? '34,211,238' :
    overall >= 55 ? '251,191,36' : '244,114,182';

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '36px 24px' }}>

      {/* Top Navigation & Actions Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
      }}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate('/progress')}
          style={{ fontSize: 13, gap: 6, padding: '6px 12px' }}
        >
          <ArrowLeft size={15} /> All Past Interviews
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-outline"
            onClick={handleCopyLink}
            style={{ fontSize: 12.5, gap: 6, padding: '7px 14px' }}
          >
            {copiedLink ? <Check size={14} color={GREEN} /> : <Share2 size={14} />}
            {copiedLink ? 'Link Copied!' : 'Share Scorecard'}
          </button>
          <button
            className="btn btn-outline"
            onClick={() => window.print()}
            style={{ fontSize: 12.5, gap: 6, padding: '7px 14px' }}
          >
            <Download size={14} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
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
          {perQuestion.length} of {result.total_questions || perQuestion.length} question
          {(result.total_questions || perQuestion.length) === 1 ? '' : 's'} answered
        </p>
      </div>

      {/* Overall Score & Readiness Badge */}
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

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="badge" style={{
            background: `rgba(${glow},0.15)`,
            color: gradeColor, border: `1px solid ${gradeColor}40`, fontSize: 13, padding: '6px 14px',
          }}>
            <TrendingUp size={14} /> {grade}
          </span>
          <span className="badge" style={{
            background: 'rgba(34, 211, 238, 0.12)',
            color: CYAN, border: '1px solid rgba(34, 211, 238, 0.3)', fontSize: 13, padding: '6px 14px',
          }}>
            <Sparkles size={14} /> {readiness}
          </span>
        </div>
      </div>

      {/* Category scores */}
      {categories.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
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
            <span style={{ fontWeight: 700, fontSize: 15, color: ACCENT }}>AI Feedback & Assessment</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {strengths.map((text, i) => (
              <div key={`s${i}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <CheckCircle size={16} color={GREEN} style={{ flexShrink: 0, marginTop: 3 }} />
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: GREEN, textTransform: 'uppercase', marginRight: 6 }}>Strength:</span>
                  <span style={{ fontSize: 14, color: TEXT, lineHeight: 1.6 }}>{text}</span>
                </div>
              </div>
            ))}
            {improvements.map((text, i) => (
              <div key={`i${i}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <XCircle size={16} color={AMBER} style={{ flexShrink: 0, marginTop: 3 }} />
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: AMBER, textTransform: 'uppercase', marginRight: 6 }}>Area to Improve:</span>
                  <span style={{ fontSize: 14, color: TEXT, lineHeight: 1.6 }}>{text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question by question - Transcripts, Answers & Model Answers */}
      {perQuestion.length > 0 && (
        <div className="card" style={{
          marginBottom: 24, background: CARD, borderTop: `3px solid ${BLUE}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Layers size={18} color={BLUE} />
            <span style={{ fontWeight: 700, fontSize: 15, color: BLUE }}>
              Question-by-Question Transcript & Evaluation
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {perQuestion.map(q => {
              const style = VERDICT_STYLE[q.verdict] || VERDICT_STYLE.weak;
              const turn = turns.find(t => t.turnNumber === q.question_number);
              const isAnswerExpanded = expandedAnswers.has(q.question_number);

              return (
                <div
                  key={q.question_number}
                  style={{ borderTop: `1px solid ${TRACK}`, paddingTop: 18 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: BLUE }}>
                      Question #{q.question_number}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: style.color, whiteSpace: 'nowrap' }}>
                      {q.score}/100 · {style.label}
                    </span>
                  </div>

                  <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, lineHeight: 1.6, marginBottom: 12 }}>
                    {q.question}
                  </p>

                  {/* Candidate's submitted answer */}
                  {turn?.answer && (
                    <div style={{
                      margin: '12px 0',
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', marginBottom: 4 }}>
                        Your Submitted Answer
                      </div>
                      <p style={{ fontSize: 13.5, color: TEXT, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                        {turn.answer}
                      </p>
                    </div>
                  )}

                  {/* What was good */}
                  {q.what_was_good && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                      <CheckCircle size={14} color={GREEN} style={{ flexShrink: 0, marginTop: 3 }} />
                      <p style={{ fontSize: 13, color: TEXT, lineHeight: 1.6, margin: 0 }}>
                        <strong style={{ color: GREEN }}>What worked:</strong> {q.what_was_good}
                      </p>
                    </div>
                  )}

                  {/* What was missing */}
                  {q.what_was_missing && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                      <XCircle size={14} color={AMBER} style={{ flexShrink: 0, marginTop: 3 }} />
                      <p style={{ fontSize: 13, color: TEXT, lineHeight: 1.6, margin: 0 }}>
                        <strong style={{ color: AMBER }}>What was missing:</strong> {q.what_was_missing}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 14-Day Personalized Upskilling Roadmap */}
      <LearningRoadmap
        sessionId={sessionId || result?.session_id}
        sessionResult={result}
      />

      {/* How this interview compares with the earlier ones */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <TrendingUp size={18} color={GREEN} />
          <span style={{ fontWeight: 700, fontSize: 15, color: GREEN }}>Your Overall Progress</span>
        </div>
        <InterviewProgress compact />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          className="btn btn-outline"
          style={{ flex: 1, minWidth: 160, justifyContent: 'center', padding: '12px' }}
          onClick={() => navigate('/home')}
        >
          <RotateCcw size={15} /> Back to Dashboard
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 2, minWidth: 200, justifyContent: 'center', padding: '12px' }}
          onClick={() => navigate('/upload')}
        >
          <Sparkles size={15} /> Start Another Practice Interview
        </button>
      </div>
    </div>
  );
}
