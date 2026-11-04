import { useToast } from '../components/ToastProvider';
import React, { useEffect, useRef, useState } from 'react';
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
import { CodeText, PageHeader } from '../components/ui';
import useScrollReveal from '../hooks/useScrollReveal';
import { printDate, printPage } from '../utils/print';
import { userMessage } from '../services/http';

const ACCENT = 'var(--accent)';
const ACCENT_LIGHT = 'var(--accent)';
const TEXT = 'var(--text-primary)';
const MUTED = 'var(--text-muted)';
const TRACK = 'color-mix(in srgb, var(--fg) 8%, transparent)';
const CARD = 'color-mix(in srgb, var(--bg-surface) 75%, transparent)';
const CARD_BG = 'color-mix(in srgb, var(--bg-surface) 75%, transparent)';
const BORDER_COLOR = 'color-mix(in srgb, var(--fg) 8%, transparent)';

const GREEN = 'var(--success)';
const BLUE = 'var(--accent)';
const AMBER = 'var(--warning)';
const PURPLE = 'var(--accent)';
const CYAN = 'var(--accent)';
const ROSE = 'var(--danger)';

const CATEGORY_ICONS = {
  technical_knowledge: <Code size={18} />,
  depth: <Layers size={18} />,
  problem_solving: <Brain size={18} />,
  communication: <MessageSquare size={18} />,
};

// One rule colours every score on this page, the overall number and
// each category alike. Categories used to have a colour each (blue,
// purple, cyan, rose), so a decent 65 in Communication showed in red
// and read as a failure. Now colour means only how good the score is,
// and which category it is comes from the icon and the label.
function scoreTone(score) {
  return score >= 85 ? GREEN
    : score >= 70 ? CYAN
      : score >= 55 ? AMBER
        : ROSE;
}

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

// The cached result is what makes a bare /scorecard show the report a
// candidate has just finished. Anything that deliberately leaves a
// report has to drop it, or that report keeps reappearing in place of
// the archive.
// The three kinds of interview an archive row can be, and the labels
// the candidate sees for them.
//
// "Job interview" rather than "Recruiter interview": the candidate
// applied for a job, which is the fact that matters to them, and the
// recruiter is only who happens to be reading it. It is also the name
// the rest of the codebase already uses for this.
//
// A job interview is always sat under exam conditions, so it is shown
// as one kind, not as "Exam" plus a second tag saying the same thing.
const ALL = 'all';
const JOB = 'job';
const EXAM = 'exam';
const PRACTICE = 'practice';
// Interviews sat before modes existed. They carry no mode and no job,
// so there is nothing truthful to label them with: they show no tag,
// as they always have, and are offered under All only. Counting them
// as exams would put rows with no tag behind an "Exam" filter.
const UNTAGGED = 'untagged';

const KIND_LABEL = {
  [JOB]: 'Job interview',
  [EXAM]: 'Exam',
  [PRACTICE]: 'Practice',
};

const FILTER_LABEL = {
  [ALL]: 'All',
  [JOB]: 'Job interviews',
  [EXAM]: 'Exam',
  [PRACTICE]: 'Practice',
};

/** A job behind the interview is what makes it a job interview. */
function kindOf(item) {
  if (item.jobTitle) return JOB;
  if (item.mode === PRACTICE) return PRACTICE;
  if (item.mode === EXAM) return EXAM;
  return UNTAGGED;
}

function clearCachedResult() {
  try {
    sessionStorage.removeItem('interviewResult');
  } catch (err) {
    // Storage unavailable: there was nothing cached to begin with.
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
function EmptyState({ navigate, title, message, onRetry, alert = false }) {
  return (
    <div role={alert ? 'alert' : undefined} style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-6) 0', textAlign: 'center' }}>
      <AlertTriangle size={40} color={AMBER} style={{ marginBottom: 16 }} aria-hidden="true" />
      <h1 style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, marginBottom: 10 }}>{title}</h1>
      <p style={{ color: TEXT, fontSize: 'var(--fs-base)', lineHeight: 1.6, marginBottom: 28 }}>{message}</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {onRetry && (
          <button type="button" className="btn btn-primary" style={{ justifyContent: 'center', padding: '12px 24px' }} onClick={onRetry}>
            Try again
          </button>
        )}
        <button
          type="button"
          className={onRetry ? 'btn btn-outline' : 'btn btn-primary'}
          style={{ justifyContent: 'center', padding: '12px 24px' }}
          onClick={() => navigate('/upload')}
        >
          <RotateCcw size={15} /> Start an interview
        </button>
      </div>
    </div>
  );
}

