import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Briefcase, ShieldCheck, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { jobsAPI } from '../services/api';
import { PREDEFINED_JOB_FIELDS } from '../constants/jobFields';
import { Button, Card } from '../components/ui';

function fieldName(id) {
  return PREDEFINED_JOB_FIELDS.find((f) => f.id === id)?.name || id;
}

// Where an invite link lands. The candidate reads the job and who will
// see the result before anything is shared, and nothing else they do on
// the platform is ever shown to a recruiter.
//
// The code no longer opens the interview. It opens the application: the
// candidate applies with a chosen CV and explicit consent, the recruiter
// shortlists or rejects, and only then does the interview become
// available. This page routes to whichever of those steps they are on -
// the server decides which that is, and refuses the interview start
// itself if anything here is out of date.
export default function JoinInterview({ user }) {
  const navigate = useNavigate();
  const { code: codeFromLink } = useParams();

  const [code, setCode] = useState(codeFromLink || '');
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(Boolean(codeFromLink));
  const [error, setError] = useState('');

  const isCandidate = user?.role === 'candidate';

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
      <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Apply for a job</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-5)', lineHeight: 'var(--lh-normal)' }}>
        A recruiter gave you an invite code. Enter it to read the job before you apply.
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

          {!isCandidate ? (
            <p role="status" style={{ color: 'var(--text-secondary)' }}>
              Job applications are made from a candidate account. Sign in as a candidate to apply.
            </p>
          ) : !job.applicationStatus ? (
            // Not applied yet. The invite's first step is the
            // application, where the CV is chosen and consent given.
            <>
              <div style={notice}>
                <ShieldCheck size={20} color="var(--accent)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 'var(--fs-sm)', lineHeight: 'var(--lh-normal)' }}>
                  <strong>Applying shares the CV you choose with {who}.</strong>{' '}
                  You pick which CV on the next page and agree to share it before anything is sent.
                  If they shortlist you, you can take this job's interview: timed, {job.questionCount} questions,
                  one attempt, the same questions for every candidate. Your practice interviews and
                  anything else you do here stay private.
                </div>
              </div>

              <Button size="lg" icon={<ArrowRight size={18} />} onClick={() => navigate(`/apply/${job.inviteCode}`)}>
                Continue to apply
              </Button>
            </>
          ) : job.interviewAvailable ? (
            // Shortlisted, job ready, attempt unused.
            <>
              <div style={notice}>
                <ShieldCheck size={20} color="var(--accent)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 'var(--fs-sm)', lineHeight: 'var(--lh-normal)' }}>
                  <strong>You were shortlisted for this job.</strong>{' '}
                  {who} will see your answers and scores for this interview, and how often you left
                  the page or pasted text while answering. It is timed, has {job.questionCount} questions
                  and can be taken once.
                </div>
              </div>

              <Button size="lg" icon={<ArrowRight size={18} />} onClick={start}>
                Start the interview
              </Button>
            </>
          ) : (
            // Applied, but the interview is not open: still under
            // review, not selected, already done, or not ready. The
            // server supplies the wording.
            <>
              <p role="status" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                {job.applicationStatus === 'INTERVIEWED'
                  ? <CheckCircle size={18} color="var(--success)" aria-hidden="true" />
                  : <Clock size={18} color="var(--text-secondary)" aria-hidden="true" />}
                <span>
                  <strong>{job.applicationStatusLabel}.</strong>{' '}
                  <span style={{ color: 'var(--text-secondary)' }}>{job.interviewMessage}</span>
                </span>
              </p>

              <Button variant="secondary" onClick={() => navigate('/applications')}>
                View my applications
              </Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

const notice = {
  display: 'flex',
  gap: 'var(--space-3)',
  padding: 'var(--space-4)',
  borderRadius: 'var(--radius-md)',
  background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
  marginBottom: 'var(--space-5)',
};
