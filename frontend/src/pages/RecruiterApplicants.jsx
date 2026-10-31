import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users, Search, AlertCircle, CheckCircle, XCircle, ArrowLeft,
  FileText, GraduationCap, Briefcase, Inbox, BarChart3, Info,
} from 'lucide-react';
import { recruiterAPI } from '../services/api';
import {
  applicantsAPI, matchLabel, statusTone,
} from '../services/jobApplicationsApi';
import { Button, Card, SectionHeader, Badge } from '../components/ui';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'APPLIED', label: 'Under review' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'REJECTED', label: 'Not selected' },
  { value: 'INTERVIEWED', label: 'Interviewed' },
];

const SORTS = [
  { value: 'match', label: 'Best CV match' },
  { value: 'recent', label: 'Most recent' },
  { value: 'name', label: 'Name' },
];

/**
 * The recruiter's applicant list for one of their own jobs, and the
 * review of a single applicant.
 *
 * The match percentage is shown because it is useful for triage, but
 * nothing on this page acts on it: shortlisting and rejecting happen
 * only when the recruiter presses the button and confirms. A null match
 * reads "Not available", never 0%.
 *
 * Everything the page can reach is already scoped to this recruiter by
 * the server. A job or application id that is not theirs comes back as
 * "not found".
 */
