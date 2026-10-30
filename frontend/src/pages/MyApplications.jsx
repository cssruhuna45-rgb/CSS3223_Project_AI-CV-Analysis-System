import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, FileText, AlertCircle, ArrowRight, Inbox, RefreshCw,
  Bell, Clock, PartyPopper, Handshake,
} from 'lucide-react';
import {
  applicationsAPI, notificationsAPI, statusTone,
} from '../services/jobApplicationsApi';
import { Button, Card, Badge, SectionHeader } from '../components/ui';

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
  const [unread, setUnread] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');

    applicationsAPI.mine()
      .then(setApplications)
      .catch((err) => setError(err.message || 'Your applications could not be loaded.'))
      .finally(() => setLoading(false));

    // Best effort: a notifications outage must not stop the
    // applications themselves from being readable.
    notificationsAPI.mine()
      .then((all) => setUnread((all || []).filter((n) => !n.read)))
      .catch(() => setUnread([]));
  };

  useEffect(load, []);

  const dismiss = (notificationId) => {
    setUnread((current) => current.filter((n) => n.id !== notificationId));
    notificationsAPI.markRead(notificationId).catch(() => { /* already gone */ });
  };

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

      {/* Unread announcements, so a published result is not missed
          just because the page was closed when it landed. */}
      {unread.length > 0 && (
        <Card as="section" padding="md" accent="var(--accent)" style={{ marginBottom: 'var(--space-5)' }}>
          <SectionHeader level={2} icon={<Bell size={18} />} title="New for you" />
          <div style={{ display: 'grid', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
            {unread.map((n) => (
              <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontWeight: 600 }}>{n.title}</p>
                  <p style={{ ...meta, marginTop: 2 }}>{n.message}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => dismiss(n.id)}>
                  Mark as read
                </Button>
              </div>
            ))}
          </div>
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

            <FinalResult application={application} />
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * The candidate's final hiring result for one application.
 *
 * <p>Three states, and only one of them exists before the recruiter
 * announces anything. A draft decision is indistinguishable from no
 * decision here - by design, and because the server never sends one.
 */
function FinalResult({ application }) {
  const { status, interviewCompletedAt, resultAnnounced, selected } = application;

  // Nothing to show until the interview is actually done.
  if (status !== 'INTERVIEWED' && !interviewCompletedAt) {
    return null;
  }

  // Waiting. Says the recruiter is reviewing, and nothing about
  // whether they have written anything down.
  if (!resultAnnounced) {
    return (
      <div style={{ ...panel, borderLeft: '3px solid var(--border)' }}>
        <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 600 }}>
          <Clock size={16} aria-hidden="true" />
          Final hiring decision: {application.hiringDecisionLabel || 'Awaiting recruiter decision'}
        </p>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--lh-normal)', marginTop: 'var(--space-2)' }}>
          Your interview has been completed successfully. The recruiter is reviewing your
          application. Your final result will appear here once announced.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        ...panel,
        borderLeft: `3px solid ${selected ? 'var(--success)' : 'var(--text-secondary)'}`,
        background: selected
          ? 'color-mix(in srgb, var(--success) 8%, transparent)'
          : 'var(--surface-2, transparent)',
      }}
    >
      <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 700, fontSize: 'var(--fs-lg)' }}>
        {selected
          ? <PartyPopper size={18} color="var(--success)" aria-hidden="true" />
          : <Handshake size={18} aria-hidden="true" />}
        {selected ? 'Congratulations — you have been selected' : 'Thank you for your participation'}
      </p>

      <p style={{ ...meta, marginTop: 'var(--space-2)' }}>
        Final hiring decision: <strong>{application.hiringDecisionLabel}</strong>
        {application.resultAnnouncedAt
          ? ` · announced ${new Date(application.resultAnnouncedAt).toLocaleDateString()}`
          : ''}
      </p>

      <p style={{ lineHeight: 'var(--lh-normal)', marginTop: 'var(--space-3)' }}>
        {selected
          // Careful wording: a selection is not an offer, and must not
          // read as one.
          ? 'You have been selected for this position. The recruitment team will contact you regarding the next steps.'
          : 'Thank you for taking the time to attend the interview. Unfortunately, you were not selected for this position. We appreciate your interest and wish you success in future opportunities.'}
      </p>

      {application.recruiterFeedback && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <p style={{ fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            Message from {application.recruiterName}
          </p>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 'var(--lh-normal)', marginTop: 'var(--space-1)' }}>
            {application.recruiterFeedback}
          </p>
        </div>
      )}
    </div>
  );
}

const panel = {
  marginTop: 'var(--space-5)',
  padding: 'var(--space-4)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--surface-2, transparent)',
};

const meta = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  color: 'var(--text-secondary)',
  fontSize: 'var(--fs-sm)',
  lineHeight: 'var(--lh-normal)',
};
