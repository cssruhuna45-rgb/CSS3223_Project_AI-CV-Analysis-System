import { useToast } from '../components/ToastProvider';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, Copy, Check, Users, Lock, Unlock } from 'lucide-react';
import { recruiterAPI } from '../services/api';
import { PREDEFINED_JOB_FIELDS } from '../constants/jobFields';
import { Badge, Button, Card, SectionHeader } from '../components/ui';

const EMPTY_FORM = { title: '', company: '', jobField: '', jobDescription: '' };

function fieldName(id) {
  return PREDEFINED_JOB_FIELDS.find((f) => f.id === id)?.name || id;
}

function inviteLink(code) {
  return `${window.location.origin}/join/${code}`;
}

// A recruiter's jobs. Each one has an invite code; candidates who join
// with it take an exam-mode interview against this job's description,
// and only those interviews reach this recruiter's dashboard.
export default function RecruiterJobs() {
  const notify = useToast();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [copiedId, setCopiedId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    recruiterAPI.jobs()
      .then((list) => {
        setJobs(list);
        // Nothing to manage yet: open the form straight away.
        if (list.length === 0) setShowForm(true);
      })
      .catch((err) => setError(err.message || 'Could not load your jobs.'))
      .finally(() => setLoading(false));
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const job = await recruiterAPI.createJob(form);
      setJobs((list) => [job, ...list]);
      notify('Job created successfully.');
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || 'The job was not created. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (job) => {
    try {
      await navigator.clipboard.writeText(inviteLink(job.inviteCode));
      setCopiedId(job.id);
    } catch {
      // Clipboard refused: the link is on screen to copy by hand.
      setCopiedId(null);
      notify('Couldn’t copy automatically; please copy the link manually.', 'warning');
    }
  };

  const toggleOpen = async (job) => {
    setBusyId(job.id);
    setError('');
    try {
      const updated = await (job.open ? recruiterAPI.closeJob(job.id) : recruiterAPI.reopenJob(job.id));
      notify(job.open ? 'Job closed to new interviews.' : 'Job reopened successfully.', job.open ? 'info' : 'success');
      // The close/reopen response carries no counts; keep the ones shown.
      setJobs((list) => list.map((j) => (j.id === job.id
        ? { ...updated, interviewCount: j.interviewCount, completedCount: j.completedCount }
        : j)));
    } catch (err) {
      setError(err.message || 'That change was not saved. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--space-6) var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Jobs</h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 620, lineHeight: 'var(--lh-normal)' }}>
            Share a job's invite link with candidates. Their interview is asked against
            this job's description in exam mode, and only those interviews appear on your
            dashboard. Interviews candidates take on their own stay private.
          </p>
        </div>
        {!showForm && (
          <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>New job</Button>
        )}
      </div>

      {showForm && (
        <Card as="section" padding="md" aria-labelledby="new-job-title" style={{ marginBottom: 'var(--space-5)' }}>
          <SectionHeader id="new-job-title" icon={<Briefcase size={18} />} title="New job" />
          <form onSubmit={create} style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
              <div>
                <label className="label" htmlFor="job-title">Job title</label>
                <input id="job-title" className="input" required maxLength={150}
                  placeholder="e.g. Java Backend Intern" value={form.title} onChange={update('title')} />
              </div>
              <div>
                <label className="label" htmlFor="job-company">Company (optional)</label>
                <input id="job-company" className="input" maxLength={150}
                  placeholder="Shown to candidates before they join" value={form.company} onChange={update('company')} />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="job-field">Job field</label>
              <select id="job-field" className="input" required value={form.jobField} onChange={update('jobField')}>
                <option value="">Choose a field</option>
                {PREDEFINED_JOB_FIELDS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="job-description">Job description</label>
              <textarea id="job-description" className="input" required minLength={20} maxLength={8000} rows={6}
                aria-describedby="job-description-hint"
                placeholder="What the role involves and the skills it needs. Every candidate is interviewed against this text."
                value={form.jobDescription} onChange={update('jobDescription')} style={{ resize: 'vertical' }} />
              <span id="job-description-hint" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                At least 20 characters. The questions are written from this, so be specific.
              </span>
            </div>

            {formError && (
              <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--fs-sm)' }}>{formError}</p>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button type="submit" loading={saving}>Create job</Button>
              {jobs.length > 0 && (
                <Button variant="ghost" onClick={() => { setShowForm(false); setFormError(''); }}>Cancel</Button>
              )}
            </div>
          </form>
        </Card>
      )}

      {error && (
        <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-4)' }}>{error}</p>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading your jobs{'…'}</p>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {jobs.map((job) => (
            <Card key={job.id} as="article" padding="md" aria-labelledby={`job-${job.id}-title`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <h2 id={`job-${job.id}-title`} style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                    {job.title}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)' }}>
                    {[job.company, fieldName(job.jobField)].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Badge tone={job.open ? 'success' : 'neutral'}>{job.open ? 'Open' : 'Closed'}</Badge>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', margin: 'var(--space-4) 0' }}>
                <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>Invite code</span>
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-lg)', fontWeight: 700, letterSpacing: '0.08em' }}>
                  {job.inviteCode}
                </code>
                <Button size="sm" variant="secondary" disabled={!job.open}
                  icon={copiedId === job.id ? <Check size={14} /> : <Copy size={14} />}
                  aria-label={`Copy invite link for ${job.title}`}
                  onClick={() => copy(job)}>
                  {copiedId === job.id ? 'Link copied' : 'Copy invite link'}
                </Button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                  {job.completedCount} of {job.interviewCount} interview{job.interviewCount === 1 ? '' : 's'} completed
                </span>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button size="sm" variant="ghost"
                    icon={job.open ? <Lock size={14} /> : <Unlock size={14} />}
                    loading={busyId === job.id}
                    aria-label={`${job.open ? 'Close' : 'Reopen'} ${job.title}`}
                    onClick={() => toggleOpen(job)}>
                    {job.open ? 'Close' : 'Reopen'}
                  </Button>
                  <Button size="sm" icon={<Users size={14} />}
                    onClick={() => navigate(`/recruiter?job=${job.id}`)}>
                    View candidates
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