/**
 * True when grading did not run for this interview. Its scores are
 * then placeholders, never a real result of zero.
 */
export const gradingUnavailable = (result) => Boolean(result) && result.evaluated === false;

// Fixed wording: a stored evaluation_error may hold technical text from
// before it was cleaned up, so it is never shown.
export const NOT_SCORED_MESSAGE =
  "We couldn't score this interview. Your answers were received, but the scoring step didn't finish, so no score is shown.";

export default function Scorecard() {
  const notify = useToast();
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
  // Which kind of interview the archive is showing: all, job, exam or
  // practice.
  const [archiveFilter, setArchiveFilter] = useState(ALL);
  const [historyError, setHistoryError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((n) => n + 1);

  // Model answer accordion expanded states
  const [expandedAnswers, setExpandedAnswers] = useState(new Set());
  // "Why this score?" panels, by question number
  const [expandedSources, setExpandedSources] = useState(new Set());
  const [copiedLink, setCopiedLink] = useState(false);

  const pageRef = useRef(null);
  // Declared here, before any of the early returns below, so it always
  // runs - Scorecard has several (loading, error, archive, full
  // report), each swapping in a different root element under the same
  // ref. The deps cover every transition between them, since the
  // effect only re-runs when a dep changes, not merely because
  // pageRef.current now points somewhere new. Scoped to the archive
  // list only: the full report view is dense enough already and was
  // not part of what this pass was asked to touch.
  useScrollReveal(pageRef, [loading, historyLoading, Boolean(result), historyList.length]);

  useEffect(() => {
    let cancelled = false;

    if (!sessionId) {
      if (!result) {
        setHistoryLoading(true);
        setHistoryError('');
        interviewAPI
          .history()
          .then((items) => {
            if (!cancelled) setHistoryList(items || []);
          })
          .catch((err) => {
            console.error('[Scorecard] Could not load history:', err);
            // Not "no interviews yet": the list could not be read.
            if (!cancelled) setHistoryError(userMessage(err, "We couldn't load your past interviews. Please try again."));
          })
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
          // Deliberately not cached. This cache means "the interview
          // just finished", which is the one case a bare /scorecard
          // should show instead of the archive. Writing every report
          // the candidate opens into it made the archive unreachable
          // from the sidebar as well as from the back button.
          setResult(stored);
        }
      })
      .catch((err) => {
        console.error('[Scorecard] Could not load that interview:', err);
        if (!cancelled) setLoadError(userMessage(err, "We couldn't load that interview. Please try again."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, attempt]); // not on result, which would refetch in a loop

  // Back to the list of every past interview.
  //
  // Three things have to happen together. The URL loses its session, so
  // the effect below knows to fetch the history; the loaded report is
  // dropped, because the archive only renders when there is no result;
  // and the cached copy goes too, or a reload - or the sidebar's own
  // Scorecards link - would put that same report straight back.
  const showArchive = () => {
    clearCachedResult();
    setResult(null);
    setLoadError('');
    navigate('/scorecard');
  };

  const toggleModelAnswer = (qNum) => {
    setExpandedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(qNum)) next.delete(qNum);
      else next.add(qNum);
      return next;
    });
  };

  const toggleSources = (qNum) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(qNum)) next.delete(qNum);
      else next.add(qNum);
      return next;
    });
  };

  const handleCopyLink = async () => {
    const curSession = sessionId || result?.session_id;
    const url = curSession
      ? `${window.location.origin}/scorecard?session=${encodeURIComponent(curSession)}`
      : window.location.href;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setCopiedLink(false);
      notify('Couldn’t copy automatically; please copy the page address manually.', 'warning');
    }
  };

  if (loading || historyLoading) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-6) 0', textAlign: 'center' }}>
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
        title="We couldn't open that interview"
        message={loadError}
        onRetry={retry}
        alert
      />
    );
  }

  // If no result is loaded, but past interviews exist in the database, show the Archive Selector!
  if (!result) {
    if (historyError) {
      return (
        <EmptyState
          navigate={navigate}
          title="We couldn't load your interviews"
          message={historyError}
          onRetry={retry}
          alert
        />
      );
    }
    if (historyList.length > 0) {
      // Numbered from the whole list, before any filtering: "Interview
      // #7" is the seventh interview whichever filter is on. Numbering
      // the filtered list instead would rename every row the moment a
      // filter was touched.
      const numbered = historyList.map((it, idx) => ({
        ...it,
        number: historyList.length - idx,
        kind: kindOf(it),
      }));

      const counts = numbered.reduce(
        (acc, it) => ({ ...acc, [it.kind]: (acc[it.kind] || 0) + 1 }),
        { [ALL]: numbered.length },
      );

      // Only offer a filter for a kind the candidate actually has, and
      // only offer filtering at all when there is more than one kind.
      const kinds = [JOB, EXAM, PRACTICE].filter((k) => counts[k] > 0);
      const filters = kinds.length > 1 ? [ALL, ...kinds] : [];

      const shown = archiveFilter === ALL
        ? numbered
        : numbered.filter((it) => it.kind === archiveFilter);

      return (
        <div className="workspace-page workspace-page--scorecards" ref={pageRef} style={{ maxWidth: 960, margin: '0 auto', padding: '0' }}>
          <PageHeader
            icon={<Award size={18} />}
            title="Interview Reports Archive"
            subtitle="Open any completed interview for its scorecard, transcript and 14-day learning roadmap."
            action={(
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/upload')}
              >
                <RotateCcw size={14} /> New Interview
              </button>
            )}
          />

          {filters.length > 0 && (
            <div
              role="group"
              aria-label="Filter interviews by kind"
              style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}
            >
              {filters.map((key) => {
                const active = archiveFilter === key;

                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setArchiveFilter(key)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      borderRadius: 999,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--fs-sm)',
                      fontWeight: active ? 700 : 500,
                      border: `1px solid ${active ? 'var(--accent)' : BORDER_COLOR}`,
                      background: active
                        ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                        : 'transparent',
                      color: active ? 'var(--accent-text)' : TEXT,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {FILTER_LABEL[key]}
                    <span style={{ color: MUTED, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                      {counts[key] || 0}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* One surface with hairline rules between the rows, rather
              than a stack of separate cards each with its own border and
              a gap beneath it. Six rows used to carry six borders and
              five 12px gaps of nothing; this reads as one list, which is
              what it is. */}
          <div
            className="subreveal"
            style={{
              background: CARD_BG,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {shown.map((it, idx) => {
              // No score (grading did not run) is neutral, not a red zero.
              const score = it.score;
              const tone = score == null ? MUTED : score >= 75 ? GREEN : score >= 50 ? AMBER : ROSE;
              return (
                <div
                  key={it.sessionId || idx}
                  // A row that only answers the mouse is a row a
                  // keyboard cannot open. It behaves as a button now,
                  // and the global focus ring applies.
                  role={it.sessionId ? 'button' : undefined}
                  tabIndex={it.sessionId ? 0 : undefined}
                  onClick={() => it.sessionId && navigate(`/scorecard?session=${encodeURIComponent(it.sessionId)}`)}
                  onKeyDown={(e) => {
                    if (!it.sessionId) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/scorecard?session=${encodeURIComponent(it.sessionId)}`);
                    }
                  }}
                  style={{
                    // A hairline between rows, not a border around each.
                    borderTop: idx === 0 ? 'none' : `1px solid ${BORDER_COLOR}`,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    cursor: it.sessionId ? 'pointer' : 'default',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-card-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        flexShrink: 0,
                        borderRadius: '50%',
                        background: `color-mix(in srgb, ${tone} 12%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${tone} 35%, transparent)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 'var(--fs-base)',
                        color: tone,
                      }}
                    >
                      {it.score ?? '—'}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: TEXT }}>
                          Interview #{it.number}
                        </span>
                        <span style={{ fontSize: 'var(--fs-xs)', color: MUTED }}>
                          • {formatDate(it.completedAt || it.startedAt)}
                        </span>
                        {/* One tag, not two: a job interview is always
                            sat under exam conditions. */}
                        {it.kind === JOB ? (
                          <span className="badge badge-blue">{KIND_LABEL[JOB]}</span>
                        ) : it.mode ? (
                          <span className="badge badge-neutral">{KIND_LABEL[it.kind]}</span>
                        ) : null}
                        {it.kind === JOB && (
                          <span style={{ fontSize: 'var(--fs-xs)', color: MUTED }}>
                            {it.jobTitle}{it.company ? ` · ${it.company}` : ''}
                          </span>
                        )}
                        {it.status !== 'completed' && (
                          <span style={{ fontSize: 'var(--fs-xs)', padding: '2px 8px', borderRadius: 8, background: `color-mix(in srgb, ${AMBER} 13%, transparent)`, color: AMBER }}>
                            Unfinished
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 'var(--fs-sm)', color: MUTED, margin: 0, maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {it.feedbackSummary || 'Evaluation report available with category breakdown and study roadmap.'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: CYAN, fontSize: 'var(--fs-sm)', fontWeight: 600 }}>
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
  if (gradingUnavailable(result)) {
    return (
      <EmptyState
        navigate={navigate}
        title="We couldn't score this interview"
        message={NOT_SCORED_MESSAGE}
      />
    );
  }

  const categories = result.category_scores || [];
  const strengths = result.strengths || [];
  const improvements = result.improvements || [];
  const perQuestion = result.per_question || [];
  const turns = result.turns || [];

  // A job interview puts the recruiter's own approved questions to every
  // candidate, so each graded answer carries that question's id. A
  // practice interview's questions are written for that session alone
  // and have none - which is what separates the two here.
  //
  // It matters because "what was missing" names the points the answer
  // should have covered. On a practice question that is the feedback the
  // candidate came for. On a job question, which the next candidate will
  // also be asked, it is the answer key.
  const isJobInterview = perQuestion.some((q) => q.question_id != null);

  const overall = result.overall_score ?? 0;

  // One label for the score. There used to be two side by side
  // ("Average" and "Developing Competency") saying the same thing.
  const readiness =
    overall >= 85 ? 'Senior / Production Ready' :
    overall >= 70 ? 'Interview Ready' :
    overall >= 55 ? 'Developing Competency' : 'Foundational Practice Required';

  const gradeColor = scoreTone(overall);

  return (
    <div className="workspace-page workspace-page--report" style={{ maxWidth: 960, margin: '0 auto', padding: '0' }}>

      {/* Top Navigation & Actions Bar */}
      <div className="no-print" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
      }}>
        <button
          className="btn btn-ghost"
          onClick={showArchive}
          style={{ fontSize: 'var(--fs-sm)', gap: 6, padding: '6px 12px' }}
        >
          <ArrowLeft size={15} /> All Past Interviews
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-outline"
            onClick={handleCopyLink}
            style={{ fontSize: 'var(--fs-xs)', gap: 6, padding: '7px 14px' }}
          >
            {copiedLink ? <Check size={14} color={GREEN} /> : <Share2 size={14} />}
            {copiedLink ? 'Link Copied!' : 'Share Scorecard'}
          </button>
          <button
            className="btn btn-outline"
            onClick={() => printPage(`Interview scorecard ${printDate()}`)}
            style={{ fontSize: 'var(--fs-xs)', gap: 6, padding: '7px 14px' }}
          >
            <Download size={14} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Only on paper: says what the page is, since the navbar is gone. */}
      <div className="print-only print-header">
        AI Interview Platform &middot; Interview scorecard &middot; {printDate()}
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: `color-mix(in srgb, ${gradeColor} 10%, var(--bg-surface))`,
          border: `2px solid ${gradeColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Trophy size={32} color={gradeColor} />
        </div>
        <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, marginBottom: 6 }}>Interview Complete!</h1>
        <p style={{ color: TEXT, fontSize: 'var(--fs-base)' }}>
          {perQuestion.length} of {result.total_questions || perQuestion.length} question
          {(result.total_questions || perQuestion.length) === 1 ? '' : 's'} answered
        </p>
        {/* Which mode it was sat in. A practice score could be revised
            after seeing the expected answers, so it is said plainly that
            it does not count towards progress. */}
        {result.mode && (
          <p style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', fontSize: 'var(--fs-sm)', color: MUTED }}>
            <span className="badge badge-neutral">{result.mode === 'practice' ? 'Practice' : 'Exam'}</span>
            {result.mode === 'practice' && 'Practice scores are not counted in your progress.'}
          </p>
        )}
      </div>

      {/* Overall Score & Readiness Badge */}
      <div className="card" style={{
        textAlign: 'center', marginBottom: 16, position: 'relative', overflow: 'hidden',
        background: CARD, borderTop: `3px solid ${gradeColor}`,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `transparent`,
          pointerEvents: 'none',
        }} />
        <p style={{ fontSize: 'var(--fs-sm)', color: gradeColor, marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Overall Score
        </p>
        <div style={{ fontSize: 72, fontWeight: 800, color: gradeColor, lineHeight: 1, marginBottom: 8 }}>{overall}</div>
        <div style={{ fontSize: 'var(--fs-sm)', color: TEXT, marginBottom: 16 }}>out of 100</div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="badge" style={{
            background: `color-mix(in srgb, ${gradeColor} 10%, var(--bg-surface))`,
            color: gradeColor, border: `1px solid color-mix(in srgb, ${gradeColor} 25%, transparent)`, fontSize: 'var(--fs-sm)', padding: '6px 14px',
          }}>
            <TrendingUp size={14} /> {readiness}
          </span>
        </div>
      </div>

      {/* Category scores */}
      {categories.length > 0 && (
        // Two columns, so the four categories make a 2x2 block instead of
        // three in a row and one left alone underneath; one column on
        // a phone.
        //
        // Spelled out rather than left to auto-fit: with a 300px minimum
        // this container is wide enough for three tracks, so auto-fit
        // produced exactly the 3+1 orphan the line above rules out.
        <div className="scorecard-categories" style={{ display: 'grid', gap: 16, marginBottom: 16 }}>
          {categories.map(c => {
            const tone = scoreTone(c.score);
            return (
              <div key={c.key} className="card" style={{
                padding: 16, background: CARD,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `color-mix(in srgb, ${ACCENT} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: ACCENT_LIGHT, border: `1px solid color-mix(in srgb, ${ACCENT} 35%, transparent)`,
                  }}>
                    {CATEGORY_ICONS[c.key] || <Brain size={18} />}
                  </div>
                  <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: TEXT }}>{c.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, color: tone, lineHeight: 1 }}>{c.score}</span>
                  <span style={{ fontSize: 'var(--fs-sm)', color: TEXT, marginBottom: 4 }}>/100</span>
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
          marginBottom: 16, background: CARD, borderTop: `3px solid ${ACCENT}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Brain size={18} color={ACCENT} />
            <span style={{ fontWeight: 700, fontSize: 'var(--fs-base)', color: 'var(--accent-text)' }}>AI Feedback & Assessment</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {strengths.map((text, i) => (
              <div key={`s${i}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <CheckCircle size={16} color={GREEN} style={{ flexShrink: 0, marginTop: 3 }} />
                <div>
                  <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: GREEN, textTransform: 'uppercase', marginRight: 6 }}>Strength:</span>
                  <span style={{ fontSize: 'var(--fs-sm)', color: TEXT, lineHeight: 1.6 }}>{text}</span>
                </div>
              </div>
            ))}
            {improvements.map((text, i) => (
              <div key={`i${i}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <XCircle size={16} color={AMBER} style={{ flexShrink: 0, marginTop: 3 }} />
                <div>
                  <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: AMBER, textTransform: 'uppercase', marginRight: 6 }}>Area to Improve:</span>
                  <span style={{ fontSize: 'var(--fs-sm)', color: TEXT, lineHeight: 1.6 }}>{text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question by question - Transcripts, Answers & Model Answers */}
      {perQuestion.length > 0 && (
        <div className="card" style={{
          marginBottom: 16, background: CARD, borderTop: `3px solid ${BLUE}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Layers size={18} color={BLUE} />
            <span style={{ fontWeight: 700, fontSize: 'var(--fs-base)', color: BLUE }}>
              Question-by-Question Transcript & Evaluation
            </span>
          </div>

          {isJobInterview && (
            <p role="note" style={{ fontSize: 'var(--fs-sm)', color: MUTED, lineHeight: 1.6, marginBottom: 16 }}>
              This interview used the questions set by the recruiter for this job.
              Every candidate is asked the same ones, so the detailed notes on what
              each answer should have covered are shown only to the recruiter. Your
              scores, strengths and areas to improve are all above.
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                    <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: BLUE }}>
                      Question #{q.question_number}
                    </span>
                    <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: style.color, whiteSpace: 'nowrap' }}>
                      {q.score}/100 · {style.label}
                    </span>
                  </div>

                  <p style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: TEXT, lineHeight: 1.6, marginBottom: 12 }}>
                    <CodeText text={q.question} />
                  </p>

                  {/* Candidate's submitted answer */}
                  {turn?.answer && (
                    <div style={{
                      margin: '12px 0',
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: 'color-mix(in srgb, var(--fg) 3%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
                    }}>
                      <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--accent-text)', textTransform: 'uppercase', marginBottom: 4 }}>
                        Your Submitted Answer
                      </div>
                      <p style={{ fontSize: 'var(--fs-sm)', color: TEXT, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                        {turn.answer}
                      </p>
                    </div>
                  )}

                  {/* What was good */}
                  {q.what_was_good && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                      <CheckCircle size={14} color={GREEN} style={{ flexShrink: 0, marginTop: 3 }} />
                      <p style={{ fontSize: 'var(--fs-sm)', color: TEXT, lineHeight: 1.6, margin: 0 }}>
                        <strong style={{ color: GREEN }}>What worked:</strong> <CodeText text={q.what_was_good} />
                      </p>
                    </div>
                  )}

                  {/* What was missing. Practice only: on a job interview
                      this is the recruiter's answer key in all but name,
                      and the same question is reused for every
                      candidate. */}
                  {q.what_was_missing && !isJobInterview && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                      <XCircle size={14} color={AMBER} style={{ flexShrink: 0, marginTop: 3 }} />
                      <p style={{ fontSize: 'var(--fs-sm)', color: TEXT, lineHeight: 1.6, margin: 0 }}>
                        <strong style={{ color: AMBER }}>What was missing:</strong> <CodeText text={q.what_was_missing} />
                      </p>
                    </div>
                  )}

                  {/* Why this score - the knowledge-base passages this
                      answer was graded against. Interviews graded before
                      this existed have no references and show nothing. */}
                  {q.references?.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => toggleSources(q.question_number)}
                        aria-expanded={expandedSources.has(q.question_number)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: 'none', border: 'none', padding: 0,
                          color: ACCENT_LIGHT, fontSize: 'var(--fs-sm)', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        <BookOpen size={14} />
                        Why this score?
                        {expandedSources.has(q.question_number)
                          ? <ChevronUp size={14} />
                          : <ChevronDown size={14} />}
                      </button>

                      {expandedSources.has(q.question_number) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                          <p style={{ fontSize: 'var(--fs-xs)', color: MUTED, margin: 0, lineHeight: 1.5 }}>
                            Your answer was graded against these passages from the
                            interview guides, not the AI's own memory.
                          </p>
                          {/* Passages the grader relied on come first. The
                              rest were retrieved but not used, and are
                              dimmed so a loosely related match is not
                              mistaken for the reason behind the score. */}
                          {[...q.references]
                            .sort((a, b) => Number(b.used) - Number(a.used))
                            .map((ref, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: '10px 14px',
                                borderRadius: 8,
                                background: 'color-mix(in srgb, var(--fg) 3%, transparent)',
                                border: `1px solid ${ref.used ? ACCENT : BORDER_COLOR}`,
                                opacity: ref.used ? 1 : 0.55,
                              }}
                            >
                              <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                gap: 8, flexWrap: 'wrap', marginBottom: 6,
                              }}>
                                <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: ACCENT_LIGHT }}>
                                  <FileText size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                                  {ref.source}{ref.section ? ` › ${ref.section}` : ''}
                                </span>
                                <span style={{
                                  fontSize: 'var(--fs-xs)', fontWeight: 700,
                                  color: ref.used ? ACCENT : MUTED,
                                }}>
                                  {ref.used ? 'Used for this score' : 'Retrieved, not used'}
                                </span>
                              </div>
                              <p style={{
                                fontSize: 'var(--fs-xs)', color: MUTED, lineHeight: 1.6,
                                margin: 0, whiteSpace: 'pre-wrap',
                              }}>
                                {ref.excerpt}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
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
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <TrendingUp size={18} color={GREEN} />
          <span style={{ fontWeight: 700, fontSize: 'var(--fs-base)', color: GREEN }}>Your Overall Progress</span>
        </div>
        <InterviewProgress compact />
      </div>

      {/* Actions */}
      <div className="no-print" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          className="btn btn-outline"
          style={{ flex: 1, minWidth: 160, justifyContent: 'center', padding: '12px' }}
          onClick={() => navigate('/dashboard')}
        >
          {/* Named as the navbar names it, with a back arrow rather than
              the "retry" arrow it had. */}
          <ArrowLeft size={15} /> Back to Dashboard
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
