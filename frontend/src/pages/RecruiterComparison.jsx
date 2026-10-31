import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart3, AlertCircle, Inbox, ChevronDown, ChevronRight, Users, Info, UserCheck,
} from 'lucide-react';
import { recruiterAPI } from '../services/api';
import {
  applicantsAPI, decisionTone, matchLabel, statusTone,
} from '../services/jobApplicationsApi';
import { Button, Card, SectionHeader, Badge } from '../components/ui';
import HiringDecisionPanel from '../components/HiringDecisionPanel';

const VERDICT_TONES = {
  strong: 'success',
  partial: 'warning',
  weak: 'danger',
  none: 'neutral',
};

/**
 * Candidates who completed the same job assessment, side by side.
 *
 * They are comparable because they were all asked the job's approved
 * questions in one fixed order and graded against the same saved key
 * points. The table is aligned on the approved question id, so a
 * candidate whose transcript is missing an answer leaves a gap in that
 * row rather than shifting everybody else's answers along by one.
 *
 * Two numbers are shown per candidate and never conflated: the CV skill
 * match from their application, and the interview score from their
 * answers. Nothing here ranks or picks a candidate.
 */
export default function RecruiterComparison() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const jobId = params.get('job') || '';

  const [jobs, setJobs] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Which candidates are in the table. All of them by default; a
  // recruiter can narrow to two or three to read them properly.
  const [selected, setSelected] = useState([]);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    recruiterAPI.jobs()
      .then((mine) => {
        setJobs(mine || []);
        if (!jobId && mine?.length > 0) setParams({ job: String(mine[0].id) }, { replace: true });
      })
      .catch((err) => setError(err.message || 'Your jobs could not be loaded.'));
  }, []);

  useEffect(() => {
    if (!jobId) return;

    setLoading(true);
    setError('');

    applicantsAPI.comparison(jobId)
      .then((found) => {
        setComparison(found);
        setSelected((found.candidates || []).map((c) => c.applicationId));
        setExpanded({});
      })
      .catch((err) => setError(err.message || 'The comparison could not be loaded.'))
      .finally(() => setLoading(false));
  }, [jobId]);

  const shown = useMemo(
    () => (comparison?.candidates || []).filter((c) => selected.includes(c.applicationId)),
    [comparison, selected],
  );

  const toggleCandidate = (applicationId) =>
    setSelected((current) => (current.includes(applicationId)
      ? current.filter((id) => id !== applicationId)
      : [...current, applicationId]));

  // One candidate's answer to one approved question, or null for a gap.
  const answerFor = (candidate, questionId, position) => {
    const answers = candidate.answers || [];

    return answers.find((a) => a.questionId === questionId)
      // A session recorded before question ids were stored falls back
      // to position, which is the same order for every candidate.
      || answers.find((a) => a.questionNumber === position)
      || null;
  };

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: 'var(--space-6) var(--space-5)' }}>
      <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
        Compare candidates
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-5)', lineHeight: 'var(--lh-normal)' }}>
        Everyone here answered the same approved questions for this job. Read them side by side;
        the selection is yours to make.
      </p>

      <Card as="section" padding="md" style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 280px' }}>
            <label className="label" htmlFor="job-pick">Job</label>
            <select
              id="job-pick"
              className="input"
              value={jobId}
              onChange={(e) => setParams({ job: e.target.value }, { replace: true })}
            >
              <option value="">Choose a job…</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
          {jobId && (
            <Button variant="secondary" icon={<Users size={16} />} onClick={() => navigate(`/applicants?job=${jobId}`)}>
              Back to applicants
            </Button>
          )}
        </div>
      </Card>

      {error && (
        <Card as="section" padding="md" style={{ marginBottom: 'var(--space-4)' }}>
          <p role="alert" style={{ display: 'flex', gap: 'var(--space-2)', color: 'var(--danger)' }}>
            <AlertCircle size={18} aria-hidden="true" /> {error}
          </p>
        </Card>
      )}

      {loading && <p role="status" style={{ color: 'var(--text-secondary)' }}>Loading the comparison…</p>}

      {!loading && comparison && comparison.candidates.length === 0 && (
        <Card as="section" padding="lg">
          <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 600 }}>
            <Inbox size={18} aria-hidden="true" /> Nobody has completed the interview for {comparison.jobTitle} yet.
          </p>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-3)', lineHeight: 'var(--lh-normal)' }}>
            Shortlisted candidates appear here once they finish the assessment.
          </p>
          <div style={{ marginTop: 'var(--space-5)' }}>
            <Button onClick={() => navigate(`/applicants?job=${jobId}`)}>Review applicants</Button>
          </div>
        </Card>
      )}

      {!loading && comparison && comparison.candidates.length > 0 && (
        <>
          {/* Who to include */}
          <Card as="section" padding="md" style={{ marginBottom: 'var(--space-5)' }}>
            <SectionHeader level={2} title="Candidates" subtitle="Untick anyone you do not want in the table." />
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
              {comparison.candidates.map((c) => (
                <label key={c.applicationId} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(c.applicationId)}
                    onChange={() => toggleCandidate(c.applicationId)}
                  />
                  <span>{c.candidateName}</span>
                </label>
              ))}
            </div>
          </Card>

          {/* Headline scores */}
          <Card as="section" padding="lg" style={{ marginBottom: 'var(--space-5)' }}>
            <SectionHeader
              level={2}
              icon={<BarChart3 size={18} />}
              title="Summary"
              subtitle="CV match and interview score measure different things and are not comparable with each other."
            />

            <div style={{ overflowX: 'auto', marginTop: 'var(--space-4)' }}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Candidate</th>
                    <th style={th}>Status</th>
                    <th style={thNum}>CV skill match</th>
                    <th style={thNum}>Interview score</th>
                    <th style={th}>Completed</th>
                    <th style={th}>Hiring decision</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((c) => (
                    <tr key={c.applicationId}>
                      <td style={td}>
                        <strong>{c.candidateName}</strong>
                        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>{c.candidateEmail}</div>
                      </td>
                      <td style={td}><Badge tone={statusTone(c.status)}>{c.statusLabel}</Badge></td>
                      <td style={tdNum}>{matchLabel(c.matchPercentage)}</td>
                      <td style={tdNum}>
                        {c.interviewScore === null || c.interviewScore === undefined
                          ? <span style={{ color: 'var(--text-secondary)' }}>Not graded</span>
                          : <strong>{c.interviewScore}/100</strong>}
                      </td>
                      <td style={td}>
                        {c.completedAt ? new Date(c.completedAt).toLocaleDateString() : '—'}
                      </td>
                      <td style={td}>
                        <Badge tone={decisionTone(c.hiringDecision)}>
                          {c.hiringDecisionLabel}
                        </Badge>
                        {/* Draft vs announced: who has actually been told. */}
                        {c.hiringDecision !== 'PENDING' && !c.decisionPublished && (
                          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                            Draft — not announced
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={{ ...meta, marginTop: 'var(--space-4)' }}>
              <Info size={14} aria-hidden="true" />
              An interview that could not be graded shows "Not graded" rather than a zero.
            </p>
          </Card>

          {/* Question by question */}
          {comparison.questions.length > 0 ? (
            <Card as="section" padding="lg">
              <SectionHeader level={2} title="Question by question" subtitle="The job's approved questions, in the order every candidate was asked them." />

              <div style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                {comparison.questions.map((question) => {
                  const open = Boolean(expanded[question.id]);

                  return (
                    <div key={question.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                      <button
                        type="button"
                        onClick={() => setExpanded((e) => ({ ...e, [question.id]: !open }))}
                        aria-expanded={open}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
                          width: '100%', textAlign: 'left', padding: 'var(--space-4)',
                          background: 'none', border: 0, cursor: 'pointer', font: 'inherit', color: 'inherit',
                        }}
                      >
                        {open
                          ? <ChevronDown size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                          : <ChevronRight size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />}
                        <span style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600 }}>
                            Q{question.position}. {question.question}
                          </span>
                          <span style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                            <Badge tone="neutral">{question.difficulty}</Badge>
                            {question.topic && <Badge tone="info">{question.topic}</Badge>}
                          </span>
                        </span>
                        <span style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {shown.map((c) => {
                            const answer = answerFor(c, question.id, question.position);
                            return (
                              <span key={c.applicationId} style={{ textAlign: 'right', minWidth: 72 }}>
                                <span style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
                                  {c.candidateName.split(' ')[0]}
                                </span>
                                <strong>{answer?.score ?? '—'}</strong>
                              </span>
                            );
                          })}
                        </span>
                      </button>

                      {open && (
                        <div style={{ borderTop: '1px solid var(--border)', padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-5)' }}>
                          {shown.map((c) => {
                            const answer = answerFor(c, question.id, question.position);

                            return (
                              <div key={c.applicationId}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                                  <strong>{c.candidateName}</strong>
                                  {answer?.verdict && (
                                    <Badge tone={VERDICT_TONES[answer.verdict] || 'neutral'}>{answer.verdict}</Badge>
                                  )}
                                  {answer?.score !== null && answer?.score !== undefined && (
                                    <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                                      {answer.score}/100
                                    </span>
                                  )}
                                </div>

                                {answer ? (
                                  <>
                                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: 'var(--lh-normal)', marginTop: 'var(--space-2)' }}>
                                      {answer.answer || <span style={{ color: 'var(--text-secondary)' }}>No answer recorded.</span>}
                                    </p>
                                    {answer.whatWasGood && (
                                      <p style={{ ...meta, marginTop: 'var(--space-2)' }}>
                                        <strong style={{ color: 'var(--success)' }}>Good:</strong> {answer.whatWasGood}
                                      </p>
                                    )}
                                    {answer.whatWasMissing && (
                                      <p style={meta}>
                                        <strong style={{ color: 'var(--warning)' }}>Missing:</strong> {answer.whatWasMissing}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <p style={{ ...meta, marginTop: 'var(--space-2)' }}>
                                    This question is not in the stored transcript for this candidate.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            <Card as="section" padding="lg">
              <p style={meta}>
                <Info size={16} aria-hidden="true" />
                This job's questions are not approved, so there is no fixed set to compare
                answers against.
              </p>
            </Card>
          )}

          {/* Written feedback */}
          <Card as="section" padding="lg" style={{ marginTop: 'var(--space-5)' }}>
            <SectionHeader level={2} title="Assessment feedback" />
            <div style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
              {shown.map((c) => (
                <div key={c.applicationId}>
                  <strong>{c.candidateName}</strong>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--lh-normal)', marginTop: 'var(--space-1)' }}>
                    {c.feedbackSummary || 'No written feedback was stored for this interview.'}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* The decision itself. Last on the page on purpose: it is
              what the rest of the comparison is read in order to make,
              and nothing above it decides anything. */}
          <div style={{ marginTop: 'var(--space-6)' }}>
            <SectionHeader
              level={2}
              icon={<UserCheck size={18} />}
              title="Final hiring decisions"
              subtitle="Yours to make. The scores above are what you read; they decide nothing on their own."
            />

            <div style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
              {shown.map((c) => (
                <HiringDecisionPanel
                  key={c.applicationId}
                  candidate={c}
                  jobTitle={comparison.jobTitle}
                  onChanged={(decision) => setComparison((current) => ({
                    ...current,
                    candidates: current.candidates.map((row) => (
                      row.applicationId === decision.applicationId
                        ? {
                          ...row,
                          hiringDecision: decision.decision,
                          hiringDecisionLabel: decision.decisionLabel,
                          publicationStatus: decision.publicationStatus,
                          decisionPublished: decision.published,
                        }
                        : row
                    )),
                  }))}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const table = { width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' };

const th = {
  textAlign: 'left',
  padding: 'var(--space-3)',
  borderBottom: '2px solid var(--border)',
  fontSize: 'var(--fs-xs)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-secondary)',
  whiteSpace: 'nowrap',
};

const thNum = { ...th, textAlign: 'right' };

const td = { padding: 'var(--space-3)', borderBottom: '1px solid var(--border)', verticalAlign: 'top' };

const tdNum = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };

const meta = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  color: 'var(--text-secondary)',
  fontSize: 'var(--fs-sm)',
  lineHeight: 'var(--lh-normal)',
  flexWrap: 'wrap',
};
