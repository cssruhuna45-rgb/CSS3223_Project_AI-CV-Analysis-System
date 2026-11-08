import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Target,
  CheckCircle,
  XCircle,
  Sparkles,
  BookOpen,
  ChevronRight,
  AlertCircle,
  Loader,
  RotateCcw,
  Briefcase,
  FileText,
  Compass,
  ArrowRight,
  Layers,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { skillGapAPI } from '../services/api';
import StepBar from '../components/StepBar';
import { PageHeader } from '../components/ui';
import { PREDEFINED_JOB_FIELDS, getJobFieldName } from '../constants/jobFields';
import { userMessage } from '../services/http';

// Map candidate skills to their target required canonical concept for clear display
const RELATED_SKILL_MAP = {
  terraform: 'Infrastructure as Code',
  ansible: 'Infrastructure as Code',
  cloudformation: 'Infrastructure as Code',
  pulumi: 'Infrastructure as Code',
  docker: 'Containerization',
  podman: 'Containerization',
  containerd: 'Containerization',
  'github actions': 'CI/CD',
  'gitlab ci': 'CI/CD',
  jenkins: 'CI/CD',
  circleci: 'CI/CD',
  argocd: 'CI/CD',
  prometheus: 'Monitoring',
  grafana: 'Monitoring',
  datadog: 'Monitoring',
  elk: 'Logging',
  splunk: 'Logging',
  fluentd: 'Logging',
  loki: 'Logging',
  selenium: 'Test Automation',
  playwright: 'Test Automation',
  cypress: 'Test Automation',
  jest: 'Unit Testing',
  pytest: 'Unit Testing',
  junit: 'Unit Testing',
  mocha: 'Unit Testing',
};

