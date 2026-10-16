import React, { useState, useEffect } from 'react';
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
import { PREDEFINED_JOB_FIELDS, getJobFieldName } from '../constants/jobFields';

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

  // Fetch skill gap analysis on mount or when career field changes
  useEffect(() => {
    if (!resumeText || resumeText.trim().length < 20) {
      // If no resume found in session
      return;
    }
    runSkillGapAnalysis(currentField);
  }, [currentField]);

  const runSkillGapAnalysis = async (fieldId) => {
    setLoading(true);
    setError('');
    try {
      const data = await skillGapAPI.analyze(resumeId, fieldId, resumeText);
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
      console.error('Skill gap analysis error:', err);
      setError(
        err.message ||
          'Could not calculate skill gap analysis. Please ensure the backend and AI service are running, then retry.'
      );
    } finally {
      setLoading(false);
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

  // Status badge description based on backend match percentage
  const getMatchTier = (pct) => {
    if (pct >= 70) return { label: 'Strong Alignment', color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 12%, transparent)' };
    if (pct >= 45) return { label: 'Moderate Match', color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 12%, transparent)' };
    return { label: 'Growth Opportunity', color: 'var(--accent)', bg: 'color-mix(in srgb, var(--accent) 12%, transparent)' };
  };

  const matchTier = getMatchTier(matchPct);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px 80px' }} className="animate-fade-in">
      <StepBar current={2} />

      {/* Header */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent) 28%, transparent)',
          borderRadius: 20,
          padding: '5px 16px',
          marginBottom: 12,
          fontSize: 'var(--fs-xs)',
          color: 'var(--accent)',
          fontWeight: 600,
        }}>
          <Compass size={14} color="var(--accent)" /> Selected Target Career Path
        </div>
        <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Skill Gap Analysis
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-base)', maxWidth: 620, margin: '0 auto', lineHeight: 1.6 }}>
          Evaluating your profile against canonical requirements for{' '}
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{currentFieldName}</span>.
        </p>
      </div>

      {/* Career Path Switcher Bar */}
      <div
        className="card"
        style={{
          background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)',
          border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
          borderRadius: 16,
          padding: '16px 22px',
          marginBottom: 24,
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
            padding: 22,
            marginBottom: 24,
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
          padding: 28,
          textAlign: 'center',
          marginBottom: 24,
        }}>
          <FileText size={36} color="var(--warning)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            No Resume Found
          </h3>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 20 }}>
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
        <div style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          background: 'color-mix(in srgb, var(--danger) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 24,
        }}>
          <AlertCircle size={18} color="var(--danger)" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--danger)', margin: 0, flex: 1 }}>{error}</p>
          <button
            className="btn btn-outline"
            onClick={() => runSkillGapAnalysis(currentField)}
            style={{ fontSize: 'var(--fs-xs)', padding: '6px 14px' }}
          >
            Retry
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
          marginBottom: 24,
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
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

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
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: 20,
          }}>

            {/* 2A. Matched Skills (Exact) */}
            <div
              className="card"
              style={{
                background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)',
                border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
                borderTop: '3px solid var(--success)',
                borderRadius: 16,
                padding: 22,
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
                padding: 22,
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
                padding: 22,
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
                padding: 22,
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
                padding: 26,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
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
