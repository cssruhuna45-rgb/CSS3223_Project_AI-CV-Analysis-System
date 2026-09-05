import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  CheckCircle,
  Briefcase,
  ChevronRight,
  X,
  Sparkles,
  AlertCircle,
  GraduationCap,
  FolderGit2,
  Award,
  ArrowRight,
  Compass,
  Check,
  RotateCcw,
  Loader,
} from 'lucide-react';
import { resumeAPI, aiResumeAPI } from '../services/api';
import CVFeedback from '../components/CVFeedback';
import StepBar from '../components/StepBar';
import { PREDEFINED_JOB_FIELDS, getJobFieldName } from '../constants/jobFields';

export default function CVUpload() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [showManualSelection, setShowManualSelection] = useState(false);
  const [manualField, setManualField] = useState('');

  // Load existing analysis if user navigated back
  useEffect(() => {
    const savedAnalysis = sessionStorage.getItem('resumeAnalysis');
    const savedJobField = sessionStorage.getItem('selectedJobField');
    if (savedAnalysis) {
      try {
        setAnalysis(JSON.parse(savedAnalysis));
        const savedReview = sessionStorage.getItem('cvReview');
        if (savedReview) setReview(JSON.parse(savedReview));
        if (savedJobField) setManualField(savedJobField);
      } catch (e) {
        console.error('Failed to parse cached analysis', e);
      }
    }
  }, []);

  const handleFile = (f) => {
    if (!f) return;
    if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
      setFile(f);
      setError('');
      setAnalysis(null);
    setReview(null);
    sessionStorage.removeItem('cvReview');
      setReview(null);
    } else {
      setError('Only PDF files are supported. Please upload a valid PDF resume.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please select a PDF resume file first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Upload to backend (Spring Boot)
      const resumeData = await resumeAPI.upload(file);
      const resumeId = resumeData?.id || Date.now();
      const resumeText = resumeData?.extractedText || '';

      if (!resumeText || resumeText.trim().length === 0) {
        throw new Error('Could not extract text from the uploaded PDF. Please verify the document is not an empty or scanned image PDF.');
      }

      // 2. Call AI Resume Analysis (FastAPI)
      const aiResult = await aiResumeAPI.analyze(resumeId, resumeText);

      // Save state to sessionStorage
      sessionStorage.setItem('resumeId', String(resumeId));
      sessionStorage.setItem('resumeText', resumeText);
      sessionStorage.setItem('resumeAnalysis', JSON.stringify(aiResult));

      setAnalysis(aiResult);

      // Default select the top recommendation if available
      if (aiResult.recommended_job_fields && aiResult.recommended_job_fields.length > 0) {
        setManualField(aiResult.recommended_job_fields[0].field);
      }

      // 3. Review how the CV is written. Deliberately after the
      //    analysis is already on screen, and in its own try/catch:
      //    a failed review must not lose the extraction.
      setReviewLoading(true);
      setReviewError('');
      try {
        const cvReview = await aiResumeAPI.feedback(resumeId, resumeText);
        sessionStorage.setItem('cvReview', JSON.stringify(cvReview));
        setReview(cvReview);
      } catch (reviewErr) {
        console.error('CV review error:', reviewErr);
        setReviewError(reviewErr.message || 'Could not review the CV.');
      } finally {
        setReviewLoading(false);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'We could not analyze your resume right now. Please verify the backend and AI service are running, then try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectJobField = (fieldId, fieldName) => {
    const canonicalName = fieldName || getJobFieldName(fieldId);
    sessionStorage.setItem('selectedJobField', fieldId);
    sessionStorage.setItem('selectedJobFieldName', canonicalName);
    sessionStorage.setItem('jobRole', canonicalName);
    sessionStorage.setItem(
      'jobDescription',
      `I am interviewing for a ${canonicalName} position. Please evaluate my technical competence and ask relevant interview questions suited for this role.`
    );
    navigate('/skill-gap');
  };

  const handleReset = () => {
    setFile(null);
    setAnalysis(null);
    setError('');
    setShowManualSelection(false);
    sessionStorage.removeItem('resumeAnalysis');
    sessionStorage.removeItem('selectedJobField');
    sessionStorage.removeItem('selectedJobFieldName');
    sessionStorage.removeItem('skillGapResult');
  };

  // Sort recommendations by match percentage descending
  const recommendedFields = (analysis?.recommended_job_fields || []).slice().sort(
    (a, b) => (b.match_percentage || 0) - (a.match_percentage || 0)
  );

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px 80px' }} className="animate-fade-in">
      <StepBar current={1} />

      {/* Header */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, color: '#F5EFE7' }}>
          Upload Your Resume
        </h1>
        <p style={{ color: '#F5EFE7', opacity: 0.85, fontSize: 15, maxWidth: 580, margin: '0 auto' }}>
          Our AI extracts your technical qualifications, identifies your strongest career matches, and prepares a tailored interview plan.
        </p>
      </div>

      {/* Upload Zone & Actions (Visible when no analysis yet or editable) */}
      {!analysis && (
        <div className="card" style={{ marginBottom: 32, background: '#000000', border: '1px solid var(--border)', borderTop: '3px solid #D8C4B6' }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            onClick={() => !file && fileRef.current && fileRef.current.click()}
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              cursor: file ? 'default' : 'pointer',
              border: `2px dashed ${drag ? '#D8C4B6' : file ? 'rgba(216,196,182,0.4)' : '#3E5879'}`,
              borderRadius: 14,
              background: drag ? 'rgba(216,196,182,0.08)' : file ? 'rgba(33,53,85,0.4)' : 'rgba(33,53,85,0.2)',
              transition: 'all 0.2s ease',
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />

            {file ? (
              <div>
                <div style={{
                  width: 58,
                  height: 58,
                  borderRadius: 14,
                  background: 'rgba(216,196,182,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <FileText size={30} color="#D8C4B6" />
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 16, color: '#F5EFE7', marginBottom: 4 }}>
                  {file.name}
                </h3>
                <p style={{ color: '#F5EFE7', opacity: 0.75, fontSize: 13, marginBottom: 18 }}>
                  {(file.size / 1024).toFixed(1)} KB · PDF Document
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={(e) => { e.stopPropagation(); setFile(null); setError(''); }}
                    style={{ fontSize: 13, padding: '8px 16px' }}
                  >
                    <X size={14} /> Remove File
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={(e) => { e.stopPropagation(); fileRef.current && fileRef.current.click(); }}
                    style={{ fontSize: 13, padding: '8px 16px' }}
                  >
                    Change File
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  width: 58,
                  height: 58,
                  borderRadius: 14,
                  background: 'rgba(216,196,182,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <Upload size={28} color="#D8C4B6" />
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 16, color: '#F5EFE7', marginBottom: 6 }}>
                  Drag & drop your resume PDF here
                </h3>
                <p style={{ color: '#F5EFE7', opacity: 0.75, fontSize: 13, marginBottom: 16 }}>
                  or <span style={{ color: '#D8C4B6', textDecoration: 'underline', fontWeight: 500 }}>browse files</span> on your device
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#F5EFE7', opacity: 0.65 }}>
                  <span>Supported format: PDF only</span>
                  <span>•</span>
                  <span>Max size: 10MB</span>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              background: 'rgba(245,239,231,0.08)',
              border: '1px solid rgba(245,239,231,0.25)',
              borderRadius: 10,
              padding: '12px 16px',
              marginTop: 18,
            }}>
              <AlertCircle size={18} color="#F5EFE7" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#F5EFE7', margin: 0, flex: 1 }}>{error}</p>
              <button
                className="btn btn-outline"
                onClick={handleAnalyze}
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Analyze Button */}
          <div style={{ marginTop: 24 }}>
            <button
              className="btn btn-primary"
              disabled={!file || loading}
              onClick={handleAnalyze}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '14px',
                fontSize: 15,
                fontWeight: 600,
                opacity: (!file || loading) ? 0.6 : 1,
                cursor: (!file || loading) ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  <span>Analyzing your resume with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Analyze Resume</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── ANALYSIS COMPLETE VIEW ── */}
      {analysis && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Success Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#000000',
            border: '1px solid rgba(74,222,128,0.35)',
            borderLeft: '4px solid #4ADE80',
            borderRadius: 14,
            padding: '16px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(74,222,128,0.15)',
                color: '#4ADE80',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(74,222,128,0.4)',
              }}>
                <CheckCircle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#4ADE80', margin: 0 }}>
                  Resume Analysis Complete ✓
                </h3>
                <p style={{ fontSize: 13, color: '#F5EFE7', opacity: 0.85, margin: 0 }}>
                  Profile extracted successfully. Review your summary and career match below.
                </p>
              </div>
            </div>

            <button
              className="btn btn-outline"
              onClick={handleReset}
              style={{ fontSize: 12, padding: '6px 12px' }}
            >
              <RotateCcw size={13} /> Re-upload
            </button>
          </div>

          {/* CV review - how it is written, not what it says */}
          <CVFeedback
            review={review}
            loading={reviewLoading}
            error={reviewError}
          />

          {/* 1. Candidate Summary */}
          {analysis.summary && (
            <div className="card" style={{ background: '#000000', border: '1px solid var(--border)', borderTop: '3px solid #60A5FA' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <FileText size={18} color="#60A5FA" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#60A5FA', margin: 0 }}>Candidate Summary</h3>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: '#F5EFE7', opacity: 0.95 }}>
                {analysis.summary}
              </p>
            </div>
          )}

          {/* 2. Technical Skills */}
          {analysis.skills && analysis.skills.length > 0 && (
            <div className="card" style={{ background: '#000000', border: '1px solid var(--border)', borderTop: '3px solid #4ADE80' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Sparkles size={18} color="#4ADE80" />
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#4ADE80', margin: 0 }}>Technical Skills</h3>
                </div>
                <span
                  className="badge"
                  style={{
                    background: 'rgba(74,222,128,0.12)',
                    color: '#4ADE80',
                    border: '1px solid rgba(74,222,128,0.35)',
                  }}
                >
                  {analysis.skills.length} Extracted
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {analysis.skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="badge badge-blue"
                    style={{
                      padding: '6px 12px',
                      fontSize: 13,
                      background: 'rgba(74,222,128,0.1)',
                      color: '#86EFAC',
                      borderColor: 'rgba(74,222,128,0.3)',
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 3. Education & Experience Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
            {/* Education */}
            {analysis.education && analysis.education.length > 0 && (
              <div className="card" style={{ background: '#000000', border: '1px solid var(--border)', borderTop: '3px solid #C084FC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <GraduationCap size={18} color="#C084FC" />
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#C084FC', margin: 0 }}>Education</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {analysis.education.map((edu, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: 'rgba(192,132,252,0.08)',
                        border: '1px solid rgba(192,132,252,0.25)',
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#F5EFE7' }}>
                        {edu.degree || 'Degree'} {edu.field ? `in ${edu.field}` : ''}
                      </div>
                      <div style={{ fontSize: 13, color: '#E9D5FF', marginTop: 2 }}>
                        {edu.institution || 'University / Institution'}
                      </div>
                      {edu.year && (
                        <div style={{ fontSize: 12, color: '#F5EFE7', opacity: 0.7, marginTop: 4 }}>
                          Year: {edu.year}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {analysis.experience && analysis.experience.length > 0 && (
              <div className="card" style={{ background: '#000000', border: '1px solid var(--border)', borderTop: '3px solid #FBBF24' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <Briefcase size={18} color="#FBBF24" />
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FBBF24', margin: 0 }}>Experience</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {analysis.experience.map((exp, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: 'rgba(251,191,36,0.07)',
                        border: '1px solid rgba(251,191,36,0.25)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#F5EFE7' }}>
                          {exp.role || 'Role'}
                        </div>
                        {exp.duration && (
                          <span style={{ fontSize: 12, color: '#FBBF24', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', padding: '2px 8px', borderRadius: 6 }}>
                            {exp.duration}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: '#FDE68A', marginTop: 2 }}>
                        {exp.company || 'Company'}
                      </div>
                      {exp.description && (
                        <p style={{ fontSize: 12, color: '#F5EFE7', opacity: 0.85, marginTop: 6, lineHeight: 1.5 }}>
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Projects */}
          {analysis.projects && analysis.projects.length > 0 && (
            <div className="card" style={{ background: '#000000', border: '1px solid var(--border)', borderTop: '3px solid #22D3EE' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <FolderGit2 size={18} color="#22D3EE" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#22D3EE', margin: 0 }}>Projects</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                {analysis.projects.map((proj, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '14px',
                      borderRadius: 10,
                      background: 'rgba(34,211,238,0.07)',
                      border: '1px solid rgba(34,211,238,0.25)',
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#67E8F9', marginBottom: 4 }}>
                      {proj.name}
                    </div>
                    {proj.description && (
                      <p style={{ fontSize: 13, color: '#F5EFE7', opacity: 0.85, marginBottom: 10, lineHeight: 1.5 }}>
                        {proj.description}
                      </p>
                    )}
                    {proj.technologies && proj.technologies.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {proj.technologies.map((t, tidx) => (
                          <span
                            key={tidx}
                            className="badge"
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              background: 'rgba(34,211,238,0.12)',
                              color: '#22D3EE',
                              border: '1px solid rgba(34,211,238,0.35)',
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Certifications */}
          {analysis.certifications && analysis.certifications.length > 0 && (
            <div className="card" style={{ background: '#000000', border: '1px solid var(--border)', borderTop: '3px solid #F472B6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Award size={18} color="#F472B6" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F472B6', margin: 0 }}>Certifications</h3>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {analysis.certifications.map((cert, idx) => (
                  <span
                    key={idx}
                    className="badge"
                    style={{
                      padding: '6px 12px',
                      fontSize: 13,
                      background: 'rgba(244,114,182,0.12)',
                      color: '#F472B6',
                      border: '1px solid rgba(244,114,182,0.35)',
                    }}
                  >
                    <Award size={13} /> {cert}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="glow-line" />

          {/* ── RECOMMENDED CAREER PATHS SECTION ── */}
          <div style={{ marginTop: 8 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <span
                className="badge"
                style={{
                  marginBottom: 8,
                  fontSize: 12,
                  padding: '4px 14px',
                  background: 'rgba(216,196,182,0.12)',
                  color: '#D8C4B6',
                  border: '1px solid rgba(216,196,182,0.35)',
                }}
              >
                <Compass size={13} /> AI Career Matching
              </span>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#F5EFE7', marginBottom: 6 }}>
                Recommended Career Paths
              </h2>
              <p style={{ color: '#F5EFE7', opacity: 0.8, fontSize: 14, maxWidth: 540, margin: '0 auto' }}>
                Based on your demonstrated technical proficiencies, we’ve ranked the best career tracks for your profile.
              </p>
            </div>

            {/* Recommendation Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              {recommendedFields.map((rec, idx) => {
                const isTopMatch = idx === 0;
                const matchPct = rec.match_percentage || 0;

                return (
                  <div
                    key={rec.field || idx}
                    className="card"
                    style={{
                      background: '#000000',
                      border: isTopMatch ? '2px solid #D8C4B6' : '1px solid var(--border)',
                      borderRadius: 16,
                      padding: 24,
                      position: 'relative',
                      boxShadow: isTopMatch ? '0 8px 32px rgba(216,196,182,0.15)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isTopMatch && (
                      <div style={{
                        position: 'absolute',
                        top: -12,
                        right: 24,
                        background: '#D8C4B6',
                        color: '#213555',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 12px',
                        borderRadius: 12,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        <Sparkles size={12} /> Top AI Match
                      </div>
                    )}

                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                    }}>
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F5EFE7', margin: 0 }}>
                            {rec.name || getJobFieldName(rec.field)}
                          </h3>
                        </div>
                        <p style={{ fontSize: 13, color: '#F5EFE7', opacity: 0.85, margin: '0 0 12px', lineHeight: 1.5 }}>
                          {matchPct >= 60
                            ? 'You have strong foundational skills for this career path.'
                            : matchPct >= 35
                            ? 'You have relevant adjacent skills that can transition into this path.'
                            : 'An emerging career path that requires targeted skill development.'}
                        </p>

                        {/* Visual Progress Indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 360 }}>
                          <div style={{ flex: 1, height: 8, background: 'rgba(33,53,85,0.6)', borderRadius: 4, overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                background: '#D8C4B6',
                                width: `${matchPct}%`,
                                borderRadius: 4,
                                transition: 'width 0.8s ease',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#D8C4B6', whiteSpace: 'nowrap' }}>
                            {matchPct}% Match
                          </span>
                        </div>
                      </div>

                      <div>
                        <button
                          className={isTopMatch ? 'btn btn-primary' : 'btn btn-outline'}
                          onClick={() => handleSelectJobField(rec.field, rec.name)}
                          style={{
                            padding: '12px 22px',
                            fontSize: 14,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Accept Recommendation <ArrowRight size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── MANUAL CAREER PATH SELECTION ── */}
            <div
              className="card"
              style={{
                background: '#000000',
                border: '1px dashed var(--border)',
                borderRadius: 16,
                padding: 24,
                textAlign: 'center',
              }}
            >
              <div style={{ marginBottom: 14 }}>
                <h4 style={{ fontSize: 16, fontWeight: 600, color: '#F5EFE7', marginBottom: 4 }}>
                  Want to choose a different career path?
                </h4>
                <p style={{ fontSize: 13, color: '#F5EFE7', opacity: 0.8, margin: 0 }}>
                  You can explore and run a skill gap analysis against any of our 10 specialized technology tracks.
                </p>
              </div>

              {!showManualSelection ? (
                <button
                  className="btn btn-outline"
                  onClick={() => setShowManualSelection(true)}
                  style={{ fontSize: 13, padding: '10px 20px', margin: '8px auto 0' }}
                >
                  <Compass size={15} /> Choose Another Field
                </button>
              ) : (
                <div style={{ marginTop: 20, textAlign: 'left' }} className="animate-fade-in">
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 10,
                    marginBottom: 20,
                  }}>
                    {PREDEFINED_JOB_FIELDS.map((jf) => {
                      const isSelected = manualField === jf.id;
                      return (
                        <div
                          key={jf.id}
                          onClick={() => setManualField(jf.id)}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 10,
                            background: isSelected ? 'rgba(216,196,182,0.18)' : 'rgba(33,53,85,0.6)',
                            border: `1px solid ${isSelected ? '#D8C4B6' : 'rgba(62,88,121,0.5)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 500, color: isSelected ? '#D8C4B6' : '#F5EFE7' }}>
                              {jf.name}
                            </div>
                            <div style={{ fontSize: 11, color: '#F5EFE7', opacity: 0.6, marginTop: 2 }}>
                              {jf.category}
                            </div>
                          </div>
                          {isSelected && <Check size={16} color="#D8C4B6" />}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                    <button
                      className="btn btn-ghost"
                      onClick={() => setShowManualSelection(false)}
                      style={{ fontSize: 13 }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      disabled={!manualField}
                      onClick={() => handleSelectJobField(manualField)}
                      style={{
                        padding: '10px 24px',
                        fontSize: 14,
                        fontWeight: 600,
                        opacity: !manualField ? 0.6 : 1,
                      }}
                    >
                      Continue to Skill Gap Analysis <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
