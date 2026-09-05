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
    if (pct >= 70) return { label: 'Strong Alignment', color: '#D8C4B6' };
    if (pct >= 45) return { label: 'Moderate Match', color: '#D8C4B6' };
    return { label: 'Growth Opportunity', color: '#F5EFE7' };
  };

  const matchTier = getMatchTier(matchPct);

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '40px 20px 80px' }} className="animate-fade-in">
      <StepBar current={2} />

      {/* Header */}
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(216,196,182,0.12)',
          border: '1px solid rgba(216,196,182,0.25)',
          borderRadius: 20,
          padding: '4px 14px',
          marginBottom: 10,
          fontSize: 12,
          color: '#D8C4B6',
          fontWeight: 500,
        }}>
          <Compass size={13} /> Selected Target Career Path
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, color: '#F5EFE7' }}>
          Skill Gap Analysis
        </h1>
        <p style={{ color: '#F5EFE7', opacity: 0.85, fontSize: 15, maxWidth: 620, margin: '0 auto' }}>
          Evaluating your profile against canonical requirements for{' '}
          <span style={{ color: '#D8C4B6', fontWeight: 600 }}>{currentFieldName}</span>.
        </p>
      </div>

      {/* Career Path Switcher Bar */}
      <div
        className="card"
        style={{
          background: '#000000',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '14px 20px',
          marginBottom: 24,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'rgba(216,196,182,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Briefcase size={16} color="#D8C4B6" />
          </div>
          <div>
            <span style={{ fontSize: 12, color: '#D8C4B6', opacity: 0.9, display: 'block', fontWeight: 600, letterSpacing: '0.5px' }}>Target Career Track</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#60A5FA' }}>{currentFieldName}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-outline"
            onClick={() => setShowFieldSelector(!showFieldSelector)}
            style={{ fontSize: 13, padding: '8px 16px' }}
          >
            <Compass size={14} /> {showFieldSelector ? 'Close Selection' : 'Change Career Field'}
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
            background: 'rgba(33,53,85,0.95)',
            border: '1px solid #D8C4B6',
            borderRadius: 14,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#D8C4B6', marginBottom: 12 }}>
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
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: isSelected ? '1px solid #D8C4B6' : '1px solid rgba(62,88,121,0.5)',
                    background: isSelected ? '#D8C4B6' : 'rgba(62,88,121,0.3)',
                    color: isSelected ? '#213555' : '#F5EFE7',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : 500,
                    transition: 'all 0.15s ease',
                    fontFamily: 'Inter, sans-serif',
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
          background: 'rgba(245,239,231,0.08)',
          border: '1px solid rgba(245,239,231,0.25)',
          borderRadius: 14,
          padding: 24,
          textAlign: 'center',
          marginBottom: 24,
        }}>
          <FileText size={32} color="#D8C4B6" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 17, fontWeight: 600, color: '#F5EFE7', marginBottom: 6 }}>
            No Resume Found
          </h3>
          <p style={{ fontSize: 14, color: '#F5EFE7', opacity: 0.8, marginBottom: 18 }}>
            Please upload your resume first so our AI can perform the skill gap comparison.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/upload')}
            style={{ padding: '10px 24px' }}
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
          background: 'rgba(245,239,231,0.08)',
          border: '1px solid rgba(245,239,231,0.25)',
          borderRadius: 10,
          padding: '14px 18px',
          marginBottom: 24,
        }}>
          <AlertCircle size={18} color="#F5EFE7" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#F5EFE7', margin: 0, flex: 1 }}>{error}</p>
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
          background: '#000000',
          borderRadius: 16,
          border: '1px solid var(--border)',
          marginBottom: 24,
        }}>
          <Loader size={40} color="#D8C4B6" className="animate-spin" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#F5EFE7', marginBottom: 6 }}>
            Calculating your skill gap...
          </h3>
          <p style={{ color: '#F5EFE7', opacity: 0.75, fontSize: 14 }}>
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
              background: '#000000',
              border: '2px solid #D8C4B6',
              borderRadius: 18,
              padding: '32px 24px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 12px 36px rgba(33,53,85,0.4)',
            }}
          >
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at center, rgba(216,196,182,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              color: '#D8C4B6',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: 16,
            }}>
              <TrendingUp size={14} /> Profile Match Score
            </div>

            {/* Circular Progress Gauge */}
            <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 18px' }}>
              <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx="80"
                  cy="80"
                  r="66"
                  fill="none"
                  stroke="#213555"
                  strokeWidth="12"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="66"
                  fill="none"
                  stroke="#D8C4B6"
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 66}`}
                  strokeDashoffset={`${2 * Math.PI * 66 * (1 - matchPct / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
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
                <span style={{ fontSize: 44, fontWeight: 800, color: '#D8C4B6', lineHeight: 1 }}>
                  {matchPct}<small style={{ fontSize: 20 }}>%</small>
                </span>
                <span style={{ fontSize: 12, color: '#F5EFE7', opacity: 0.7, marginTop: 2 }}>
                  Skill Match
                </span>
              </div>
            </div>

            {/* Match & Gap Stat Pills */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 18 }}>
              <div style={{
                background: 'rgba(74,222,128,0.12)',
                border: '1px solid rgba(74,222,128,0.4)',
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                color: '#4ADE80',
              }}>
                Match: {matchPct}%
              </div>
              <div style={{
                background: 'rgba(251,191,36,0.12)',
                border: '1px solid rgba(251,191,36,0.4)',
                padding: '6px 16px',
                borderRadius: 20,
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
                maxWidth: 640,
                margin: '0 auto',
                background: 'rgba(33,53,85,0.4)',
                border: '1px solid rgba(216,196,182,0.12)',
                borderRadius: 12,
                padding: '14px 18px',
              }}>
                <p style={{ fontSize: 14, color: '#F5EFE7', lineHeight: 1.65, margin: 0 }}>
                  {result.summary}
                </p>
              </div>
            )}
          </div>

          {/* 2. Skill Categories Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: 20,
          }}>

            {/* 2A. Matched Skills (Exact) */}
            <div
              className="card"
              style={{
                background: '#000000',
                border: '1px solid var(--border)',
                borderTop: '3px solid #4ADE80',
                borderRadius: 14,
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={18} color="#4ADE80" />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#4ADE80', margin: 0 }}>Matched Skills</h3>
                </div>
                <span className="badge badge-green" style={{ fontSize: 12, padding: '2px 10px' }}>
                  {result.matched_skills?.length || 0} Matched
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#F5EFE7', opacity: 0.7, marginBottom: 12 }}>
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
                        background: 'rgba(74,222,128,0.12)',
                        color: '#4ADE80',
                        borderColor: 'rgba(74,222,128,0.35)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <CheckCircle size={13} color="#4ADE80" /> {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#F5EFE7', opacity: 0.6, fontStyle: 'italic', margin: 0 }}>
                  No exact skill matches identified for this field.
                </p>
              )}
            </div>

            {/* 2B. Related Skills (Clearly separated - NOT exact matches) */}
            <div
              className="card"
              style={{
                background: '#000000',
                border: '1px solid var(--border)',
                borderTop: '3px solid #60A5FA',
                borderRadius: 14,
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={18} color="#60A5FA" />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#60A5FA', margin: 0 }}>Related Skills</h3>
                </div>
                <span className="badge badge-blue" style={{ fontSize: 12, padding: '2px 10px' }}>
                  {result.related_skills?.length || 0} Adjacent
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#F5EFE7', opacity: 0.7, marginBottom: 12 }}>
                Adjacent skills that relate to requirements. <span style={{ color: '#60A5FA', fontWeight: 600 }}>Note:</span> Not counted as exact matches.
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
                          background: 'rgba(96,165,250,0.12)',
                          border: '1px solid rgba(96,165,250,0.35)',
                          color: '#DBEAFE',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#93C5FD' }}>{s}</span>
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
                <p style={{ fontSize: 13, color: '#F5EFE7', opacity: 0.6, fontStyle: 'italic', margin: 0 }}>
                  No adjacent or related skills found.
                </p>
              )}
            </div>

            {/* 2C. Missing Skills (Skills to Develop) */}
            <div
              className="card"
              style={{
                background: '#000000',
                border: '1px solid var(--border)',
                borderTop: '3px solid #FBBF24',
                borderRadius: 14,
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={18} color="#FBBF24" />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#FBBF24', margin: 0 }}>Skills to Develop</h3>
                </div>
                <span className="badge badge-yellow" style={{ fontSize: 12, padding: '2px 10px' }}>
                  {result.missing_skills?.length || 0} Missing
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#F5EFE7', opacity: 0.7, marginBottom: 12 }}>
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
                        background: 'rgba(251,191,36,0.12)',
                        color: '#FBBF24',
                        borderColor: 'rgba(251,191,36,0.35)',
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
                <p style={{ fontSize: 13, color: '#4ADE80', fontStyle: 'italic', margin: 0 }}>
                  ✓ All core skills are covered for this job field!
                </p>
              )}
            </div>

            {/* 2D. Additional Skills */}
            <div
              className="card"
              style={{
                background: '#000000',
                border: '1px solid var(--border)',
                borderTop: '3px solid #C084FC',
                borderRadius: 14,
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="#C084FC" />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#C084FC', margin: 0 }}>Additional Skills</h3>
                </div>
                <span className="badge badge-blue" style={{ fontSize: 12, padding: '2px 10px' }}>
                  {result.additional_skills?.length || 0} Other
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#F5EFE7', opacity: 0.7, marginBottom: 12 }}>
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
                        background: 'rgba(192,132,252,0.12)',
                        color: '#E9D5FF',
                        borderColor: 'rgba(192,132,252,0.35)',
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#F5EFE7', opacity: 0.6, fontStyle: 'italic', margin: 0 }}>
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
                background: '#000000',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 24,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <BookOpen size={20} color="#D8C4B6" />
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#D8C4B6', margin: 0 }}>
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
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: 'rgba(216,196,182,0.06)',
                      border: '1px solid rgba(216,196,182,0.22)',
                    }}
                  >
                    <div style={{
                      minWidth: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: '#D8C4B6',
                      color: '#213555',
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
                    <p style={{ fontSize: 14, color: '#F5EFE7', lineHeight: 1.6, margin: 0 }}>
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
                boxShadow: '0 4px 20px rgba(216,196,182,0.3)',
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
