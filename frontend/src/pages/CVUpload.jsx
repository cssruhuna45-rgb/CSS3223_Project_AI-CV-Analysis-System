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
import BulletTuner from '../components/BulletTuner';
import StepBar from '../components/StepBar';
import { PREDEFINED_JOB_FIELDS, getJobFieldName } from '../constants/jobFields';

export default function CVUpload() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const requestRef = useRef(null);
  const savedUploadRef = useRef(null);
  const uploadKeyRef = useRef(null);
  const [stage, setStage] = useState('');
  const [restoreRetry, setRestoreRetry] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [notice, setNotice] = useState('');
  const [canRetry, setCanRetry] = useState(false);
  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    if (!stage) return undefined;
    setElapsed(0);
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [stage]);

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
    const controller = new AbortController();
    requestRef.current = controller;
    const options = { signal: controller.signal };
    setError('');
    setStage('Loading your saved CV analysis');

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
        const cvReview = await aiResumeAPI.feedback(resumeId, resumeText, options);
        if (cancelled || controller.signal.aborted) return;
        sessionStorage.setItem('cvReview', JSON.stringify(cvReview));
        setReview(cvReview);
      } catch (err) {
        console.error('[CVUpload] CV review failed:', err);
        if (!cancelled && !controller.signal.aborted) setReviewError(err.message || 'Could not review the CV.');
      } finally {
        if (!cancelled && !controller.signal.aborted) setReviewLoading(false);
      }
    };

    (async () => {
      setRestoring(true);
      try {
        const stored = await resumeAPI.getAnalysis(resumeId, options);
        if (cancelled || controller.signal.aborted) return;
        applyAnalysis(stored);
        await runReview();
      } catch (err) {
        if (err.status !== 404) {
          if (!cancelled && !controller.signal.aborted) setError(err.message || 'Could not load the saved analysis.');
          return;
        }
        // A 404 is expected when the upload's analysis did not finish.
        console.warn('[CVUpload] No stored analysis, re-analysing:', err.message);
        if (!resumeText) {
          if (!cancelled && !controller.signal.aborted) {
            setError('That CV could not be loaded. Please upload it again.');
          }
          return;
        }
        try {
          const fresh = await resumeAPI.analyze(resumeId, options);
          if (cancelled || controller.signal.aborted) return;
          applyAnalysis(fresh);
          await runReview();
        } catch (analyseErr) {
          console.error('[CVUpload] Re-analysis failed:', analyseErr);
          if (!cancelled && !controller.signal.aborted) {
            setError(analyseErr.message || 'Could not load your saved CV.');
          }
        }
      } finally {
        if (requestRef.current === controller) {
          requestRef.current = null;
          setRestoring(false);
          setStage('');
        }
      }
    })();

    return () => { cancelled = true; controller.abort(); if (requestRef.current === controller) requestRef.current = null; };
  }, [restoreRetry]);

  const handleFile = (f) => {
    if (!f || requestRef.current || restoring) return;
    let message = '';
    if (!f.name.toLowerCase().endsWith('.pdf') || (f.type && f.type !== 'application/pdf')) {
      message = 'Choose a PDF file to continue.';
    } else if (!f.size) message = 'This file is empty. Choose a PDF that contains your CV.';
    else if (f.size > 10 * 1024 * 1024) message = 'This PDF is larger than 10 MB. Choose a smaller PDF or reduce its size.';
    setError(message);
    setCanRetry(false);
    if (message) { if (fileRef.current) fileRef.current.value = ''; return; }
    setFile(f);
    savedUploadRef.current = null;
    uploadKeyRef.current = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
    setNotice('');
    setAnalysis(null);
    setReview(null);
    ['cvReview', 'resumeId', 'resumeText', 'resumeAnalysis'].forEach((key) => sessionStorage.removeItem(key));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    if (!requestRef.current && !restoring) handleFile(e.dataTransfer.files?.[0]);
  };

  const cancelAnalysis = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setRestoring(false);
    setReviewLoading(false);
    setStage('');
    setNotice('Stopped waiting. Work already received by the server may still finish; any saved CV is kept.');
  };

  const handleAnalyze = async () => {
    if (requestRef.current || restoring) return;
    if (!file) { setError('Please select a PDF resume file first.'); return; }
    const controller = new AbortController();
    requestRef.current = controller;
    const options = { signal: controller.signal, requestKey: uploadKeyRef.current };
    const active = () => requestRef.current === controller && !controller.signal.aborted;
    setLoading(true);
    setError('');
    setNotice('');
    setCanRetry(false);
    try {
      let resumeData = savedUploadRef.current;
      if (!resumeData) {
        setStage('Uploading your CV and reading its text');
        resumeData = await resumeAPI.upload(file, options);
        if (!active()) return;
        savedUploadRef.current = resumeData;
      }
      const resumeId = resumeData?.id;
      const resumeText = resumeData?.extractedText || '';
      if (!resumeId || !resumeText.trim()) {
        setCanRetry(false);
        throw new Error('We could not read text from this PDF. Choose a text-based PDF or a clearer scan.');
      }
      sessionStorage.setItem('resumeId', String(resumeId));
      sessionStorage.setItem('resumeText', resumeText);
      setStage('Analysing your skills and career matches');
      let aiResult;
      try {
        aiResult = await resumeAPI.getAnalysis(resumeId, options);
      } catch (err) {
        if (!active()) return;
        if (err.status !== 404) throw err;
        aiResult = await resumeAPI.analyze(resumeId, options);
      }
      if (!active()) return;
      sessionStorage.setItem('resumeAnalysis', JSON.stringify(aiResult));
      setAnalysis(aiResult);
      if (aiResult.recommended_job_fields?.length) setManualField(aiResult.recommended_job_fields[0].field);
      setStage('Preparing feedback on your CV');
      setReviewLoading(true);
      setReviewError('');
      try {
        const result = await aiResumeAPI.feedback(resumeId, resumeText, options);
        if (!active()) return;
        sessionStorage.setItem('cvReview', JSON.stringify(result));
        setReview(result);
      } catch (err) {
        if (active()) setReviewError(err.message || 'Could not prepare CV feedback.');
      }
    } catch (err) {
      if (active()) {
        setError(err.message || 'Could not analyse your CV. Please try again.');
        setCanRetry(!savedUploadRef.current || Boolean(savedUploadRef.current.extractedText?.trim()));
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
        setReviewLoading(false);
        setStage('');
      }
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
    if (requestRef.current || restoring) return;
    savedUploadRef.current = null;
    uploadKeyRef.current = null;
    setReview(null);
    setNotice('');
    setCanRetry(false);
    ['resumeId', 'resumeText', 'cvReview'].forEach((key) => sessionStorage.removeItem(key));
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
      {notice && <p role="status" className="card" style={{ padding: 16 }}>{notice}</p>}
      {(loading || restoring) && <section className="card" style={{ padding: 16, margin: '16px 0' }}>
        <p role="status" aria-live="polite"><strong>{stage}...</strong></p>
        <p style={{ margin: '8px 0' }}>{elapsed}s elapsed{elapsed >= 30 ? ' - This is taking longer than usual. You can keep waiting or cancel.' : ''}</p>
        <button type="button" className="btn btn-outline" onClick={cancelAnalysis}>Cancel</button>
      </section>}

      {/* Header */}
      <div style={{ marginBottom: 36, textAlign: 'center' }}>
        <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Upload Your Resume
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-base)', maxWidth: 580, margin: '0 auto', lineHeight: 1.6 }}>
          Our AI extracts your technical qualifications, identifies your strongest career matches, and prepares a tailored interview plan.
        </p>
      </div>

      {/* Loading the CV the candidate already has. */}
      {restoring && !analysis && (
        <div
          className="card"
          style={{
            marginBottom: 32, background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)',
            border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)', borderTop: '3px solid var(--accent)',
            padding: 40, textAlign: 'center',
          }}
          role="status"
          aria-live="polite"
        >
          <Loader
            size={28}
            color="var(--accent)"
            style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }}
          />
          <p style={{ fontSize: 'var(--fs-base)', fontWeight: 700, margin: '14px 0 6px', color: 'var(--text-primary)' }}>
            Loading your CV
          </p>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
            Bringing back the analysis from your last visit.
          </p>
        </div>
      )}

      {/* Upload Zone & Actions */}
      {!analysis && !restoring && (
        <div className="card" style={{ marginBottom: 32, background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)', border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)', borderTop: '3px solid var(--accent)' }}>
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
              border: `2px dashed ${drag ? 'var(--accent)' : file ? 'color-mix(in srgb, var(--accent) 45%, transparent)' : 'color-mix(in srgb, var(--fg) 15%, transparent)'}`,
              borderRadius: 16,
              background: drag ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : file ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'color-mix(in srgb, var(--fg) 2%, transparent)',
              transition: 'all 0.22s ease',
              boxShadow: drag ? '0 0 24px color-mix(in srgb, var(--accent) 20%, transparent) inset' : 'none',
              outline: 'none',
            }}
          >
            <input
              ref={fileRef}
              type="file"
              disabled={loading || restoring}
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
                  background: 'linear-gradient(color-mix(in srgb, var(--accent) 25%, transparent), color-mix(in srgb, var(--accent) 25%, transparent))',
                  border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: 'none',
                }}>
                  <FileText size={30} color="var(--accent)" />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 'var(--fs-base)', color: 'var(--text-primary)', marginBottom: 4 }}>
                  {file.name}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', marginBottom: 18 }}>
                  {(file.size / 1024).toFixed(1)} KB · PDF Document
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={loading || restoring}
                    onClick={(e) => { e.stopPropagation(); handleReset(); if (fileRef.current) fileRef.current.value = ''; }}
                    style={{ fontSize: 'var(--fs-sm)', padding: '8px 16px' }}
                    aria-label="Remove chosen file"
                  >
                    <X size={14} /> Remove File
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={(e) => { e.stopPropagation(); fileRef.current && fileRef.current.click(); }}
                    style={{ fontSize: 'var(--fs-sm)', padding: '8px 16px' }}
                    disabled={loading || restoring}
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
                  background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <Upload size={28} color="var(--accent)" />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 'var(--fs-base)', color: 'var(--text-primary)', marginBottom: 6 }}>
                  Drag & drop your resume PDF here
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', marginBottom: 16 }}>
                  or <span style={{ color: 'var(--accent)', textDecoration: 'underline', fontWeight: 600 }}>browse files</span> on your device
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>
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
                background: 'color-mix(in srgb, var(--danger) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
                borderRadius: 12,
                padding: '12px 16px',
                marginTop: 18,
              }}
            >
              <AlertCircle size={18} color="var(--danger)" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--danger)', margin: 0, flex: 1 }}>{error}</p>
              {!file && sessionStorage.getItem('resumeId') && <button className="btn btn-outline" onClick={() => setRestoreRetry((n) => n + 1)}>Retry loading CV</button>}
              {canRetry && <button
                type="button"
                className="btn btn-outline"
                disabled={loading}
                onClick={handleAnalyze}
                style={{ fontSize: 'var(--fs-xs)', padding: '6px 12px' }}
              >
                Retry analysis
              </button>}
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
                fontSize: 'var(--fs-base)',
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
            background: 'color-mix(in srgb, var(--success) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
            borderLeft: '4px solid var(--success)',
            borderRadius: 14,
            padding: '16px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'color-mix(in srgb, var(--success) 15%, transparent)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid color-mix(in srgb, var(--success) 40%, transparent)',
              }}>
                <CheckCircle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--success)', margin: 0 }}>
                  Resume Analysis Complete ✓
                </h3>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', margin: 0 }}>
                  Profile extracted successfully. Select your target career track to proceed.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              disabled={loading || restoring} onClick={handleReset}
              style={{ fontSize: 'var(--fs-xs)', padding: '6px 14px' }}
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
                background: 'linear-gradient(color-mix(in srgb, var(--accent) 12%, transparent), color-mix(in srgb, var(--accent) 12%, transparent))',
                border: '1.5px solid color-mix(in srgb, var(--accent) 35%, transparent)',
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
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  <Sparkles size={12} color="var(--accent)" /> Recommended Career Track
                </div>
                <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                  {topMatch.name || getJobFieldName(topMatch.field)}
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
                  <span className="badge" style={{ background: 'color-mix(in srgb, var(--accent) 25%, transparent)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)' }}>
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
                    fontSize: 'var(--fs-sm)',
                    fontWeight: 700,
                    boxShadow: 'none',
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
                <span className="tab-badge" style={{ color: review.score >= 70 ? 'var(--success)' : 'var(--warning)' }}>
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
                <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Ranked Career Tracks
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', margin: 0 }}>
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
                        background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)',
                        border: isTopMatch ? '1.5px solid var(--accent)' : '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
                        borderRadius: 16,
                        padding: 22,
                        position: 'relative',
                        boxShadow: isTopMatch ? '0 10px 30px color-mix(in srgb, var(--accent) 22%, transparent)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isTopMatch && (
                        <div style={{
                          position: 'absolute',
                          top: -11,
                          right: 20,
                          background: 'linear-gradient(var(--accent-solid), var(--accent-solid))',
                          color: 'var(--on-accent)',
                          fontSize: 'var(--fs-xs)',
                          fontWeight: 700,
                          padding: '3px 12px',
                          borderRadius: 12,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          boxShadow: '0 2px 10px color-mix(in srgb, var(--accent) 40%, transparent)',
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
                            <h4 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                              {rec.name || getJobFieldName(rec.field)}
                            </h4>
                          </div>
                          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
                            {matchPct >= 60
                              ? 'Strong foundational alignment with your existing skillset and background.'
                              : matchPct >= 35
                              ? 'Adjacent competencies identified; quick ramp-up possible with targeted interview prep.'
                              : 'Emerging transition path requiring focused skill acquisition.'}
                          </p>

                          {/* Visual Progress Indicator */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 360 }}>
                            <div style={{ flex: 1, height: 8, background: 'color-mix(in srgb, var(--fg) 8%, transparent)', borderRadius: 4, overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  background: isTopMatch
                                    ? 'linear-gradient(var(--accent-solid), var(--accent-solid))'
                                    : 'linear-gradient(var(--accent-solid), var(--accent-solid))',
                                  width: `${matchPct}%`,
                                  borderRadius: 4,
                                  transition: 'width 0.8s ease',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: isTopMatch ? 'var(--accent)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
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
                              fontSize: 'var(--fs-sm)',
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
                  background: 'color-mix(in srgb, var(--bg-surface) 60%, transparent)',
                  border: '1px dashed color-mix(in srgb, var(--fg) 15%, transparent)',
                  borderRadius: 16,
                  padding: 24,
                  textAlign: 'center',
                  marginTop: 8,
                }}
              >
                <div style={{ marginBottom: 14 }}>
                  <h4 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Want to interview for a different role?
                  </h4>
                  <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', margin: 0 }}>
                    Select any of our specialized tracks to tailor your skill gap analysis and mock questions.
                  </p>
                </div>

                {!showManualSelection ? (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowManualSelection(true)}
                    style={{ fontSize: 'var(--fs-sm)', padding: '9px 20px', margin: '4px auto 0' }}
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
                              background: isSelected ? 'color-mix(in srgb, var(--accent) 18%, transparent)' : 'color-mix(in srgb, var(--bg-surface) 50%, transparent)',
                              border: `1px solid ${isSelected ? 'var(--accent)' : 'color-mix(in srgb, var(--fg) 8%, transparent)'}`,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              outline: 'none',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 'var(--fs-sm)', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                                {jf.name}
                              </div>
                              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', marginTop: 2 }}>
                                {jf.category}
                              </div>
                            </div>
                            {isSelected && <Check size={16} color="var(--accent)" />}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setShowManualSelection(false)}
                        style={{ fontSize: 'var(--fs-sm)' }}
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
                          fontSize: 'var(--fs-sm)',
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
              {/* Fixes what the review found, one bullet at a time. */}
              <BulletTuner suggestions={review?.weak_bullets || []} />
            </div>
          )}

          {/* ── TAB PANEL 3: EXTRACTED PROFILE DETAILS ── */}
          {activeTab === 'profile' && (
            <div id="panel-profile" role="tabpanel" aria-labelledby="tab-profile" className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Candidate Summary */}
              {analysis.summary && (
                <div className="card" style={{ background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)', border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)', borderTop: '3px solid var(--accent)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <FileText size={18} color="var(--accent)" />
                    <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--accent)', margin: 0 }}>Executive Summary</h3>
                  </div>
                  <p style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.7, color: 'var(--text-primary)', margin: 0 }}>
                    {analysis.summary}
                  </p>
                </div>
              )}

              {/* Technical Skills */}
              {analysis.skills && analysis.skills.length > 0 && (
                <div className="card" style={{ background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)', border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)', borderTop: '3px solid var(--success)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Sparkles size={18} color="var(--success)" />
                      <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--success)', margin: 0 }}>Technical Skills</h3>
                    </div>
                    <span
                      className="badge"
                      style={{
                        background: 'color-mix(in srgb, var(--success) 12%, transparent)',
                        color: 'var(--success)',
                        border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)',
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
                          fontSize: 'var(--fs-sm)',
                          background: 'color-mix(in srgb, var(--success) 10%, transparent)',
                          color: 'var(--success)',
                          border: '1px solid color-mix(in srgb, var(--success) 28%, transparent)',
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
                  <div className="card" style={{ background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)', border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)', borderTop: '3px solid var(--warning)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <Briefcase size={18} color="var(--warning)" />
                      <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--warning)', margin: 0 }}>Work Experience</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {analysis.experience.map((exp, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 10,
                            background: 'color-mix(in srgb, var(--warning) 7%, transparent)',
                            border: '1px solid color-mix(in srgb, var(--warning) 22%, transparent)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {exp.role || 'Role'}
                            </div>
                            {exp.duration && (
                              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--warning)', background: 'color-mix(in srgb, var(--warning) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                                {exp.duration}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--warning)', marginTop: 2 }}>
                            {exp.company || 'Company'}
                          </div>
                          {exp.description && (
                            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-primary)', marginTop: 6, lineHeight: 1.5, margin: '6px 0 0' }}>
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
                  <div className="card" style={{ background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)', border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)', borderTop: '3px solid var(--accent)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <GraduationCap size={18} color="var(--accent)" />
                      <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--accent)', margin: 0 }}>Education</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {analysis.education.map((edu, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 10,
                            background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                            border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
                          }}
                        >
                          <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {edu.degree || 'Degree'} {edu.field ? `in ${edu.field}` : ''}
                          </div>
                          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent)', marginTop: 2 }}>
                            {edu.institution || 'University / Institution'}
                          </div>
                          {edu.year && (
                            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
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
                <div className="card" style={{ background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)', border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)', borderTop: '3px solid var(--accent)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <FolderGit2 size={18} color="var(--accent)" />
                    <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--accent)', margin: 0 }}>Projects</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                    {analysis.projects.map((proj, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '14px',
                          borderRadius: 10,
                          background: 'color-mix(in srgb, var(--accent) 7%, transparent)',
                          border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
                        }}
                      >
                        <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>
                          {proj.name}
                        </div>
                        {proj.description && (
                          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.5, margin: '0 0 10px' }}>
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
                                  fontSize: 'var(--fs-xs)',
                                  padding: '2px 8px',
                                  background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                                  color: 'var(--accent)',
                                  border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
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
                <div className="card" style={{ background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)', border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)', borderTop: '3px solid var(--accent)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <Award size={18} color="var(--accent)" />
                    <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--accent)', margin: 0 }}>Certifications</h3>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {analysis.certifications.map((cert, idx) => (
                      <span
                        key={idx}
                        className="badge"
                        style={{
                          padding: '6px 12px',
                          fontSize: 'var(--fs-sm)',
                          background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                          color: 'var(--accent)',
                          border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
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
