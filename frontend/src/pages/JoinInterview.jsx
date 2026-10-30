import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Briefcase, ShieldCheck, FileText, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { jobsAPI, resumeAPI } from '../services/api';
import { PREDEFINED_JOB_FIELDS } from '../constants/jobFields';
import { Button, Card } from '../components/ui';

function fieldName(id) {
  return PREDEFINED_JOB_FIELDS.find((f) => f.id === id)?.name || id;
}

// Where an invite link lands. The candidate reads the job and who will
// see the result before anything is shared: starting the interview from
// here is the consent, and nothing else they do on the platform is ever
// shown to a recruiter.
export default function JoinInterview({ user }) {
  const navigate = useNavigate();
  const { code: codeFromLink } = useParams();

  const [code, setCode] = useState(codeFromLink || '');
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(Boolean(codeFromLink));
  const [error, setError] = useState('');

  const [hasCv, setHasCv] = useState(() => Boolean((sessionStorage.getItem('resumeText') || '').trim()));
  const [cvName, setCvName] = useState('');
  const isCandidate = user?.role === 'candidate';

  // A returning candidate's CV is stored, but this browser tab may not
  // have it yet. Use their latest upload rather than asking for it again.
  useEffect(() => {
    if (hasCv || !isCandidate) return;
    resumeAPI.getAll()
      .then((resumes) => {
        const latest = [...(resumes || [])]
          .filter((r) => (r.extractedText || '').trim())
          .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))[0];
        if (!latest) return;
        sessionStorage.setItem('resumeId', String(latest.id));
        sessionStorage.setItem('resumeText', latest.extractedText);
        setCvName(latest.originalFileName || '');
        setHasCv(true);
      })
      .catch(() => { /* No saved CV to use; the page asks for an upload. */ });
  }, []);

  const lookUp = async (value) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setJob(null);
    try {
      setJob(await jobsAPI.preview(trimmed));
    } catch (err) {
      setError(err.message || 'That code could not be checked. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (codeFromLink) lookUp(codeFromLink);
  }, [codeFromLink]);

  const start = () => {
    sessionStorage.setItem('jobInvite', JSON.stringify({
      code: job.inviteCode,
      title: job.title,
      company: job.company,
      jobField: job.jobField,
    }));
    navigate('/interview');
  };

  const who = job?.company ? `${job.recruiterName} at ${job.company}` : job?.recruiterName;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-6) var(--space-5)' }}>
      <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Join a job interview</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-5)', lineHeight: 'var(--lh-normal)' }}>
        A recruiter gave you an invite code. Enter it to see the job before you start.
      </p>

      {!job && (
        <Card as="section" padding="md" aria-label="Invite code">
          <form
            onSubmit={(e) => { e.preventDefault(); lookUp(code); }}
            style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}
          >
            <div style={{ flex: '1 1 220px' }}>
              <label className="label" htmlFor="invite-code">Invite code</label>
              <input id="invite-code" className="input" placeholder="e.g. ABCD-EF23" autoComplete="off"
                value={code} onChange={(e) => setCode(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }} />
            </div>
            <Button type="submit" loading={loading} disabled={!code.trim()}>Find job</Button>
          </form>
          {error && (
            <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--fs-sm)', marginTop: 'var(--space-3)' }}>{error}</p>
          )}
        </Card>
      )}

      {job && (
        <Card as="section" padding="lg" aria-labelledby="job-title">
          <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-2)' }}>
            <Briefcase size={16} aria-hidden="true" /> {[job.company, fieldName(job.jobField)].filter(Boolean).join(' · ')}
          </p>
          <h2 id="job-title" style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>{job.title}</h2>

          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 'var(--lh-normal)', color: 'var(--text-secondary)', marginBottom: 'var(--space-5)' }}>
            {job.jobDescription}
          </p>

          {job.alreadyCompleted ? (
            <p role="status" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', fontWeight: 600 }}>
              <CheckCircle size={18} color="var(--success)" aria-hidden="true" />
              You have already completed this interview. Each job allows one attempt.
            </p>
          ) : !job.interviewReady ? (
            // The recruiter has not approved this job's questions yet;
            // the server would refuse the start anyway.
            <p role="status" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', color: 'var(--text-secondary)' }}>
              <Clock size={18} aria-hidden="true" />
              This interview is not ready yet. The recruiter is still preparing its questions; please try again later.
            </p>
          ) : !isCandidate ? (
            <p role="status" style={{ color: 'var(--text-secondary)' }}>
              Job interviews are taken from a candidate account. Sign in as a candidate to join.
            </p>
          ) : (
            <>
              <div style={{
                display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
                background: 'color-mix(in srgb, var(--accent) 8%, transparent)', marginBottom: 'var(--space-5)',
              }}>
                <ShieldCheck size={20} color="var(--accent)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 'var(--fs-sm)', lineHeight: 'var(--lh-normal)' }}>
                  <strong>Your result for this interview is shared with {who}.</strong>{' '}
                  They will see your name, email, answers and scores for this one interview,
                  and how often you left the page or pasted text while answering.
                  It is timed (exam mode), has {job.questionCount} questions, and can be taken once.
                  Every candidate for this job is asked the same questions. Your practice interviews
                  and anything else you do here stay private.
                </div>
              </div>

              {hasCv ? (
                <div>
                  {cvName && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-3)' }}>
                      Your latest CV, {cvName}, is on file.
                    </p>
                  )}
                  <Button size="lg" icon={<ArrowRight size={18} />} onClick={start}>
                    Agree and start the interview
                  </Button>
                </div>
              ) : (
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-3)' }}>
                    Upload your CV first. Then open this invite link again.
                  </p>
                  <Button variant="secondary" icon={<FileText size={16} />} onClick={() => navigate('/upload')}>
                    Upload your CV
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
