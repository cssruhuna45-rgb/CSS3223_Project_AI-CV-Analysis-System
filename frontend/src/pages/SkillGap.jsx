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
    if (pct >= 70) return { label: 'Strong Alignment', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' };
    if (pct >= 45) return { label: 'Moderate Match', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' };
    return { label: 'Growth Opportunity', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)' };
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
          background: 'rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(99, 102, 241, 0.28)',
          borderRadius: 20,
          padding: '5px 16px',
          marginBottom: 12,
          fontSize: 12,
          color: '#A5B4FC',
          fontWeight: 600,
        }}>
          <Compass size={14} color="#22D3EE" /> Selected Target Career Path
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
          Skill Gap Analysis
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 620, margin: '0 auto', lineHeight: 1.6 }}>
          Evaluating your profile against canonical requirements for{' '}
          <span style={{ color: '#22D3EE', fontWeight: 700 }}>{currentFieldName}</span>.
        </p>
      </div>

      {/* Career Path Switcher Bar */}
      <div
        className="card"
        style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
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
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Briefcase size={18} color="#818CF8" />
          </div>
          <div>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'block', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Target Career Track</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#F8FAFC' }}>{currentFieldName}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-outline"
            onClick={() => setShowFieldSelector(!showFieldSelector)}
            style={{ fontSize: 13, padding: '8px 16px' }}
          >
            <Compass size={14} /> {showFieldSelector ? 'Close Selector' : 'Change Career Field'}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => runSkillGapAnalysis(currentField)}
            disabled={loading}
            style={{ fontSize: 13, padding: '8px 14px' }}
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
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: 16,
            padding: 22,
            marginBottom: 24,
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
          }}
        >
          <h4 style={{ fontSize: 14, fontWeight: 700, color: '#A5B4FC', marginBottom: 14 }}>
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
                    border: isSelected ? '1px solid rgba(99, 102, 241, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isSelected ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(6, 182, 212, 0.2))' : 'rgba(255, 255, 255, 0.03)',
                    color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : 500,
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isSelected ? '0 0 15px rgba(99, 102, 241, 0.2)' : 'none',
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
          background: 'rgba(245, 158, 11, 0.06)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 16,
          padding: 28,
          textAlign: 'center',
          marginBottom: 24,
          backdropFilter: 'blur(12px)',
        }}>
          <FileText size={36} color="var(--warning)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            No Resume Found
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
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
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 24,
        }}>
          <AlertCircle size={18} color="var(--danger)" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#FCA5A5', margin: 0, flex: 1 }}>{error}</p>
          <button
            className="btn btn-outline"
            onClick={() => runSkillGapAnalysis(currentField)}
            style={{ fontSize: 12, padding: '6px 14px' }}
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
          background: 'rgba(15, 23, 42, 0.75)',
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          marginBottom: 24,
        }}>
          <Loader size={42} color="var(--accent-cyan)" className="animate-spin" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Calculating your skill gap...
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
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
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.7) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 22,
              padding: '36px 24px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(99, 102, 241, 0.1)',
            }}
          >
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
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
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="12"
                />
                <circle
                  cx="85"
                  cy="85"
                  r="70"
                  fill="none"
                  stroke={matchPct >= 75 ? '#10B981' : matchPct >= 50 ? '#06B6D4' : '#F59E0B'}
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - matchPct / 100)}`}
                  strokeLinecap="round"
                  style={{
                    transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    filter: matchPct >= 75 ? 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.5))' : 'drop-shadow(0 0 10px rgba(6, 182, 212, 0.5))'
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
                  {matchPct}<small style={{ fontSize: 22, color: 'var(--accent-cyan)' }}>%</small>
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, letterSpacing: '0.5px' }}>
                  Skill Match
                </span>
              </div>
            </div>

            {/* Match & Gap Stat Pills */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                padding: '7px 18px',
                borderRadius: 24,
                fontSize: 13,
                fontWeight: 600,
                color: '#34D399',
              }}>
                Match: {matchPct}%
              </div>
              <div style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                padding: '7px 18px',
                borderRadius: 24,
                fontSize: 13,
                fontWeight: 600,
                color: '#FBBF24',
              }}>
                Gap: {gapPct}%
              </div>
            </div>

            {/* Backend-Generated Summary */}
            {result.summary && (
              <div style={{
                maxWidth: 660,
                margin: '0 auto',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: '16px 20px',
              }}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
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
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderTop: '3px solid #10B981',
                borderRadius: 16,
                padding: 22,
                backdropFilter: 'blur(16px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={18} color="#10B981" />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#34D399', margin: 0 }}>Matched Skills</h3>
                </div>
                <span className="badge badge-green" style={{ fontSize: 12, padding: '3px 10px' }}>
                  {result.matched_skills?.length || 0} Matched
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
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
                        fontSize: 13,
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#34D399',
                        borderColor: 'rgba(16, 185, 129, 0.35)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <CheckCircle size={13} color="#34D399" /> {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                  No exact skill matches identified for this field.
                </p>
              )}
            </div>

            {/* 2B. Related Skills (Clearly separated - NOT exact matches) */}
            <div
              className="card"
              style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderTop: '3px solid #06B6D4',
                borderRadius: 16,
                padding: 22,
                backdropFilter: 'blur(16px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={18} color="#06B6D4" />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#22D3EE', margin: 0 }}>Related Skills</h3>
                </div>
                <span className="badge badge-blue" style={{ fontSize: 12, padding: '3px 10px' }}>
                  {result.related_skills?.length || 0} Adjacent
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
                Adjacent skills that relate to requirements. <span style={{ color: '#22D3EE', fontWeight: 600 }}>Note:</span> Not counted as exact matches.
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
                          fontSize: 13,
                          background: 'rgba(6, 182, 212, 0.12)',
                          border: '1px solid rgba(6, 182, 212, 0.35)',
                          color: '#CFFAFE',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#67E8F9' }}>{s}</span>
                        {targetConcept && (
                          <>
                            <span style={{ opacity: 0.5 }}>→</span>
                            <span style={{ opacity: 0.85, fontSize: 12 }}>{targetConcept}</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                  No adjacent or related skills found.
                </p>
              )}
            </div>

            {/* 2C. Missing Skills (Skills to Develop) */}
            <div
              className="card"
              style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderTop: '3px solid #F59E0B',
                borderRadius: 16,
                padding: 22,
                backdropFilter: 'blur(16px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={18} color="#F59E0B" />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#FBBF24', margin: 0 }}>Skills to Develop</h3>
                </div>
                <span className="badge badge-yellow" style={{ fontSize: 12, padding: '3px 10px' }}>
                  {result.missing_skills?.length || 0} Missing
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
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
                        fontSize: 13,
                        background: 'rgba(245, 158, 11, 0.12)',
                        color: '#FBBF24',
                        borderColor: 'rgba(245, 158, 11, 0.35)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <XCircle size={13} color="#FBBF24" style={{ opacity: 0.9 }} /> {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#34D399', fontStyle: 'italic', margin: 0 }}>
                  ✓ All core skills are covered for this job field!
                </p>
              )}
            </div>

            {/* 2D. Additional Skills */}
            <div
              className="card"
              style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderTop: '3px solid #8B5CF6',
                borderRadius: 16,
                padding: 22,
                backdropFilter: 'blur(16px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="#8B5CF6" />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#A78BFA', margin: 0 }}>Additional Skills</h3>
                </div>
                <span className="badge badge-blue" style={{ fontSize: 12, padding: '3px 10px' }}>
                  {result.additional_skills?.length || 0} Other
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
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
                        fontSize: 13,
                        background: 'rgba(139, 92, 246, 0.12)',
                        color: '#DDD6FE',
                        borderColor: 'rgba(139, 92, 246, 0.35)',
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
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
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 18,
                padding: 26,
                backdropFilter: 'blur(16px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <BookOpen size={20} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
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
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div style={{
                      minWidth: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent), var(--accent-cyan))',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: 1,
                    }}>
                      {idx + 1}
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
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
                fontSize: 14,
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
                fontSize: 15,
                fontWeight: 700,
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
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
