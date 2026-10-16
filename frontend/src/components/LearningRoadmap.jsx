import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Target,
  Award,
  Zap,
  BookOpen,
  Filter,
  CheckSquare,
  ListTodo,
  ExternalLink,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { roadmapAPI } from '../services/api';

const ACCENT = 'var(--accent)';
const ACCENT_LIGHT = 'var(--accent)';
const TEXT = 'var(--text-primary)';
const MUTED = 'var(--text-muted)';
const TRACK = 'color-mix(in srgb, var(--fg) 8%, transparent)';
const CARD_BG = 'color-mix(in srgb, var(--bg-surface) 75%, transparent)';
const BORDER_COLOR = 'color-mix(in srgb, var(--fg) 8%, transparent)';

const GREEN = 'var(--success)';
const BLUE = 'var(--accent)';
const AMBER = 'var(--warning)';
const PURPLE = 'var(--accent)';
const CYAN = 'var(--accent)';
const ROSE = 'var(--danger)';

const PHASE_COLORS = {
  1: BLUE,
  2: PURPLE,
  3: CYAN,
  4: GREEN,
};

export default function LearningRoadmap({
  sessionId,
  sessionResult,
  initialRoadmap = null,
  onProgressUpdate,
}) {
  const [roadmap, setRoadmap] = useState(initialRoadmap);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [completedDays, setCompletedDays] = useState(new Set());
  const [activePhase, setActivePhase] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'completed'
  const [expandedDays, setExpandedDays] = useState(new Set([1, 2])); // expand first 2 by default
  const [updatingDay, setUpdatingDay] = useState(null);

  // Sync state if initialRoadmap is supplied
  useEffect(() => {
    if (initialRoadmap) {
      setRoadmap(initialRoadmap);
      if (initialRoadmap.completed_days) {
        setCompletedDays(new Set(initialRoadmap.completed_days));
      }
    }
  }, [initialRoadmap]);

  // Load existing roadmap for this session
  useEffect(() => {
    if (!sessionId || initialRoadmap) return;

    let cancelled = false;
    setLoading(true);
    roadmapAPI
      .getBySessionId(sessionId)
      .then((data) => {
        if (!cancelled && data) {
          setRoadmap(data);
          if (data.completed_days) {
            setCompletedDays(new Set(data.completed_days));
          }
        }
      })
      .catch((err) => {
        // A 404 simply means no roadmap generated yet for this session
        console.log('[LearningRoadmap] No saved roadmap yet for session:', sessionId);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, initialRoadmap]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');

    try {
      const improvements = sessionResult?.improvements || [];
      const strengths = sessionResult?.strengths || [];
      const perQuestion = sessionResult?.per_question || [];
      const score = sessionResult?.overall_score ?? null;

      const payload = {
        session_id: sessionId || '',
        target_role: sessionResult?.target_role || 'Software Engineer',
        job_field: sessionResult?.job_field || '',
        candidate_resume: sessionResult?.candidate_resume || '',
        weaknesses: improvements,
        strengths: strengths,
        missing_skills: [],
        per_question_feedback: perQuestion.map((q) => ({
          question: q.question,
          score: q.score,
          what_was_missing: q.what_was_missing || '',
        })),
        overall_score: score,
        duration_days: 14,
      };

      const data = await roadmapAPI.generate(payload);
      setRoadmap(data);
      if (data.completed_days) {
        setCompletedDays(new Set(data.completed_days));
      }
      setExpandedDays(new Set([1, 2, 3]));
      if (onProgressUpdate) onProgressUpdate(data);
    } catch (err) {
      console.error('[LearningRoadmap] Generation failed:', err);
      setError(err.message || 'Failed to generate 14-day roadmap.');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleDay = async (dayNumber) => {
    if (!roadmap?.id) return;
    const isCompleted = completedDays.has(dayNumber);
    const newCompleted = !isCompleted;

    // Optimistic UI update
    setCompletedDays((prev) => {
      const next = new Set(prev);
      if (newCompleted) next.add(dayNumber);
      else next.delete(dayNumber);
      return next;
    });

    setUpdatingDay(dayNumber);
    try {
      const updated = await roadmapAPI.updateProgress(roadmap.id, dayNumber, newCompleted);
      if (updated?.completed_days) {
        setCompletedDays(new Set(updated.completed_days));
      }
      if (onProgressUpdate) onProgressUpdate(updated);
    } catch (err) {
      console.error('[LearningRoadmap] Progress update failed:', err);
      // Revert optimistic update
      setCompletedDays((prev) => {
        const next = new Set(prev);
        if (isCompleted) next.add(dayNumber);
        else next.delete(dayNumber);
        return next;
      });
    } finally {
      setUpdatingDay(null);
    }
  };

  const toggleExpand = (dayNumber) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayNumber)) next.delete(dayNumber);
      else next.add(dayNumber);
      return next;
    });
  };

  const toggleAllExpanded = (shouldExpand) => {
    if (shouldExpand) {
      const allDays = new Set((roadmapData?.days || []).map((d) => d.day));
      setExpandedDays(allDays);
    } else {
      setExpandedDays(new Set());
    }
  };

  // Helper to extract days and milestones from parsed JSON or direct fields
  const roadmapData = roadmap?.roadmap || roadmap;
  const daysList = roadmapData?.days || [];
  const milestonesList = roadmapData?.milestones || [];
  const focusAreas = roadmapData?.focus_areas || [];
  const durationDays = roadmap?.duration_days || roadmapData?.duration_days || 14;

  const totalCompleted = completedDays.size;
  const progressPercent = Math.round((totalCompleted / durationDays) * 100) || 0;

  // Filter days based on phase and completion status
  const filteredDays = daysList.filter((day) => {
    const isCompleted = completedDays.has(day.day);
    if (statusFilter === 'pending' && isCompleted) return false;
    if (statusFilter === 'completed' && !isCompleted) return false;

    if (activePhase === 'all') return true;
    if (activePhase === '1' && day.day >= 1 && day.day <= 4) return true;
    if (activePhase === '2' && day.day >= 5 && day.day <= 7) return true;
    if (activePhase === '3' && day.day >= 8 && day.day <= 11) return true;
    if (activePhase === '4' && day.day >= 12 && day.day <= 14) return true;
    return true;
  });

  if (loading) {
    return (
      <div
        className="card"
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER_COLOR}`,
          padding: 32,
          textAlign: 'center',
          borderRadius: 16,
        }}
      >
        <Loader2
          size={32}
          color={ACCENT}
          style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}
        />
        <p style={{ color: TEXT, fontSize: 'var(--fs-base)', fontWeight: 500 }}>
          Loading your personalized 14-day roadmap…
        </p>
      </div>
    );
  }

  // Not generated yet state
  if (!roadmap) {
    return (
      <div
        className="card"
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER_COLOR}`,
          borderTop: `3px solid ${CYAN}`,
          padding: 32,
          borderRadius: 16,
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: `transparent`,
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
              border: `1px solid color-mix(in srgb, var(--accent) 30%, transparent)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Calendar size={24} color={CYAN} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 'var(--fs-xs)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: CYAN,
                }}
              >
                {/* Was "Sprint 1 Milestone" with a "14-Day Roadmap Live"
                    badge: the team's own planning words, which mean
                    nothing to a candidate. */}
                Your next step
              </span>
            </div>
            <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: TEXT, marginBottom: 6 }}>
              Personalized 14-Day Upskilling Roadmap
            </h3>
            <p style={{ color: MUTED, fontSize: 'var(--fs-sm)', lineHeight: 1.6, maxWidth: 600 }}>
              Turn your interview weaknesses into concrete strengths. Generate a targeted,
              day-by-day learning schedule tailored specifically to the concepts you missed during
              this session.
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
              border: `1px solid ${ROSE}`,
              color: ROSE,
              fontSize: 'var(--fs-sm)',
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generating}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 24px',
            fontSize: 'var(--fs-sm)',
            fontWeight: 600,
            background: `linear-gradient(var(--accent-solid), var(--accent-solid))`,
            color: 'var(--shadow-ink)',
            border: 'none',
            borderRadius: 8,
            cursor: generating ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px color-mix(in srgb, var(--accent) 25%, transparent)',
          }}
        >
          {generating ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Synthesizing 14-Day Curriculum…
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate My 14-Day Roadmap
            </>
          )}
        </button>
      </div>
    );
  }

  // Active Roadmap View
  return (
    <div
      className="card"
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER_COLOR}`,
        borderTop: `3px solid ${CYAN}`,
        borderRadius: 16,
        padding: '28px 24px',
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow decoration */}
      <div
        style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: `transparent`,
          pointerEvents: 'none',
        }}
      />

      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                border: `1px solid color-mix(in srgb, var(--accent) 30%, transparent)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={18} color={CYAN} />
            </div>
            <div>
              <span
                style={{
                  fontSize: 'var(--fs-xs)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: CYAN,
                }}
              >
                Personalized Upskilling Plan
              </span>
              <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: TEXT, margin: 0 }}>
                {roadmap.title || '14-Day Accelerated Upskilling Roadmap'}
              </h2>
            </div>
          </div>
          <p style={{ color: MUTED, fontSize: 'var(--fs-sm)', lineHeight: 1.5, maxWidth: 620, marginTop: 4 }}>
            {roadmap.summary}
          </p>
        </div>

        {/* Regenerate button */}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn btn-outline"
          title="Regenerate roadmap"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            fontSize: 'var(--fs-xs)',
            borderColor: TRACK,
            color: TEXT,
            borderRadius: 8,
          }}
        >
          <RotateCcw
            size={13}
            style={generating ? { animation: 'spin 1s linear infinite' } : {}}
          />
          {generating ? 'Regenerating…' : 'Regenerate'}
        </button>
      </div>

      {/* Progress & Milestone Overview */}
      <div
        style={{
          background: 'color-mix(in srgb, var(--bg-surface) 60%, transparent)',
          border: `1px solid ${TRACK}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={16} color={GREEN} />
            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: TEXT }}>
              Overall Roadmap Progress
            </span>
          </div>
          <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: progressPercent === 100 ? GREEN : CYAN }}>
            {totalCompleted} of {durationDays} Days Completed ({progressPercent}%)
          </span>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            height: 8,
            background: 'var(--border)',
            borderRadius: 4,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: 4,
              background: `linear-gradient(${CYAN}, ${CYAN})`,
              width: `${progressPercent}%`,
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Milestones cards */}
        {milestonesList.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 10,
              marginTop: 16,
            }}
          >
            {milestonesList.map((m) => {
              const pColor = PHASE_COLORS[m.phase] || CYAN;
              const isPhaseActive = activePhase === String(m.phase);
              return (
                <div
                  key={m.phase}
                  onClick={() => setActivePhase(isPhaseActive ? 'all' : String(m.phase))}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: isPhaseActive ? `color-mix(in srgb, ${pColor} 10%, transparent)` : 'color-mix(in srgb, var(--bg-surface) 40%, transparent)',
                    border: `1px solid ${isPhaseActive ? pColor : 'var(--border-strong)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'var(--fs-xs)',
                        fontWeight: 700,
                        color: pColor,
                        textTransform: 'uppercase',
                      }}
                    >
                      Phase {m.phase}
                    </span>
                    <span style={{ fontSize: 'var(--fs-xs)', color: MUTED }}>{m.day_range}</span>
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--fs-xs)',
                      fontWeight: 600,
                      color: TEXT,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={m.title}
                  >
                    {m.title}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Focus Area Tags */}
      {focusAreas.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          <span style={{ fontSize: 'var(--fs-xs)', color: MUTED, fontWeight: 600 }}>KEY FOCUS AREAS:</span>
          {focusAreas.map((fa, i) => (
            <span
              key={i}
              style={{
                fontSize: 'var(--fs-xs)',
                padding: '3px 10px',
                borderRadius: 12,
                background: 'color-mix(in srgb, var(--warning) 10%, transparent)',
                border: `1px solid color-mix(in srgb, var(--warning) 25%, transparent)`,
                color: 'var(--accent-text)',
                fontWeight: 500,
              }}
            >
              {fa}
            </span>
          ))}
        </div>
      )}

      {/* Filter and control actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: `1px solid ${BORDER_COLOR}`,
        }}
      >
        {/* Phase tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setActivePhase('all')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 'var(--fs-xs)',
              fontWeight: 600,
              border: `1px solid ${activePhase === 'all' ? CYAN : 'var(--border-strong)'}`,
              background: activePhase === 'all' ? `color-mix(in srgb, ${CYAN} 13%, transparent)` : 'transparent',
              color: activePhase === 'all' ? CYAN : MUTED,
              cursor: 'pointer',
            }}
          >
            All Days ({daysList.length})
          </button>
          {[1, 2, 3, 4].map((pNum) => (
            <button
              key={pNum}
              onClick={() => setActivePhase(String(pNum))}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 'var(--fs-xs)',
                fontWeight: 600,
                border: `1px solid ${activePhase === String(pNum) ? PHASE_COLORS[pNum] : 'var(--border-strong)'}`,
                background: activePhase === String(pNum) ? `${PHASE_COLORS[pNum]}22` : 'transparent',
                color: activePhase === String(pNum) ? PHASE_COLORS[pNum] : MUTED,
                cursor: 'pointer',
              }}
            >
              Phase {pNum}
            </button>
          ))}
        </div>

        {/* View toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: 'var(--bg-surface)',
              color: TEXT,
              border: `1px solid ${TRACK}`,
              borderRadius: 6,
              padding: '5px 10px',
              fontSize: 'var(--fs-xs)',
              cursor: 'pointer',
            }}
          >
            <option value="all">Status: All</option>
            <option value="pending">Status: Incomplete</option>
            <option value="completed">Status: Completed</option>
          </select>

          {/* Expand/Collapse */}
          <button
            onClick={() => toggleAllExpanded(expandedDays.size !== daysList.length)}
            style={{
              background: 'transparent',
              border: 'none',
              color: MUTED,
              fontSize: 'var(--fs-xs)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {expandedDays.size === daysList.length ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      {/* Days list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredDays.map((day) => {
          const isDone = completedDays.has(day.day);
          const isExpanded = expandedDays.has(day.day);
          const phaseNum =
            day.day <= 4 ? 1 : day.day <= 7 ? 2 : day.day <= 11 ? 3 : 4;
          const phaseColor = PHASE_COLORS[phaseNum] || CYAN;

          return (
            <div
              key={day.day}
              style={{
                borderRadius: 12,
                border: `1px solid ${isDone ? 'color-mix(in srgb, var(--success) 30%, transparent)' : BORDER_COLOR}`,
                background: isDone ? 'color-mix(in srgb, var(--success) 4%, transparent)' : 'var(--bg-surface)',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Day Header Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => toggleExpand(day.day)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                  {/* Completion Checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleDay(day.day);
                    }}
                    title={isDone ? 'Mark as incomplete' : 'Mark day completed'}
                    disabled={updatingDay === day.day}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      color: isDone ? GREEN : MUTED,
                    }}
                  >
                    {isDone ? (
                      <CheckCircle2 size={22} color={GREEN} />
                    ) : (
                      <Circle size={22} color={MUTED} />
                    )}
                  </button>

                  {/* Day label badge */}
                  <span
                    style={{
                      fontSize: 'var(--fs-xs)',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: `color-mix(in srgb, ${phaseColor} 12%, transparent)`,
                      color: phaseColor,
                      border: `1px solid color-mix(in srgb, ${phaseColor} 25%, transparent)`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Day {day.day < 10 ? `0${day.day}` : day.day}
                  </span>

                  {/* Title & Topic */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 'var(--fs-sm)',
                        fontWeight: 600,
                        color: isDone ? MUTED : TEXT,
                        textDecoration: isDone ? 'line-through' : 'none',
                      }}
                    >
                      {day.title}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginTop: 2,
                      }}
                    >
                      <span style={{ fontSize: 'var(--fs-xs)', color: MUTED }}>{day.focus_area}</span>
                      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>•</span>
                      <span style={{ fontSize: 'var(--fs-xs)', color: phaseColor }}>{day.phase}</span>
                    </div>
                  </div>
                </div>

                {/* Right meta info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 'var(--fs-xs)',
                      color: MUTED,
                    }}
                  >
                    <Clock size={13} />
                    <span>{day.estimated_hours || 2}h</span>
                  </div>

                  <div style={{ color: MUTED }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </div>

              {/* Expanded Details Body */}
              {isExpanded && (
                <div
                  style={{
                    padding: '14px 18px 18px 54px',
                    borderTop: `1px solid ${BORDER_COLOR}`,
                    background: 'color-mix(in srgb, var(--bg-surface) 40%, transparent)',
                  }}
                >
                  {/* Objective */}
                  {day.objective && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        marginBottom: 14,
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: 'color-mix(in srgb, var(--bg-surface) 50%, transparent)',
                        borderLeft: `3px solid ${phaseColor}`,
                      }}
                    >
                      <Target size={15} color={phaseColor} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: phaseColor, textTransform: 'uppercase' }}>
                          Day Objective
                        </div>
                        <div style={{ fontSize: 'var(--fs-sm)', color: TEXT, lineHeight: 1.5 }}>
                          {day.objective}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tasks */}
                  {day.tasks && day.tasks.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 'var(--fs-xs)',
                          fontWeight: 700,
                          color: CYAN,
                          marginBottom: 8,
                          textTransform: 'uppercase',
                        }}
                      >
                        <ListTodo size={14} />
                        Actionable Practice Tasks
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {day.tasks.map((task, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 10,
                              fontSize: 'var(--fs-sm)',
                              color: TEXT,
                              lineHeight: 1.5,
                            }}
                          >
                            <span
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                                color: CYAN,
                                fontSize: 'var(--fs-xs)',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                marginTop: 2,
                              }}
                            >
                              {idx + 1}
                            </span>
                            <span>{task}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resources */}
                  {day.resources && day.resources.length > 0 && (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 'var(--fs-xs)',
                          fontWeight: 700,
                          color: PURPLE,
                          marginBottom: 8,
                          textTransform: 'uppercase',
                        }}
                      >
                        <BookOpen size={14} />
                        Recommended Study Resources
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {day.resources.map((res, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              fontSize: 'var(--fs-xs)',
                              color: MUTED,
                            }}
                          >
                            <ExternalLink size={12} color={PURPLE} />
                            <span>{res}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
