import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Target, CheckCircle, XCircle, Plus, TrendingUp,
  BookOpen, ChevronRight, AlertCircle, Loader, RotateCcw,
  Briefcase, FileText, Brain, Mic,
} from 'lucide-react';
import { skillGapAPI } from '../services/api';

function StepBar({ current }) {
  const steps = [
    { n: 1, label: 'Upload & Analyze CV', icon: <Brain size={15} /> },
    { n: 2, label: 'Skill Gap Analysis',  icon: <Zap size={15} /> },
    { n: 3, label: 'Interview',           icon: <Mic size={15} /> },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: s.n <= current ? '#D8C4B6' : '#3E5879',
              color: '#213555',
              fontSize: 13, fontWeight: 700, flexShrink: 0,
            }}>
              {s.n < current ? <CheckCircle size={15} /> : s.icon}
            </div>
            <span style={{
              fontSize: 13, whiteSpace: 'nowrap',
              fontWeight: s.n === current ? 600 : 400,
              color: s.n <= current ? '#D8C4B6' : '#F5EFE7',
            }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, margin: '0 12px', background: s.n < current ? '#D8C4B6' : '#3E5879', borderRadius: 2 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function SkillGap() {
  const navigate = useNavigate();

  const resumeText = sessionStorage.getItem('resumeText') || '';
  const jobRole    = sessionStorage.getItem('jobRole') || '';

  const [jobDesc, setJobDesc] = useState(
    jobRole
      ? `We are looking for a ${jobRole}. The candidate should have strong knowledge of relevant technologies, frameworks, and tools used in this role. Experience with system design, problem solving, and team collaboration is required.`
      : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [result, setResult]   = useState(null);

  const canAnalyze = jobDesc.trim().length >= 20 && resumeText.trim().length >= 20;

  // Auto-run analysis when arriving from CVUpload
  useEffect(() => {
    if (canAnalyze && !result) runAnalysis(jobDesc);
  }, []);

  const runAnalysis = async (desc) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await skillGapAPI.analyze(desc, resumeText);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Skill gap analysis failed. Make sure the AI service is running.');
    } finally {
      setLoading(false);
    }
  };

  const pct      = result?.match_percentage ?? 0;
  const pctColor = pct >= 70 ? '#22C55E' : pct >= 45 ? '#F59E0B' : '#EF4444';
  const pctLabel = pct >= 70 ? 'Strong Match' : pct >= 45 ? 'Partial Match' : 'Weak Match';

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px' }}>

      <StepBar current={2} />

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Skill Gap Analysis</h1>
        <p style={{ color: '#F5EFE7', fontSize: 15 }}>
          Comparing your resume against the target job to identify missing skills and recommendations.
        </p>
      </div>

      {/* Resume status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: resumeText ? 'rgba(216,196,182,0.08)' : 'rgba(245,239,231,0.08)',
        border: `1px solid ${resumeText ? 'rgba(216,196,182,0.25)' : 'rgba(245,239,231,0.25)'}`,
        borderRadius: 12, padding: '12px 16px', marginBottom: 24,
      }}>
        <FileText size={16} color={resumeText ? '#D8C4B6' : '#F5EFE7'} />
        {resumeText
          ? <span style={{ fontSize: 13, color: '#F5EFE7' }}>Resume loaded · <span style={{ color: '#D8C4B6' }}>Ready</span></span>
          : <span style={{ fontSize: 13, color: '#F5EFE7' }}>No resume found. <button onClick={() => navigate('/upload')} style={{ background: 'none', border: 'none', color: '#D8C4B6', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: 13, padding: 0 }}>Upload your CV first →</button></span>
        }
      </div>

      {/* Job description — editable so user can refine */}
      <div className="card" style={{ marginBottom: 24, background: '#000000' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Briefcase size={16} color="#D8C4B6" />
          <span style={{ fontWeight: 600, fontSize: 15 }}>Target Job Description</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#F5EFE7' }}>Edit to refine the analysis</span>
        </div>
        <textarea
          className="input"
          rows={4}
          value={jobDesc}
          onChange={e => setJobDesc(e.target.value)}
          style={{ resize: 'vertical', lineHeight: 1.6 }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(245,239,231,0.08)', border: '1px solid rgba(245,239,231,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
          <AlertCircle size={15} color="#F5EFE7" />
          <p style={{ fontSize: 13, color: '#F5EFE7' }}>{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Loader size={36} color="#D8C4B6" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#F5EFE7', fontSize: 15 }}>Analyzing your skill gap with AI…</p>
        </div>
      )}

      {/* Re-analyze button (shown before results or after error) */}
      {!loading && !result && (
        <button
          className="btn btn-primary"
          disabled={!canAnalyze}
          onClick={() => runAnalysis(jobDesc)}
          style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, opacity: !canAnalyze ? 0.5 : 1, marginBottom: 32 }}
        >
          <Zap size={16} /> Analyze Skill Gap
        </button>
      )}

      {/* ── RESULTS ── */}
      {result && !loading && (
        <div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', marginBottom: 14, background: '#000000', borderRadius: 8 }}>
            <div style={{ width: 4, height: 24, borderRadius: 4, background: '#D8C4B6' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Analysis Results</h2>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#F5EFE7' }}>Resume compared with target role</span>
          </div>

          {/* Match Score */}
          <div className="card" style={{ textAlign: 'center', marginBottom: 24, position: 'relative', overflow: 'hidden', background: '#000000', border: `2px solid ${pctColor}`, boxShadow: `0 12px 32px ${pctColor}26` }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(ellipse at center, ${pctColor}12 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />
            <p style={{ fontSize: 13, color: pctColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
              Match Score
            </p>
            <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 16px' }}>
              <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="70" cy="70" r="58" fill="none" stroke="#3E5879" strokeWidth="10" />
                <circle cx="70" cy="70" r="58" fill="none" stroke={pctColor} strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 58}`}
                  strokeDashoffset={`${2 * Math.PI * 58 * (1 - pct / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 42, fontWeight: 800, color: pctColor, lineHeight: 1 }}>{pct}<small style={{ fontSize: 18 }}>%</small></span>
                <span style={{ fontSize: 12, color: '#F5EFE7' }}>/ 100</span>
              </div>
            </div>
            <span className="badge" style={{ background: `${pctColor}20`, color: pctColor, border: `1px solid ${pctColor}40`, fontSize: 14, padding: '6px 18px' }}>
              <TrendingUp size={13} /> {pctLabel}
            </span>
            {result.summary && (
              <p style={{ fontSize: 14, color: '#F5EFE7', lineHeight: 1.7, marginTop: 16, maxWidth: 560, margin: '16px auto 0' }}>
                {result.summary}
              </p>
            )}
          </div>

          {/* Skills Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <SkillCard title="Matched Skills"   icon={<CheckCircle size={15} color="#22C55E" />} color="#22C55E" skills={result.matched_skills}    badgeClass="badge-green" emptyMsg="No matched skills found." />
            <SkillCard title="Missing Skills"   icon={<XCircle size={15} color="#EF4444" />}     color="#EF4444" skills={result.missing_skills}    badgeClass="badge-red"   emptyMsg="No missing skills — great match!" />
            <SkillCard title="Required by Job"  icon={<Target size={15} color="#3282B8" />}       color="#3282B8" skills={result.required_skills}   badgeClass="badge-blue"  emptyMsg="No required skills extracted." />
            <SkillCard title="Your Extra Skills" icon={<Plus size={15} color="#A855F7" />}        color="#A855F7" skills={result.additional_skills} badgeClass="badge-blue"  emptyMsg="No additional skills found." />
          </div>

          {/* Recommendations */}
          {result.recommendations?.length > 0 && (
            <div className="card" style={{ marginBottom: 24, background: '#000000' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <BookOpen size={17} color="#D8C4B6" />
                <span style={{ fontWeight: 600, fontSize: 15 }}>Recommendations</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {result.recommendations.map((rec, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      minWidth: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(216,196,182,0.15)', color: '#D8C4B6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, marginTop: 1,
                    }}>
                      {i + 1}
                    </div>
                    <p style={{ fontSize: 14, color: '#F5EFE7', lineHeight: 1.65 }}>{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
              onClick={() => runAnalysis(jobDesc)}>
              <RotateCcw size={14} /> Re-analyze
            </button>
            <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', padding: '12px', fontSize: 15 }}
              onClick={() => navigate('/interview')}>
              Continue to Interview <ChevronRight size={15} />
            </button>
          </div>

        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function SkillCard({ title, icon, color, skills, badgeClass, emptyMsg }) {
  return (
    <div className="card" style={{ padding: 20, background: '#000000', borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#F5EFE7' }}>{title}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color, background: `${color}18`, padding: '2px 8px', borderRadius: 10 }}>
          {skills.length}
        </span>
      </div>
      {skills.length === 0
        ? <p style={{ fontSize: 13, color: '#F5EFE7', fontStyle: 'italic' }}>{emptyMsg}</p>
        : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {skills.map((s, i) => (
              <span key={i} className={`badge ${badgeClass}`} style={{ fontSize: 11, background: `${color}20`, color, borderColor: `${color}55` }}>{s}</span>
            ))}
          </div>
        )}
    </div>
  );
}
