import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, FileText, AlertCircle, ArrowRight, Inbox, RefreshCw,
} from 'lucide-react';
import { applicationsAPI, statusTone } from '../services/jobApplicationsApi';
import { Button, Card, Badge } from '../components/ui';

/**
 * The candidate's own applications and where each one has got to.
 *
 * The Start Interview action appears only when the server says it may:
 * {@code interviewAvailable} is computed from the application's status,
 * the job being open and approved, and the attempt being unused. When
 * it is false the server sends the reason to show instead, so the page
 * never has to guess why.
 *
 * Hiding the action is a courtesy, not the control. Every restriction
 * is enforced again when the interview is actually started.
 */
export default function MyApplications() {
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');

    applicationsAPI.mine()
      .then(setApplications)
      .catch((err) => setError(err.message || 'Your applications could not be loaded.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // The interview is still started through the invite code, which is
  // what identifies the job to the server.
  const startInterview = (application) => {
    sessionStorage.setItem('jobInvite', JSON.stringify({
      code: application.inviteCode,
      title: application.jobTitle,
      company: application.company,
    }));
    navigate('/interview');
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 'var(--space-6) var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
            My applications
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-5)', lineHeight: 'var(--lh-normal)' }}>
            Jobs you have applied for, and what the recruiter decided.
          </p>
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={load} loading={loading}>
          Refresh
        </Button>
      </div>

      {error && (
        <Card as="section" padding="md">
          <p role="alert" style={{ display: 'flex', gap: 'var(--space-2)', color: 'var(--danger)' }}>
            <AlertCircle size={18} aria-hidden="true" /> {error}
          </p>
        </Card>
      )}

      {!error && loading && (
        <p role="status" style={{ color: 'var(--text-secondary)' }}>Loading your applications…</p>
      )}

      {!error && !loading && applications.length === 0 && (
        <Card as="section" padding="lg">
          <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 600 }}>
            <Inbox size={18} aria-hidden="true" /> You have not applied for any jobs yet.
          </p>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-3)', lineHeight: 'var(--lh-normal)' }}>
            When a recruiter sends you an invite code, open it to read the job and apply.
          </p>
          <div style={{ marginTop: 'var(--space-5)' }}>
            <Button onClick={() => navigate('/join')}>Enter an invite code</Button>
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        {applications.map((application) => (
          <Card
            key={application.applicationId}
            as="article"
            padding="lg"
            aria-labelledby={`job-${application.applicationId}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 220, flex: '1 1 320px' }}>
                <p style={meta}>
                  <Briefcase size={15} aria-hidden="true" />
                  {application.company || application.recruiterName}
                </p>
                <h2
                  id={`job-${application.applicationId}`}
                  style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, margin: 'var(--space-1) 0 var(--space-2)' }}
                >
                  {application.jobTitle}
                </h2>
                <p style={meta}>
                  <FileText size={15} aria-hidden="true" />
                  Applied with {application.submittedCvFileName}
                  {application.appliedAt
                    ? ` on ${new Date(application.appliedAt).toLocaleDateString()}`
                    : ''}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                {/* The label is the server's wording, so a candidate
                    never sees a raw status like "REJECTED". */}
                <Badge tone={statusTone(application.status)}>{application.statusLabel}</Badge>
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-5)' }}>
              {application.interviewAvailable ? (
                <Button
                  icon={<ArrowRight size={16} />}
                  onClick={() => startInterview(application)}
                >
                  {application.interviewResumable ? 'Resume interview' : 'Start interview'}
                </Button>
              ) : (
                <p role="status" style={meta}>
                  {application.interviewMessage
                    || (application.interviewCompletedAt
                      ? `Interview completed on ${new Date(application.interviewCompletedAt).toLocaleDateString()}.`
                      : 'The interview is not available for this application.')}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

const meta = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  color: 'var(--text-secondary)',
  fontSize: 'var(--fs-sm)',
  lineHeight: 'var(--lh-normal)',
};