export default function RecruiterApplicants() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const jobId = params.get('job') || '';
  const openId = params.get('applicant') || '';

  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [detail, setDetail] = useState(null);

  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [sort, setSort] = useState('match');

  // Confirmation for a consequential, one-way decision.
  const [pending, setPending] = useState(null);

  useEffect(() => {
    recruiterAPI.jobs()
      .then((mine) => {
        setJobs(mine || []);
        if (!jobId && mine?.length > 0) setJob(String(mine[0].id));
      })
      .catch((err) => setError(err.message || 'Your jobs could not be loaded.'));
  }, []);

  useEffect(() => {
    if (!jobId) return;

    setLoading(true);
    setError('');

    applicantsAPI.list(jobId)
      .then(setApplicants)
      .catch((err) => setError(err.message || 'The applicants could not be loaded.'))
      .finally(() => setLoading(false));
  }, [jobId]);

  useEffect(() => {
    if (!openId) {
      setDetail(null);
      return;
    }

    let cancelled = false;

    setDetailLoading(true);

    applicantsAPI.get(openId)
      .then((found) => { if (!cancelled) setDetail(found); })
      .catch((err) => { if (!cancelled) setError(err.message || 'That applicant could not be loaded.'); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });

    return () => { cancelled = true; };
  }, [openId]);

  const setJob = (value) => setParams({ job: value }, { replace: true });

  const openApplicant = (applicationId) =>
    setParams({ job: jobId, applicant: String(applicationId) });

  const closeApplicant = () => setParams({ job: jobId });

  const job = useMemo(
    () => jobs.find((j) => String(j.id) === String(jobId)) || null,
    [jobs, jobId],
  );

  // Sorted and filtered in the browser: a recruiter's applicant list is
  // tens of rows, so another round trip per keystroke would be worse
  // than filtering what is already here. The server's own order is
  // already best-match-first.
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const matches = applicants.filter((a) => {
      if (status !== 'ALL' && a.status !== status) return false;
      if (!needle) return true;

      return [
        a.candidateName, a.candidateEmail, a.experienceSummary,
        a.educationSummary, ...(a.match?.matchedSkills || []),
      ].some((field) => (field || '').toLowerCase().includes(needle));
    });

    const ordered = [...matches];

    if (sort === 'recent') {
      ordered.sort((a, b) => new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0));
    } else if (sort === 'name') {
      ordered.sort((a, b) => (a.candidateName || '').localeCompare(b.candidateName || ''));
    } else {
      // Null matches last: not computed is not the same as 0%.
      ordered.sort((a, b) => {
        const left = a.match?.matchPercentage;
        const right = b.match?.matchPercentage;
        if (left === null || left === undefined) return 1;
        if (right === null || right === undefined) return -1;
        return right - left;
      });
    }

    return ordered;
  }, [applicants, query, status, sort]);

  const decide = async () => {
    if (!pending) return;

    setDeciding(true);
    setError('');

    try {
      const updated = await applicantsAPI.decide(pending.applicationId, pending.decision);

      setApplicants((rows) => rows.map(
        (row) => (row.applicationId === updated.applicationId ? updated : row),
      ));

      if (detail?.summary?.applicationId === updated.applicationId) {
        setDetail({ ...detail, summary: updated, decisionOpen: false });
      }

      setNotice(`${updated.candidateName} is now ${updated.statusLabel.toLowerCase()}.`);
      setPending(null);
    } catch (err) {
      setError(err.message || 'That decision could not be saved.');
      setPending(null);
    } finally {
      setDeciding(false);
    }
  };

  // ---- One applicant ------------------------------------------------

  if (openId) {
    return (
      <div style={page}>
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={closeApplicant}>
          Back to applicants
        </Button>

        {detailLoading && (
          <p role="status" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-4)' }}>
            Loading the applicant…
          </p>
        )}

        {error && (
          <Card as="section" padding="md" style={{ marginTop: 'var(--space-4)' }}>
            <p role="alert" style={{ display: 'flex', gap: 'var(--space-2)', color: 'var(--danger)' }}>
              <AlertCircle size={18} aria-hidden="true" /> {error}
            </p>
          </Card>
        )}

        {detail && (
          <ApplicantDetail
            detail={detail}
            deciding={deciding}
            pending={pending}
            onAsk={setPending}
            onConfirm={decide}
            onCancel={() => setPending(null)}
            onCompare={() => navigate(`/comparison?job=${detail.jobId}`)}
          />
        )}
      </div>
    );
  }

  // ---- The list -----------------------------------------------------

  return (
    <div style={page}>
      <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
        Applicants
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-5)', lineHeight: 'var(--lh-normal)' }}>
        Review who applied and decide who to interview. The CV match is a guide for your
        reading; it does not shortlist or reject anyone.
      </p>

      <Card as="section" padding="md" style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 260px' }}>
            <label className="label" htmlFor="job-pick">Job</label>
            <select id="job-pick" className="input" value={jobId} onChange={(e) => setJob(e.target.value)}>
              <option value="">Choose a job…</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                  {j.applicationCount ? ` — ${j.applicationCount} applied` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 200px' }}>
            <label className="label" htmlFor="applicant-search">Search</label>
            <div style={{ position: 'relative' }}>
              <Search
                size={15}
                aria-hidden="true"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
              />
              <input
                id="applicant-search"
                className="input"
                style={{ paddingLeft: 32 }}
                placeholder="Name, email or skill"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div style={{ flex: '0 1 170px' }}>
            <label className="label" htmlFor="status-filter">Status</label>
            <select id="status-filter" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>

          <div style={{ flex: '0 1 170px' }}>
            <label className="label" htmlFor="sort-by">Sort by</label>
            <select id="sort-by" className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {jobId && (
            <Button variant="secondary" icon={<BarChart3 size={16} />} onClick={() => navigate(`/comparison?job=${jobId}`)}>
              Compare results
            </Button>
          )}
        </div>
      </Card>

      {notice && (
        <p role="status" style={{ display: 'flex', gap: 'var(--space-2)', color: 'var(--success)', marginBottom: 'var(--space-4)' }}>
          <CheckCircle size={16} aria-hidden="true" /> {notice}
        </p>
      )}

      {error && (
        <Card as="section" padding="md" style={{ marginBottom: 'var(--space-4)' }}>
          <p role="alert" style={{ display: 'flex', gap: 'var(--space-2)', color: 'var(--danger)' }}>
            <AlertCircle size={18} aria-hidden="true" /> {error}
          </p>
        </Card>
      )}

      {!jobId && (
        <Card as="section" padding="lg">
          <p style={{ color: 'var(--text-secondary)' }}>Choose one of your jobs to see who applied.</p>
        </Card>
      )}

      {jobId && loading && (
        <p role="status" style={{ color: 'var(--text-secondary)' }}>Loading applicants…</p>
      )}

      {jobId && !loading && applicants.length === 0 && (
        <Card as="section" padding="lg">
          <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 600 }}>
            <Inbox size={18} aria-hidden="true" /> Nobody has applied for {job?.title || 'this job'} yet.
          </p>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-3)', lineHeight: 'var(--lh-normal)' }}>
            Share the job's invite code with candidates. Applications appear here as they arrive.
          </p>
        </Card>
      )}

      {jobId && !loading && applicants.length > 0 && visible.length === 0 && (
        <Card as="section" padding="lg">
          <p style={{ color: 'var(--text-secondary)' }}>No applicant matches that search or filter.</p>
        </Card>
      )}

      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        {visible.map((a) => (
          <Card key={a.applicationId} as="article" padding="lg" aria-labelledby={`applicant-${a.applicationId}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 320px', minWidth: 220 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <h2
                    id={`applicant-${a.applicationId}`}
                    style={{ fontSize: 'var(--fs-lg)', fontWeight: 700 }}
                  >
                    {a.candidateName}
                  </h2>
                  <Badge tone={statusTone(a.status)}>{a.statusLabel}</Badge>
                </div>

                <p style={meta}>{a.candidateEmail}</p>

                {a.experienceSummary && (
                  <p style={{ ...meta, marginTop: 'var(--space-2)' }}>
                    <Briefcase size={14} aria-hidden="true" /> {a.experienceSummary}
                  </p>
                )}

                {a.educationSummary && (
                  <p style={meta}>
                    <GraduationCap size={14} aria-hidden="true" /> {a.educationSummary}
                  </p>
                )}

                <p style={{ ...meta, marginTop: 'var(--space-2)' }}>
                  <FileText size={14} aria-hidden="true" />
                  {a.submittedCvFileName}
                  {a.appliedAt ? ` — applied ${new Date(a.appliedAt).toLocaleDateString()}` : ''}
                </p>
              </div>

              <div style={{ textAlign: 'right', minWidth: 150 }}>
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  CV skill match
                </p>
                <p style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, lineHeight: 1.1 }}>
                  {matchLabel(a.match?.matchPercentage)}
                </p>
                {a.match?.requiredSkillCount > 0 && a.match?.matchPercentage !== null && (
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
                    {a.match.matchedSkills.length} of {a.match.requiredSkillCount} required skills
                  </p>
                )}
                {a.interviewCompleted && (
                  <p style={{ fontSize: 'var(--fs-sm)', marginTop: 'var(--space-2)' }}>
                    Interview score:{' '}
                    <strong>{a.interviewScore === null || a.interviewScore === undefined ? 'not graded' : `${a.interviewScore}/100`}</strong>
                  </p>
                )}
              </div>
            </div>

            <SkillChips match={a.match} />

            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-5)' }}>
              <Button variant="secondary" size="sm" onClick={() => openApplicant(a.applicationId)}>
                View CV details
              </Button>

              {a.status === 'APPLIED' && (
                <>
                  <Button
                    size="sm"
                    icon={<CheckCircle size={14} />}
                    onClick={() => setPending({ applicationId: a.applicationId, name: a.candidateName, decision: 'SHORTLISTED' })}
                  >
                    Shortlist
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<XCircle size={14} />}
                    onClick={() => setPending({ applicationId: a.applicationId, name: a.candidateName, decision: 'REJECTED' })}
                  >
                    Reject
                  </Button>
                </>
              )}

              {a.status !== 'APPLIED' && a.decidedAt && (
                <p style={meta}>
                  Decided {new Date(a.decidedAt).toLocaleDateString()}
                  {a.decidedByName ? ` by ${a.decidedByName}` : ''}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {pending && (
        <ConfirmDecision
          pending={pending}
          deciding={deciding}
          onConfirm={decide}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}

// ---- Pieces ---------------------------------------------------------

/**
 * Matched, related and missing skills as three clearly separate rows.
 * Related skills are never mixed in with matches: they are adjacent
 * background, not the requirement being met.
 */
function SkillChips({ match }) {
  if (!match) return null;

  const rows = [
    { label: 'Matched', skills: match.matchedSkills, tone: 'success' },
    { label: 'Related', skills: match.relatedSkills, tone: 'warning' },
    { label: 'Missing', skills: match.missingSkills, tone: 'danger' },
  ].filter((row) => row.skills?.length > 0);

  if (rows.length === 0) return null;

  return (
    <div style={{ display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
      {rows.map((row) => (
        <div key={row.label} style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'baseline' }}>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', minWidth: 62 }}>
            {row.label}
          </span>
          {row.skills.map((skill) => (
            <Badge key={skill} tone={row.tone}>{skill}</Badge>
          ))}
        </div>
      ))}
    </div>
  );
}

function ApplicantDetail({ detail, deciding, pending, onAsk, onConfirm, onCancel, onCompare }) {
  const { summary, cvSnapshot, requiredSkills, decisionOpen } = detail;

  return (
    <>
      <Card as="section" padding="lg" style={{ marginTop: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700 }}>{summary.candidateName}</h1>
            <p style={meta}>{summary.candidateEmail}</p>
            <p style={{ ...meta, marginTop: 'var(--space-2)' }}>
              Applied for <strong>{detail.jobTitle}</strong>
              {summary.appliedAt ? ` on ${new Date(summary.appliedAt).toLocaleDateString()}` : ''}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Badge tone={statusTone(summary.status)}>{summary.statusLabel}</Badge>
            <p style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, marginTop: 'var(--space-2)', lineHeight: 1.1 }}>
              {matchLabel(summary.match?.matchPercentage)}
            </p>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>CV skill match</p>
          </div>
        </div>

        <p style={{ ...meta, marginTop: 'var(--space-4)' }}>
          <Info size={14} aria-hidden="true" />
          This is the CV analysis as it was when {summary.candidateName.split(' ')[0]} applied. A CV
          they have uploaded since does not change it.
        </p>
      </Card>

      {/* Requirements against the CV */}
      <Card as="section" padding="lg" style={{ marginTop: 'var(--space-4)' }}>
        <SectionHeader level={2} title="Required skills against this CV" />
        <div style={{ display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
          {requiredSkills.map((skill) => {
            const met = (summary.match?.matchedSkills || [])
              .some((m) => m.toLowerCase() === skill.toLowerCase());

            return (
              <div
                key={skill}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2, transparent)',
                }}
              >
                {met
                  ? <CheckCircle size={16} color="var(--success)" aria-hidden="true" />
                  : <XCircle size={16} color="var(--danger)" aria-hidden="true" />}
                <span style={{ flex: 1 }}>{skill}</span>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
                  {met ? 'Demonstrated' : 'Not demonstrated'}
                </span>
              </div>
            );
          })}
        </div>

        <SkillChips match={summary.match} />
      </Card>

      {/* The CV itself */}
      <Card as="section" padding="lg" style={{ marginTop: 'var(--space-4)' }}>
        <SectionHeader
          level={2}
          icon={<FileText size={18} />}
          title="Submitted CV"
          subtitle={summary.submittedCvFileName}
        />

        {cvSnapshot.summary && (
          <p style={{ lineHeight: 'var(--lh-normal)', marginTop: 'var(--space-4)' }}>{cvSnapshot.summary}</p>
        )}

        {cvSnapshot.skills?.length > 0 && (
          <div style={{ marginTop: 'var(--space-5)' }}>
            <SectionHeader level={3} title="Technical skills" />
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
              {cvSnapshot.skills.map((skill) => <Badge key={skill} tone="info">{skill}</Badge>)}
            </div>
          </div>
        )}

        {cvSnapshot.experience?.length > 0 && (
          <div style={{ marginTop: 'var(--space-5)' }}>
            <SectionHeader level={3} icon={<Briefcase size={16} />} title="Work experience" />
            <div style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
              {cvSnapshot.experience.map((item, i) => (
                <div key={`${item.company}-${i}`}>
                  <p style={{ fontWeight: 600 }}>{[item.role, item.company].filter(Boolean).join(' · ')}</p>
                  {item.duration && <p style={meta}>{item.duration}</p>}
                  {item.description && (
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--lh-normal)', marginTop: 'var(--space-1)' }}>
                      {item.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {cvSnapshot.education?.length > 0 && (
          <div style={{ marginTop: 'var(--space-5)' }}>
            <SectionHeader level={3} icon={<GraduationCap size={16} />} title="Education" />
            <div style={{ display: 'grid', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
              {cvSnapshot.education.map((item, i) => (
                <div key={`${item.institution}-${i}`}>
                  <p style={{ fontWeight: 600 }}>{[item.degree, item.field].filter(Boolean).join(', ')}</p>
                  <p style={meta}>{[item.institution, item.year].filter(Boolean).join(' · ')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {cvSnapshot.certifications?.length > 0 && (
          <div style={{ marginTop: 'var(--space-5)' }}>
            <SectionHeader level={3} title="Certifications" />
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
              {cvSnapshot.certifications.map((c) => <Badge key={c} tone="neutral">{c}</Badge>)}
            </div>
          </div>
        )}

        {!cvSnapshot.summary
          && !cvSnapshot.skills?.length
          && !cvSnapshot.experience?.length
          && !cvSnapshot.education?.length && (
          <p style={{ ...meta, marginTop: 'var(--space-4)' }}>
            No analysis was stored with this application. The CV file itself is still on record.
          </p>
        )}
      </Card>

      {/* The decision */}
      <Card as="section" padding="lg" style={{ marginTop: 'var(--space-4)' }} accent="var(--accent)">
        <SectionHeader
          level={2}
          icon={<Users size={18} />}
          title="Your decision"
          subtitle="Shortlisting opens this job's interview for the candidate. Both decisions are final."
        />

        {decisionOpen ? (
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
            <Button
              icon={<CheckCircle size={16} />}
              onClick={() => onAsk({ applicationId: summary.applicationId, name: summary.candidateName, decision: 'SHORTLISTED' })}
            >
              Shortlist {summary.candidateName.split(' ')[0]}
            </Button>
            <Button
              variant="danger"
              icon={<XCircle size={16} />}
              onClick={() => onAsk({ applicationId: summary.applicationId, name: summary.candidateName, decision: 'REJECTED' })}
            >
              Reject
            </Button>
          </div>
        ) : (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <p style={meta}>
              Decided {summary.decidedAt ? new Date(summary.decidedAt).toLocaleDateString() : ''}
              {summary.decidedByName ? ` by ${summary.decidedByName}` : ''}. This cannot be changed.
            </p>
            {summary.interviewCompleted && (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <Button variant="secondary" icon={<BarChart3 size={16} />} onClick={onCompare}>
                  Compare interview results
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {pending && (
        <ConfirmDecision
          pending={pending}
          deciding={deciding}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}
    </>
  );
}

/**
 * Explicit confirmation. Both decisions are one-way and one of them
 * ends a candidate's application, so neither happens on a single click.
 */
function ConfirmDecision({ pending, deciding, onConfirm, onCancel }) {
  const shortlisting = pending.decision === 'SHORTLISTED';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center',
        background: 'rgba(0,0,0,0.5)', padding: 'var(--space-5)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <Card padding="lg" style={{ maxWidth: 440, width: '100%' }}>
        <h2 id="confirm-title" style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
          {shortlisting ? `Shortlist ${pending.name}?` : `Reject ${pending.name}?`}
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--lh-normal)' }}>
          {shortlisting
            ? 'They will be able to start this job\'s interview. You cannot undo this.'
            : 'They will see that they were not selected. You cannot undo this.'}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-5)' }}>
          <Button variant="ghost" onClick={onCancel} disabled={deciding}>Cancel</Button>
          <Button
            variant={shortlisting ? 'primary' : 'danger'}
            loading={deciding}
            onClick={onConfirm}
          >
            {shortlisting ? 'Shortlist' : 'Reject'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

const page = { maxWidth: 980, margin: '0 auto', padding: 'var(--space-6) var(--space-5)' };

const meta = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  color: 'var(--text-secondary)',
  fontSize: 'var(--fs-sm)',
  lineHeight: 'var(--lh-normal)',
};
