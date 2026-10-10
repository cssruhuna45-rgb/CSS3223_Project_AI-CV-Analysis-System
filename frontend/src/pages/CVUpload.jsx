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
  const [restoring, setRestoring] = useState(false);
  const [showManualSelection, setShowManualSelection] = useState(false);
  const [manualField, setManualField] = useState('');
  const [activeTab, setActiveTab] = useState('career'); // 'career' | 'feedback' | 'profile'

  // Restore whatever the candidate already has, so a returning visit
  // does not start from an empty upload form.
  useEffect(() => {
    let cancelled = false;

    const savedJobField = sessionStorage.getItem('selectedJobField');
    if (savedJobField) setManualField(savedJobField);

    const cachedAnalysis = sessionStorage.getItem('resumeAnalysis');
    if (cachedAnalysis) {
      try {
        setAnalysis(JSON.parse(cachedAnalysis));
        const cachedReview = sessionStorage.getItem('cvReview');
        if (cachedReview) setReview(JSON.parse(cachedReview));
        return;
      } catch (e) {
        console.error('[CVUpload] Cached analysis was unreadable:', e);
      }
    }

    // Set by the home page when starting from a saved CV.
    const resumeId = sessionStorage.getItem('resumeId');
    const resumeText = sessionStorage.getItem('resumeText') || '';
    if (!resumeId) return;

    const applyAnalysis = (result) => {
      sessionStorage.setItem('resumeAnalysis', JSON.stringify(result));
      setAnalysis(result);
      if (result.recommended_job_fields?.length && !savedJobField) {
        setManualField(result.recommended_job_fields[0].field);
      }
    };

    const runReview = async () => {
      if (!resumeText) return;
      setReviewLoading(true);
      try {
        const cvReview = await aiResumeAPI.feedback(resumeId, resumeText);
        if (cancelled) return;
        sessionStorage.setItem('cvReview', JSON.stringify(cvReview));
        setReview(cvReview);
      } catch (err) {
        console.error('[CVUpload] CV review failed:', err);
        if (!cancelled) setReviewError(err.message || 'Could not review the CV.');
      } finally {
        if (!cancelled) setReviewLoading(false);
      }
    };

    (async () => {
      setRestoring(true);
      try {
        const stored = await resumeAPI.getAnalysis(resumeId);
        if (cancelled) return;
        applyAnalysis(stored);
        runReview();
      } catch (err) {
        // A 404 is expected when the upload's analysis did not finish.
        console.warn('[CVUpload] No stored analysis, re-analysing:', err.message);
        if (!resumeText) {
          if (!cancelled) {
            setError('That CV could not be loaded. Please upload it again.');
          }
          return;
        }
        try {
          const fresh = await aiResumeAPI.analyze(resumeId, resumeText);
          if (cancelled) return;
          applyAnalysis(fresh);
          runReview();
        } catch (analyseErr) {
          console.error('[CVUpload] Re-analysis failed:', analyseErr);
          if (!cancelled) {
            setError(analyseErr.message || 'Could not load your saved CV.');
          }
        }
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const handleFile = (f) => {
    if (!f) return;
    if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
      setFile(f);
      setError('');
      setAnalysis(null);
      setReview(null);
      sessionStorage.removeItem('cvReview');
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
    setActiveTab('career');
    sessionStorage.removeItem('resumeAnalysis');
    sessionStorage.removeItem('selectedJobField');
    sessionStorage.removeItem('selectedJobFieldName');
    sessionStorage.removeItem('skillGapResult');
  };

  // Sort recommendations by match percentage descending
  const recommendedFields = (analysis?.recommended_job_fields || []).slice().sort(
    (a, b) => (b.match_percentage || 0) - (a.match_percentage || 0)
  );

  const topMatch = recommendedFields[0] || null;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px 80px' }} className="animate-fade-in">
      <StepBar current={1} />

      {/* Header */}
      <div style={{ marginBottom: 36, textAlign: 'center' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
          Upload Your Resume
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 580, margin: '0 auto', lineHeight: 1.6 }}>
          Our AI extracts your technical qualifications, identifies your strongest career matches, and prepares a tailored interview plan.
        </p>
      </div>

      {/* Loading the CV the candidate already has. */}
      {restoring && !analysis && (
        <div
          className="card"
          style={{
            marginBottom: 32, background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)', borderTop: '3px solid #6366F1',
            padding: 40, textAlign: 'center',
          }}
          role="status"
          aria-live="polite"
        >
          <Loader
            size={28}
            color="#818CF8"
            style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }}
          />
          <p style={{ fontSize: 16, fontWeight: 700, margin: '14px 0 6px', color: '#F8FAFC' }}>
            Loading your CV
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
            Bringing back the analysis from your last visit.
          </p>
        </div>
      )}

      {/* Upload Zone & Actions */}
      {!analysis && !restoring && (
        <div className="card" style={{ marginBottom: 32, background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderTop: '3px solid #6366F1' }}>
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload PDF resume by clicking or dragging file here"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                !file && fileRef.current && fileRef.current.click();
              }
            }}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            onClick={() => !file && fileRef.current && fileRef.current.click()}
            style={{
              padding: '44px 24px',
              textAlign: 'center',
              cursor: file ? 'default' : 'pointer',
              border: `2px dashed ${drag ? '#22D3EE' : file ? 'rgba(99, 102, 241, 0.45)' : 'rgba(255, 255, 255, 0.15)'}`,
              borderRadius: 16,
              background: drag ? 'rgba(6, 182, 212, 0.08)' : file ? 'rgba(99, 102, 241, 0.06)' : 'rgba(255, 255, 255, 0.02)',
              transition: 'all 0.22s ease',
              boxShadow: drag ? '0 0 24px rgba(6, 182, 212, 0.2) inset' : 'none',
              outline: 'none',
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
                  width: 60,
                  height: 60,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(6, 182, 212, 0.25))',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 4px 18px rgba(99, 102, 241, 0.3)',
                }}>
                  <FileText size={30} color="#22D3EE" />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 16.5, color: '#F8FAFC', marginBottom: 4 }}>
                  {file.name}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 18 }}>
                  {(file.size / 1024).toFixed(1)} KB · PDF Document
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={(e) => { e.stopPropagation(); setFile(null); setError(''); }}
                    style={{ fontSize: 13, padding: '8px 16px' }}
                    aria-label="Remove chosen file"
                  >
                    <X size={14} /> Remove File
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={(e) => { e.stopPropagation(); fileRef.current && fileRef.current.click(); }}
                    style={{ fontSize: 13, padding: '8px 16px' }}
                    aria-label="Choose a different PDF file"
                  >
                    Change File
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: 14,
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <Upload size={28} color="#22D3EE" />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 16.5, color: '#F8FAFC', marginBottom: 6 }}>
                  Drag & drop your resume PDF here
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginBottom: 16 }}>
                  or <span style={{ color: '#22D3EE', textDecoration: 'underline', fontWeight: 600 }}>browse files</span> on your device
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-sub)' }}>
                  <span>Supported format: PDF only</span>
                  <span>•</span>
                  <span>Max size: 10MB</span>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 12,
                padding: '12px 16px',
                marginTop: 18,
              }}
            >
              <AlertCircle size={18} color="var(--danger)" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#FCA5A5', margin: 0, flex: 1 }}>{error}</p>
              <button
                type="button"
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
              type="button"
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

      {/* ── ANALYSIS COMPLETE VIEW WITH PROGRESSIVE DISCLOSURE ── */}
      {analysis && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* 1. Success Banner & Re-upload Action */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderLeft: '4px solid #10B981',
            borderRadius: 14,
            padding: '16px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34D399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(16, 185, 129, 0.4)',
              }}>
                <CheckCircle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#34D399', margin: 0 }}>
                  Resume Analysis Complete ✓
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  Profile extracted successfully. Select your target career track to proceed.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={handleReset}
              style={{ fontSize: 12.5, padding: '6px 14px' }}
              aria-label="Upload a different resume"
            >
              <RotateCcw size={13} /> Re-upload
            </button>
          </div>

          {/* 2. Top Match Quick Action Strip (HCI Fast Highway for Candidates) */}
          {topMatch && (
            <div
              className="card"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(6, 182, 212, 0.08))',
                border: '1.5px solid rgba(99, 102, 241, 0.35)',
                borderRadius: 16,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  <Sparkles size={12} color="#22D3EE" /> Recommended Career Track
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#F8FAFC', margin: '0 0 6px' }}>
                  {topMatch.name || getJobFieldName(topMatch.field)}
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.25)', color: '#C7D2FE', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
                    {topMatch.match_percentage}% Match
                  </span>
                  <span>•</span>
                  <span>{analysis.skills?.length || 0} Skills Extracted</span>
                  {analysis.experience?.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{analysis.experience.length} Experience Records</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleSelectJobField(topMatch.field, topMatch.name)}
                  style={{
                    padding: '12px 22px',
                    fontSize: 14,
                    fontWeight: 700,
                    boxShadow: '0 4px 18px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  Accept & Continue to Skill Gap <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* 3. Progressive Disclosure Tabs (Cognitive Load Management) */}
          <div
            className="tab-nav-container"
            role="tablist"
            aria-label="Resume analysis view tabs"
          >
            <button
              type="button"
              role="tab"
              id="tab-career"
              aria-selected={activeTab === 'career'}
              aria-controls="panel-career"
              className={`tab-nav-btn ${activeTab === 'career' ? 'tab-nav-btn-active' : ''}`}
              onClick={() => setActiveTab('career')}
            >
              <Compass size={16} />
              <span>Career Tracks</span>
              <span className="tab-badge">{recommendedFields.length}</span>
            </button>

            <button
              type="button"
              role="tab"
              id="tab-feedback"
              aria-selected={activeTab === 'feedback'}
              aria-controls="panel-feedback"
              className={`tab-nav-btn ${activeTab === 'feedback' ? 'tab-nav-btn-active' : ''}`}
              onClick={() => setActiveTab('feedback')}
            >
              <FileText size={16} />
              <span>Resume Review</span>
              {review?.score != null && (
                <span className="tab-badge" style={{ color: review.score >= 70 ? '#34D399' : '#FBBF24' }}>
                  {review.score}/100
                </span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              id="tab-profile"
              aria-selected={activeTab === 'profile'}
              aria-controls="panel-profile"
              className={`tab-nav-btn ${activeTab === 'profile' ? 'tab-nav-btn-active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <Sparkles size={16} />
              <span>Extracted Details</span>
              <span className="tab-badge">{analysis.skills?.length || 0} skills</span>
            </button>
          </div>

          {/* ── TAB PANEL 1: CAREER TRACKS & RECOMMENDATIONS ── */}
          {activeTab === 'career' && (
            <div id="panel-career" role="tabpanel" aria-labelledby="tab-career" className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ marginBottom: 4 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC', marginBottom: 4 }}>
                  Ranked Career Tracks
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
                  Based on your technical qualifications, we have evaluated your compatibility with industry tracks.
                </p>
              </div>

              {/* Recommendation Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {recommendedFields.map((rec, idx) => {
                  const isTopMatch = idx === 0;
                  const matchPct = rec.match_percentage || 0;

                  return (
                    <div
                      key={rec.field || idx}
                      className="card"
                      style={{
                        background: 'rgba(15, 23, 42, 0.75)',
                        border: isTopMatch ? '1.5px solid #6366F1' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 16,
                        padding: 22,
                        position: 'relative',
                        boxShadow: isTopMatch ? '0 10px 30px rgba(99, 102, 241, 0.22)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isTopMatch && (
                        <div style={{
                          position: 'absolute',
                          top: -11,
                          right: 20,
                          background: 'linear-gradient(135deg, #6366F1, #06B6D4)',
                          color: '#FFFFFF',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 12px',
                          borderRadius: 12,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          boxShadow: '0 2px 10px rgba(99, 102, 241, 0.4)',
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
                            <h4 style={{ fontSize: 17, fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                              {rec.name || getJobFieldName(rec.field)}
                            </h4>
                          </div>
                          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
                            {matchPct >= 60
                              ? 'Strong foundational alignment with your existing skillset and background.'
                              : matchPct >= 35
                              ? 'Adjacent competencies identified; quick ramp-up possible with targeted interview prep.'
                              : 'Emerging transition path requiring focused skill acquisition.'}
                          </p>

                          {/* Visual Progress Indicator */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 360 }}>
                            <div style={{ flex: 1, height: 8, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 4, overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  background: isTopMatch
                                    ? 'linear-gradient(90deg, #6366F1, #06B6D4)'
                                    : 'linear-gradient(90deg, #818CF8, #38BDF8)',
                                  width: `${matchPct}%`,
                                  borderRadius: 4,
                                  transition: 'width 0.8s ease',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: isTopMatch ? '#22D3EE' : '#94A3B8', whiteSpace: 'nowrap' }}>
                              {matchPct}% Match
                            </span>
                          </div>
                        </div>

                        <div>
                          <button
                            type="button"
                            className={isTopMatch ? 'btn btn-primary' : 'btn btn-outline'}
                            onClick={() => handleSelectJobField(rec.field, rec.name)}
                            style={{
                              padding: '11px 20px',
                              fontSize: 13.5,
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
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px dashed rgba(255, 255, 255, 0.15)',
                  borderRadius: 16,
                  padding: 24,
                  textAlign: 'center',
                  marginTop: 8,
                }}
              >
                <div style={{ marginBottom: 14 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', marginBottom: 4 }}>
                    Want to interview for a different role?
                  </h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                    Select any of our specialized tracks to tailor your skill gap analysis and mock questions.
                  </p>
                </div>

                {!showManualSelection ? (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowManualSelection(true)}
                    style={{ fontSize: 13, padding: '9px 20px', margin: '4px auto 0' }}
                  >
                    <Compass size={14} /> Choose Another Track
                  </button>
                ) : (
                  <div style={{ marginTop: 18, textAlign: 'left' }} className="animate-fade-in">
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                      gap: 10,
                      marginBottom: 18,
                    }}>
                      {PREDEFINED_JOB_FIELDS.map((jf) => {
                        const isSelected = manualField === jf.id;
                        return (
                          <div
                            key={jf.id}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setManualField(jf.id);
                              }
                            }}
                            onClick={() => setManualField(jf.id)}
                            style={{
                              padding: '12px 14px',
                              borderRadius: 10,
                              background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'rgba(30, 41, 59, 0.5)',
                              border: `1px solid ${isSelected ? '#818CF8' : 'rgba(255, 255, 255, 0.08)'}`,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              outline: 'none',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#A5B4FC' : '#F8FAFC' }}>
                                {jf.name}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 2 }}>
                                {jf.category}
                              </div>
                            </div>
                            {isSelected && <Check size={16} color="#22D3EE" />}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setShowManualSelection(false)}
                        style={{ fontSize: 13 }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!manualField}
                        onClick={() => handleSelectJobField(manualField)}
                        style={{
                          padding: '10px 22px',
                          fontSize: 13.5,
                          fontWeight: 600,
                          opacity: !manualField ? 0.6 : 1,
                        }}
                      >
                        Continue to Skill Gap Analysis <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB PANEL 2: AI CV FEEDBACK & WRITING ANALYSIS ── */}
          {activeTab === 'feedback' && (
            <div id="panel-feedback" role="tabpanel" aria-labelledby="tab-feedback" className="animate-fade-in">
              <CVFeedback
                review={review}
                loading={reviewLoading}
                error={reviewError}
              />
            </div>
          )}

          {/* ── TAB PANEL 3: EXTRACTED PROFILE DETAILS ── */}
          {activeTab === 'profile' && (
            <div id="panel-profile" role="tabpanel" aria-labelledby="tab-profile" className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Candidate Summary */}
              {analysis.summary && (
                <div className="card" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderTop: '3px solid #38BDF8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <FileText size={18} color="#38BDF8" />
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#38BDF8', margin: 0 }}>Executive Summary</h3>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: '#E2E8F0', margin: 0 }}>
                    {analysis.summary}
                  </p>
                </div>
              )}

              {/* Technical Skills */}
              {analysis.skills && analysis.skills.length > 0 && (
                <div className="card" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderTop: '3px solid #10B981' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Sparkles size={18} color="#10B981" />
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#10B981', margin: 0 }}>Technical Skills</h3>
                    </div>
                    <span
                      className="badge"
                      style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#34D399',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                      }}
                    >
                      {analysis.skills.length} Extracted
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {analysis.skills.map((s, idx) => (
                      <span
                        key={idx}
                        className="badge"
                        style={{
                          padding: '6px 12px',
                          fontSize: 13,
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#6EE7B7',
                          border: '1px solid rgba(16, 185, 129, 0.28)',
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Education & Experience Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                {/* Experience */}
                {analysis.experience && analysis.experience.length > 0 && (
                  <div className="card" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderTop: '3px solid #F59E0B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <Briefcase size={18} color="#F59E0B" />
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FBBF24', margin: 0 }}>Work Experience</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {analysis.experience.map((exp, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 10,
                            background: 'rgba(245, 158, 11, 0.07)',
                            border: '1px solid rgba(245, 158, 11, 0.22)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#F8FAFC' }}>
                              {exp.role || 'Role'}
                            </div>
                            {exp.duration && (
                              <span style={{ fontSize: 11.5, color: '#FBBF24', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                                {exp.duration}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: '#FDE68A', marginTop: 2 }}>
                            {exp.company || 'Company'}
                          </div>
                          {exp.description && (
                            <p style={{ fontSize: 12.5, color: '#E2E8F0', marginTop: 6, lineHeight: 1.5, margin: '6px 0 0' }}>
                              {exp.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {analysis.education && analysis.education.length > 0 && (
                  <div className="card" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderTop: '3px solid #A855F7' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <GraduationCap size={18} color="#A855F7" />
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#C084FC', margin: 0 }}>Education</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {analysis.education.map((edu, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 10,
                            background: 'rgba(168, 85, 247, 0.08)',
                            border: '1px solid rgba(168, 85, 247, 0.22)',
                          }}
                        >
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#F8FAFC' }}>
                            {edu.degree || 'Degree'} {edu.field ? `in ${edu.field}` : ''}
                          </div>
                          <div style={{ fontSize: 13, color: '#E9D5FF', marginTop: 2 }}>
                            {edu.institution || 'University / Institution'}
                          </div>
                          {edu.year && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                              Year: {edu.year}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Projects */}
              {analysis.projects && analysis.projects.length > 0 && (
                <div className="card" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderTop: '3px solid #06B6D4' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <FolderGit2 size={18} color="#06B6D4" />
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#06B6D4', margin: 0 }}>Projects</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                    {analysis.projects.map((proj, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '14px',
                          borderRadius: 10,
                          background: 'rgba(6, 182, 212, 0.07)',
                          border: '1px solid rgba(6, 182, 212, 0.22)',
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#67E8F9', marginBottom: 4 }}>
                          {proj.name}
                        </div>
                        {proj.description && (
                          <p style={{ fontSize: 13, color: '#E2E8F0', marginBottom: 10, lineHeight: 1.5, margin: '0 0 10px' }}>
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
                                  background: 'rgba(6, 182, 212, 0.12)',
                                  color: '#22D3EE',
                                  border: '1px solid rgba(6, 182, 212, 0.3)',
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

              {/* Certifications */}
              {analysis.certifications && analysis.certifications.length > 0 && (
                <div className="card" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderTop: '3px solid #EC4899' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <Award size={18} color="#EC4899" />
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
                          background: 'rgba(236, 72, 153, 0.12)',
                          color: '#F472B6',
                          border: '1px solid rgba(236, 72, 153, 0.35)',
                        }}
                      >
                        <Award size={13} /> {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
