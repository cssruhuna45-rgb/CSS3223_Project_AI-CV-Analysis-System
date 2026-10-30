import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Briefcase, FileText, ShieldCheck, Send, CheckCircle,
  AlertCircle, Clock, Upload,
} from 'lucide-react';
import { jobsAPI, resumeAPI } from '../services/api';
import { applicationsAPI } from '../services/jobApplicationsApi';
import { PREDEFINED_JOB_FIELDS } from '../constants/jobFields';
import { Button, Card, SectionHeader, Badge } from '../components/ui';

function fieldName(id) {
  return PREDEFINED_JOB_FIELDS.find((f) => f.id === id)?.name || id;
}

/**
 * Where a candidate applies for a job.
 *
 * This is the step an invite code used to skip. The candidate reads the
 * job and its required skills, picks which of their CVs to send, and
 * ticks a box to agree to share it. The tick starts clear and nothing
 * but the candidate clicking it sets it: pressing Apply is not consent,
 * and the server refuses an application that does not carry it.
 *
 * Only the recruiter sees the skill match computed from the CV. It is
 * their decision support, not a score shown back to the candidate.
 */
export default function JobApplication() {
  const navigate = useNavigate();
  const { code } = useParams();

  const [job, setJob] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [resumeId, setResumeId] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState(null);

  // Unchecked until the candidate ticks it. Never defaulted, never
  // derived from anything else they did.
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      jobsAPI.preview(code),
      resumeAPI.getAll().catch(() => []),
    ])
      .then(([previewed, mine]) => {
        if (cancelled) return;

        setJob(previewed);

        // Only CVs with extracted text are worth sending: one that
        // failed processing has nothing for a recruiter to read.
        const usable = [...(mine || [])]
          .filter((r) => (r.extractedText || '').trim())
          .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));

        setResumes(usable);

        if (usable.length > 0) setResumeId(String(usable[0].id));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'That invite code could not be checked.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [code]);

  // The analysis behind the chosen CV, so the candidate can see what
  // the recruiter will be shown before agreeing to send it.
  useEffect(() => {
    if (!resumeId) {
      setAnalysis(null);
      return;
    }

    let cancelled = false;

    resumeAPI.getAnalysis(resumeId)
      .then((found) => { if (!cancelled) setAnalysis(found); })
      .catch(() => { if (!cancelled) setAnalysis(null); });

    return () => { cancelled = true; };
  }, [resumeId]);

  const chosen = useMemo(
    () => resumes.find((r) => String(r.id) === String(resumeId)) || null,
    [resumes, resumeId],
  );

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!resumeId) {
      setFormError('Choose which CV to apply with.');
      return;
    }

    if (!consent) {
      setFormError('Tick the box to agree to share your CV with this recruiter.');
      return;
    }

    setSubmitting(true);

    try {
      setSubmitted(await applicationsAPI.apply(job.jobId, {
        resumeId: Number(resumeId),
        consentGranted: true,
      }));
    } catch (err) {
      setFormError(err.message || 'Your application could not be submitted. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const who = job?.company ? `${job.recruiterName} at ${job.company}` : job?.recruiterName;

  if (loading) {
    return (
      <div style={page}>
        <p role="status" style={{ color: 'var(--text-secondary)' }}>Loading the job…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={page}>
        <Card as="section" padding="lg">
          <p role="alert" style={{ display: 'flex', gap: 'var(--space-2)', color: 'var(--danger)' }}>
            <AlertCircle size={18} aria-hidden="true" /> {error}
          </p>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Button variant="secondary" onClick={() => navigate('/join')}>Try another code</Button>
          </div>
        </Card>
      </div>
    );
  }

  // ---- Submitted ---------------------------------------------------

  if (submitted) {
    return (
      <div style={page}>
        <Card as="section" padding="lg" accent="var(--success)">
          <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 700, fontSize: 'var(--fs-lg)' }}>
            <CheckCircle size={20} color="var(--success)" aria-hidden="true" />
            Application submitted successfully — {submitted.statusLabel}.
          </p>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-3)', lineHeight: 'var(--lh-normal)' }}>
            {who} will review your application and decide whether to shortlist you.
            If you are shortlisted, the interview for <strong>{submitted.jobTitle}</strong> opens
            on your applications page.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-5)' }}>
            <Button onClick={() => navigate('/applications')}>View my applications</Button>
            <Button variant="secondary" onClick={() => navigate('/home')}>Back to home</Button>
          </div>
        </Card>
      </div>
    );
  }

  // ---- Already applied ---------------------------------------------

  if (job.applicationStatus) {
    return (
      <div style={page}>
        <Card as="section" padding="lg">
          <SectionHeader
            level={2}
            icon={<Briefcase size={18} />}
            title={job.title}
            subtitle={[job.company, fieldName(job.jobField)].filter(Boolean).join(' · ')}
          />
          <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            You have already applied for this job.
            <Badge tone={job.applicationStatus === 'REJECTED' ? 'danger' : 'info'}>
              {job.applicationStatusLabel}
            </Badge>
          </p>
          <div style={{ marginTop: 'var(--space-5)' }}>
            <Button onClick={() => navigate('/applications')}>View my applications</Button>
          </div>
        </Card>
      </div>
    );
  }

  // ---- The form ----------------------------------------------------

  return (
    <div style={page}>
      <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
        Apply for this job
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-5)', lineHeight: 'var(--lh-normal)' }}>
        Your application goes to {who} to review. Nothing else you do on the platform is shared.
      </p>

      {/* The job */}
      <Card as="section" padding="lg" aria-labelledby="job-title" style={{ marginBottom: 'var(--space-5)' }}>
        <p style={meta}>
          <Briefcase size={16} aria-hidden="true" />
          {[job.company, fieldName(job.jobField)].filter(Boolean).join(' · ')}
        </p>
        <h2 id="job-title" style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
          {job.title}
        </h2>
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: 'var(--lh-normal)', color: 'var(--text-secondary)' }}>
          {job.jobDescription}
        </p>

        {job.requiredSkills?.length > 0 && (
          <div style={{ marginTop: 'var(--space-5)' }}>
            <SectionHeader level={3} title="Required skills" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
              {job.requiredSkills.map((skill) => (
                <Badge key={skill} tone="neutral">{skill}</Badge>
              ))}
            </div>
          </div>
        )}

        {!job.interviewReady && (
          <p role="status" style={{ ...meta, marginTop: 'var(--space-5)' }}>
            <Clock size={16} aria-hidden="true" />
            The interview questions for this job are still being prepared. You can apply now;
            the interview opens if you are shortlisted and the questions are ready.
          </p>
        )}
      </Card>

      <form onSubmit={submit}>
        {/* The CV */}
        <Card as="section" padding="lg" aria-labelledby="cv-heading" style={{ marginBottom: 'var(--space-5)' }}>
          <SectionHeader
            id="cv-heading"
            level={2}
            icon={<FileText size={18} />}
            title="The CV you are applying with"
            subtitle="This exact CV is kept with your application, so a later upload will not change what the recruiter reviewed."
          />

          {resumes.length === 0 ? (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                You have no analysed CV to apply with yet. Upload one, then come back to this link.
              </p>
              <Button variant="secondary" icon={<Upload size={16} />} onClick={() => navigate('/upload')}>
                Upload your CV
              </Button>
            </div>
          ) : (
            <>
              <div style={{ marginTop: 'var(--space-4)' }}>
                <label className="label" htmlFor="cv-choice">Choose a CV</label>
                <select
                  id="cv-choice"
                  className="input"
                  value={resumeId}
                  onChange={(e) => setResumeId(e.target.value)}
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.originalFileName}
                      {r.uploadedAt ? ` — uploaded ${new Date(r.uploadedAt).toLocaleDateString()}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* What the recruiter will read */}
              {analysis && (
                <div style={{ marginTop: 'var(--space-5)' }}>
                  <SectionHeader level={3} title="What the recruiter will see from this CV" />

                  {analysis.summary && (
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--lh-normal)', marginTop: 'var(--space-3)' }}>
                      {analysis.summary}
                    </p>
                  )}

                  {analysis.skills?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                      {analysis.skills.slice(0, 18).map((skill) => (
                        <Badge key={skill} tone="info">{skill}</Badge>
                      ))}
                    </div>
                  )}

                  <p style={{ ...meta, marginTop: 'var(--space-3)' }}>
                    Also shared: your work experience, education and certifications from this CV.
                  </p>
                </div>
              )}

              <p style={{ ...meta, marginTop: 'var(--space-4)' }}>
                <Upload size={14} aria-hidden="true" />
                Need a different CV? <Link to="/upload">Upload one</Link> and reopen this page.
              </p>
            </>
          )}
        </Card>

        {/* Consent */}
        <Card as="section" padding="lg" aria-labelledby="consent-heading" style={{ marginBottom: 'var(--space-5)' }}>
          <SectionHeader
            id="consent-heading"
            level={2}
            icon={<ShieldCheck size={18} />}
            color="var(--accent)"
            title="Sharing your CV"
          />

          <label
            htmlFor="consent"
            style={{
              display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start',
              marginTop: 'var(--space-4)', padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer',
              background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
            }}
          >
            <input
              id="consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0, width: 18, height: 18 }}
            />
            <span style={{ fontSize: 'var(--fs-sm)', lineHeight: 'var(--lh-normal)' }}>
              I agree to share <strong>{chosen?.originalFileName || 'the CV I selected'}</strong> and
              its analysis — my skills, work experience and education — with {who} for this
              application. I understand they will see my name and email, and that if they
              shortlist me and I take the interview, they will see my answers and scores for it.
            </span>
          </label>

          {formError && (
            <p role="alert" style={{ display: 'flex', gap: 'var(--space-2)', color: 'var(--danger)', fontSize: 'var(--fs-sm)', marginTop: 'var(--space-3)' }}>
              <AlertCircle size={16} aria-hidden="true" /> {formError}
            </p>
          )}

          <div style={{ marginTop: 'var(--space-5)' }}>
            <Button
              type="submit"
              size="lg"
              icon={<Send size={18} />}
              loading={submitting}
              disabled={resumes.length === 0 || !consent || !resumeId}
            >
              Apply for this job
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

const page = { maxWidth: 760, margin: '0 auto', padding: 'var(--space-6) var(--space-5)' };

const meta = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  color: 'var(--text-secondary)',
  fontSize: 'var(--fs-sm)',
  lineHeight: 'var(--lh-normal)',
};