export default function SkillGap() {
  const navigate = useNavigate();

  // Retrieve state from sessionStorage
  const resumeId = sessionStorage.getItem('resumeId') || '1';
  const resumeText = sessionStorage.getItem('resumeText') || '';
  const storedJobField = sessionStorage.getItem('selectedJobField') || 'software_engineering';
  const storedJobFieldName = sessionStorage.getItem('selectedJobFieldName') || getJobFieldName(storedJobField);

  const [currentField, setCurrentField] = useState(storedJobField);
  const [currentFieldName, setCurrentFieldName] = useState(storedJobFieldName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [showFieldSelector, setShowFieldSelector] = useState(false);

  // The field the newest request was made for. Two analyses of
  // different fields can be in flight at once - picking a second field
  // does not cancel the first - and they can finish in either order.
  // Without this, a slow earlier response arriving last would write its
  // own field into the page and into sessionStorage, so the candidate
  // would be shown one role's gaps under another role's name and then
  // carry the wrong jobRole into the interview. A response is only
  // allowed to write if its field is still the one being asked about.
  const latestField = useRef(null);

  // Fetch skill gap analysis on mount or when career field changes
  useEffect(() => {
    if (!resumeText || resumeText.trim().length < 20) {
      // If no resume found in session
      return;
    }
    runSkillGapAnalysis(currentField);
  }, [currentField]);

  const runSkillGapAnalysis = async (fieldId) => {
    latestField.current = fieldId;
    setLoading(true);
    setError('');
    try {
      const data = await skillGapAPI.analyze(resumeId, fieldId, resumeText);

      if (latestField.current !== fieldId) return;

      setResult(data);
      sessionStorage.setItem('skillGapResult', JSON.stringify(data));
      sessionStorage.setItem('selectedJobField', fieldId);
      const name = data.job_field_name || getJobFieldName(fieldId);
      setCurrentFieldName(name);
      sessionStorage.setItem('selectedJobFieldName', name);
      sessionStorage.setItem('jobRole', name);
      sessionStorage.setItem(
        'jobDescription',
        `I am interviewing for a ${name} position. Please evaluate my technical competence and ask relevant interview questions suited for this role.`
      );
    } catch (err) {
      if (latestField.current !== fieldId) return;

      console.error('Skill gap analysis error:', err);
      setError(userMessage(err, "We couldn't compare your CV with this job field right now. Please try again."));
    } finally {
      // A superseded request must not clear the spinner: the newer one
      // is still running and the page is still waiting for it.
      if (latestField.current === fieldId) setLoading(false);
    }
  };

  const handleSelectDifferentField = (fieldId) => {
    setCurrentField(fieldId);
    setCurrentFieldName(getJobFieldName(fieldId));
    setShowFieldSelector(false);
  };

  const handleStartInterview = () => {
    navigate('/interview');
  };

  // Values strictly from backend API response
  const matchPct = result?.match_percentage ?? 0;
  const gapPct = result?.gap_percentage ?? (result ? 100 - matchPct : 0);

  // The badge has to agree with the words underneath it. The AI
  // service bands the same percentage in `analyze_skill_gap`
  // (ai-service/app/skill_gap/analyzer.py) and writes the band into
  // the summary it returns, so a cut-off invented here would print
  // "Strong Alignment" above a summary that reads "a moderate skill
  // match". These four tiers are that function's four levels -
  // strong, moderate, developing, limited - and the thresholds must
  // be changed in both places or neither.
  const getMatchTier = (pct) => {
    if (pct >= 80) return { label: 'Strong Alignment', color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 12%, transparent)' };
    if (pct >= 60) return { label: 'Moderate Match', color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 12%, transparent)' };
    if (pct >= 40) return { label: 'Developing Match', color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 12%, transparent)' };
    return { label: 'Growth Opportunity', color: 'var(--accent)', bg: 'color-mix(in srgb, var(--accent) 12%, transparent)' };
  };

  const matchTier = getMatchTier(matchPct);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 0 var(--space-5)' }} className="workspace-page workspace-page--skills animate-fade-in">
      <StepBar current={2} />

      {/* Header */}
      <PageHeader icon={<Compass size={20} />} title="Skill Gap Analysis" subtitle={<>See how your CV skills align with <strong>{currentFieldName}</strong>, then choose what to practise next.</>} />

      {/* Career Path Switcher Bar */}
      <div
        className="card"
        style={{
          background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)',
          border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
          borderRadius: 16,
          padding: '16px 22px',
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Briefcase size={18} color="var(--accent)" />
          </div>
          <div>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Target Career Track</span>
            <span style={{ fontSize: 'var(--fs-base)', fontWeight: 800, color: 'var(--text-primary)' }}>{currentFieldName}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-outline"
            onClick={() => setShowFieldSelector(!showFieldSelector)}
            style={{ fontSize: 'var(--fs-sm)', padding: '8px 16px' }}
          >
            <Compass size={14} /> {showFieldSelector ? 'Close Selector' : 'Change Career Field'}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => runSkillGapAnalysis(currentField)}
            disabled={loading}
            style={{ fontSize: 'var(--fs-sm)', padding: '8px 14px' }}
            title="Refresh Analysis"
          >
            <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Collapsible Predefined Field Selector */}
      {showFieldSelector && (
        <div
          className="card animate-fade-in"
          style={{
            background: 'color-mix(in srgb, var(--bg-surface) 95%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            boxShadow: '0 12px 32px color-mix(in srgb, var(--shadow-ink) 60%, transparent)',
          }}
        >
          <h4 style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--accent)', marginBottom: 14 }}>
            Select a Predefined Career Field to Analyze:
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 8,
            marginBottom: 12,
          }}>
            {PREDEFINED_JOB_FIELDS.map((f) => {
              const isSelected = f.id === currentField;
              return (
                <button
                  key={f.id}
                  onClick={() => handleSelectDifferentField(f.id)}
                  style={{
                    padding: '11px 16px',
                    borderRadius: 10,
                    border: isSelected ? '1px solid color-mix(in srgb, var(--accent) 60%, transparent)' : '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
                    background: isSelected ? 'linear-gradient(color-mix(in srgb, var(--accent) 25%, transparent), color-mix(in srgb, var(--accent) 25%, transparent))' : 'color-mix(in srgb, var(--fg) 3%, transparent)',
                    color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 'var(--fs-sm)',
                    fontWeight: isSelected ? 700 : 500,
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isSelected ? '0 0 15px color-mix(in srgb, var(--accent) 20%, transparent)' : 'none',
                  }}
                >
                  {f.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No Resume Uploaded Warning */}
      {(!resumeText || resumeText.trim().length < 20) && (
        <div style={{
          background: 'color-mix(in srgb, var(--warning) 6%, transparent)',
          border: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
          borderRadius: 16,
          padding: 20,
          textAlign: 'center',
          marginBottom: 16,
        }}>
          <FileText size={36} color="var(--warning)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            No Resume Found
          </h3>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Please upload your resume first so our AI can perform the skill gap comparison.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/upload')}
            style={{ padding: '11px 26px' }}
          >
            Upload Resume <ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div role="alert" style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          background: 'color-mix(in srgb, var(--danger) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 16,
        }}>
          <AlertCircle size={18} color="var(--danger)" style={{ flexShrink: 0 }} aria-hidden="true" />
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--danger)', margin: 0, flex: 1 }}>
            <span className="sr-only">Error: </span>{error}
          </p>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => runSkillGapAnalysis(currentField)}
            style={{ fontSize: 'var(--fs-xs)', padding: '6px 14px' }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '64px 20px',
          background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)',
          borderRadius: 20,
          border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
          marginBottom: 16,
        }}>
          <Loader size={42} color="var(--accent-cyan)" className="animate-spin" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Calculating your skill gap...
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)' }}>
            Evaluating exact matches, related skills, and areas for development.
          </p>
        </div>
      )}

      {/* ── ANALYSIS RESULTS DASHBOARD ── */}
      {result && !loading && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 1. Visually Strong Overview Card (Match vs Gap) */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(color-mix(in srgb, var(--bg-surface) 85%, transparent), color-mix(in srgb, var(--bg-surface) 85%, transparent))',
              border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              borderRadius: 22,
              padding: '36px 24px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'none',
            }}
          >
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'transparent',
              pointerEvents: 'none',
            }} />

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 'var(--fs-xs)',
              fontWeight: 700,
              color: 'var(--accent-cyan)',
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              marginBottom: 18,
            }}>
              <TrendingUp size={15} /> Profile Match Score
            </div>

            {/* Circular Progress Gauge */}
            <div style={{ position: 'relative', width: 170, height: 170, margin: '0 auto 20px' }}>
              <svg width="170" height="170" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx="85"
                  cy="85"
                  r="70"
                  fill="none"
                  stroke="color-mix(in srgb, var(--fg) 8%, transparent)"
                  strokeWidth="12"
                />
                <circle
                  cx="85"
                  cy="85"
                  r="70"
                  fill="none"
                  stroke={matchPct >= 75 ? 'var(--success)' : matchPct >= 50 ? 'var(--accent)' : 'var(--warning)'}
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - matchPct / 100)}`}
                  strokeLinecap="round"
                  style={{
                    transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    filter: matchPct >= 75 ? 'drop-shadow(0 0 10px color-mix(in srgb, var(--success) 50%, transparent))' : 'drop-shadow(0 0 10px color-mix(in srgb, var(--accent) 50%, transparent))'
                  }}
                />
              </svg>
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{ fontSize: 44, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {matchPct}<small style={{ fontSize: 'var(--fs-xl)', color: 'var(--accent-cyan)' }}>%</small>
                </span>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: 4, letterSpacing: '0.5px' }}>
                  Skill Match
                </span>
              </div>
            </div>

            {/* Match & Gap Stat Pills */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{
                background: 'color-mix(in srgb, var(--success) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)',
                padding: '7px 18px',
                borderRadius: 24,
                fontSize: 'var(--fs-sm)',
                fontWeight: 600,
                color: 'var(--success)',
              }}>
                Match: {matchPct}%
              </div>
              <div style={{
                background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--warning) 35%, transparent)',
                padding: '7px 18px',
                borderRadius: 24,
                fontSize: 'var(--fs-sm)',
                fontWeight: 600,
                color: 'var(--warning)',
              }}>
                Gap: {gapPct}%
              </div>
            </div>

            {/* Backend-Generated Summary */}
            {result.summary && (
              <div style={{
                maxWidth: 660,
                margin: '0 auto',
                background: 'color-mix(in srgb, var(--fg) 3%, transparent)',
                border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
                borderRadius: 14,
                padding: '16px 20px',
              }}>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
                  {result.summary}
                </p>
              </div>
            )}
          </div>

          {/* 2. Skill Categories Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
            gap: 16,
          }}>

            {/* 2A. Matched Skills (Exact) */}
            <div
              className="card"
              style={{
                background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)',
                border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
                borderTop: '3px solid var(--success)',
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={18} color="var(--success)" />
                  <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--success)', margin: 0 }}>Matched Skills</h3>
                </div>
                <span className="badge badge-green" style={{ fontSize: 'var(--fs-xs)', padding: '3px 10px' }}>
                  {result.matched_skills?.length || 0} Matched
                </span>
              </div>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 14 }}>
                Skills demonstrated on your resume that directly fulfill required competencies.
              </p>
              {result.matched_skills && result.matched_skills.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {result.matched_skills.map((s, idx) => (
                    <span
                      key={idx}
                      className="badge badge-green"
                      style={{
                        padding: '6px 12px',
                        fontSize: 'var(--fs-sm)',
                        background: 'color-mix(in srgb, var(--success) 12%, transparent)',
                        color: 'var(--success)',
                        borderColor: 'color-mix(in srgb, var(--success) 35%, transparent)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <CheckCircle size={13} color="var(--success)" /> {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                  No exact skill matches identified for this field.
                </p>
              )}
            </div>

            {/* 2B. Related Skills (Clearly separated - NOT exact matches) */}
            <div
              className="card"
              style={{
                background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)',
                border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
                borderTop: '3px solid var(--accent)',
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={18} color="var(--accent)" />
                  <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--accent)', margin: 0 }}>Related Skills</h3>
                </div>
                <span className="badge badge-blue" style={{ fontSize: 'var(--fs-xs)', padding: '3px 10px' }}>
                  {result.related_skills?.length || 0} Adjacent
                </span>
              </div>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 14 }}>
                Adjacent skills that relate to requirements. <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Note:</span> Not counted as exact matches.
              </p>
              {result.related_skills && result.related_skills.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {result.related_skills.map((s, idx) => {
                    const normalized = (s || '').toLowerCase().trim();
                    const targetConcept = RELATED_SKILL_MAP[normalized];
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 20,
                          fontSize: 'var(--fs-sm)',
                          background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                          border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
                          color: 'var(--accent)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{s}</span>
                        {targetConcept && (
                          <>
                            <span style={{ opacity: 0.5 }}>→</span>
                            <span style={{ opacity: 0.85, fontSize: 'var(--fs-xs)' }}>{targetConcept}</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                  No adjacent or related skills found.
                </p>
              )}
            </div>

            {/* 2C. Missing Skills (Skills to Develop) */}
            <div
              className="card"
              style={{
                background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)',
                border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
                borderTop: '3px solid var(--warning)',
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={18} color="var(--warning)" />
                  <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--warning)', margin: 0 }}>Skills to Develop</h3>
                </div>
                <span className="badge badge-yellow" style={{ fontSize: 'var(--fs-xs)', padding: '3px 10px' }}>
                  {result.missing_skills?.length || 0} Missing
                </span>
              </div>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 14 }}>
                Required competencies not directly demonstrated on your resume.
              </p>
              {result.missing_skills && result.missing_skills.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {result.missing_skills.map((s, idx) => (
                    <span
                      key={idx}
                      className="badge badge-yellow"
                      style={{
                        padding: '6px 12px',
                        fontSize: 'var(--fs-sm)',
                        background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
                        color: 'var(--warning)',
                        borderColor: 'color-mix(in srgb, var(--warning) 35%, transparent)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <XCircle size={13} color="var(--warning)" style={{ opacity: 0.9 }} /> {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--success)', fontStyle: 'italic', margin: 0 }}>
                  ✓ All core skills are covered for this job field!
                </p>
              )}
            </div>

            {/* 2D. Additional Skills */}
            <div
              className="card"
              style={{
                background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)',
                border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
                borderTop: '3px solid var(--accent)',
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="var(--accent)" />
                  <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--accent)', margin: 0 }}>Additional Skills</h3>
                </div>
                <span className="badge badge-blue" style={{ fontSize: 'var(--fs-xs)', padding: '3px 10px' }}>
                  {result.additional_skills?.length || 0} Other
                </span>
              </div>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 14 }}>
                Candidate strengths that exceed or extend beyond the required baseline.
              </p>
              {result.additional_skills && result.additional_skills.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {result.additional_skills.map((s, idx) => (
                    <span
                      key={idx}
                      className="badge badge-blue"
                      style={{
                        padding: '6px 12px',
                        fontSize: 'var(--fs-sm)',
                        background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                        color: 'var(--accent)',
                        borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)',
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                  No extra skills outside standard requirements.
                </p>
              )}
            </div>

          </div>

          {/* 3. Recommendations Section */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div
              className="card"
              style={{
                background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)',
                border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
                borderRadius: 18,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <BookOpen size={20} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Recommended Next Steps
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {result.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: 14,
                      alignItems: 'flex-start',
                      padding: '14px 18px',
                      borderRadius: 12,
                      background: 'color-mix(in srgb, var(--fg) 3%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--fg) 6%, transparent)',
                    }}
                  >
                    <div style={{
                      minWidth: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'linear-gradient(var(--accent-solid), var(--accent-solid))',
                      color: 'var(--on-accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'var(--fs-xs)',
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: 1,
                    }}>
                      {idx + 1}
                    </div>
                    <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                      {rec}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Action CTA */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            paddingTop: 12,
          }}>
            <button
              className="btn btn-outline"
              onClick={() => setShowFieldSelector(!showFieldSelector)}
              style={{
                flex: 1,
                minWidth: 200,
                justifyContent: 'center',
                padding: '14px 20px',
                fontSize: 'var(--fs-sm)',
                fontWeight: 600,
              }}
            >
              <Compass size={16} /> Choose Another Career Path
            </button>
            <button
              className="btn btn-primary"
              onClick={handleStartInterview}
              style={{
                flex: 2,
                minWidth: 260,
                justifyContent: 'center',
                padding: '14px 24px',
                fontSize: 'var(--fs-base)',
                fontWeight: 700,
                boxShadow: 'none',
              }}
            >
              <span>Start Mock Interview</span>
              <ArrowRight size={17} />
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
