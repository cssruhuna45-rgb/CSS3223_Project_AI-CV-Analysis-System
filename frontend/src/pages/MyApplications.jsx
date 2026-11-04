import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, FileText, AlertCircle, ArrowRight, Inbox, RefreshCw,
  Bell, Clock, PartyPopper, Handshake, ListOrdered, EyeOff, Eye, Send,
} from 'lucide-react';
import {
  applicationsAPI, notificationsAPI, statusTone, notificationsChanged,
} from '../services/jobApplicationsApi';
import { Button, Card, Badge, SectionHeader, ConfirmDialog, PageHeader } from '../components/ui';
import useScrollReveal from '../hooks/useScrollReveal';
import { userMessage } from '../services/http';

// Mirrors TOTAL_TIME in InterviewRoom.jsx, which is 120 seconds. Stated
// here so the reminder matches the clock the candidate will actually
// see; if that constant changes, change this with it.
const MINUTES_PER_QUESTION = 2;

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
  // The application whose interview is waiting to be confirmed, and
  // whether that confirmation has already been acted on.
  const [pending, setPending] = useState(null);
  const [starting, setStarting] = useState(false);
  const pageRef = useRef(null);

  // No early return in this component. Re-runs once the applications
  // have loaded, since the cards it looks for do not exist before then.
  useScrollReveal(pageRef, [applications.length]);
  // Applications from an earlier load stay on screen when a refresh
  // fails, marked as possibly out of date rather than wiped.
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    setNotificationsError('');

    applicationsAPI.mine()
      .then((list) => { setApplications(list); setLoadedOnce(true); })
      .catch((err) => setError(userMessage(err, "We couldn't load your applications. Please try again.")))
      .finally(() => setLoading(false));

    // Separate from the applications: a notifications outage must not
    // stop them being readable, but it is reported, not hidden.
    notificationsAPI.mine()
      .then((all) => setUnread((all || []).filter((n) => !n.read)))
      .catch((err) => {
        console.error('[MyApplications] Could not load notifications:', err);
        setNotificationsError(userMessage(err, "We couldn't load your notifications. Your applications are still shown below."));
      });
  };

  useEffect(load, []);

  const dismiss = (notificationId) => {
    const dismissed = unread.find((n) => n.id === notificationId);
    setUnread((current) => current.filter((n) => n.id !== notificationId));
    notificationsAPI.markRead(notificationId)
      .catch((err) => {
        // Put it back: it is still unread on the server.
        if (dismissed) setUnread((current) => (current.some((n) => n.id === notificationId) ? current : [dismissed, ...current]));
        setNotificationsError(userMessage(err, "We couldn't mark that notification as read. Please try again."));
      })
      // The sidebar shows the unread count, so it has to hear about
      // this. Announced either way: if the notification was already
      // read elsewhere, the count still needs refreshing.
      .finally(notificationsChanged);
  };

  // An attempt already under way is continued, not restarted: the
  // server refuses a second start. No confirmation in that case - the
  // attempt and the clock have already begun, so asking "are you sure
  // you want to start?" would be both wrong and alarming.
  const startInterview = (application) => {
    if (application.interviewResumable && application.interviewSessionId) {
      navigate(`/interview?resume=${encodeURIComponent(application.interviewSessionId)}`);
      return;
    }

    setPending(application);
  };

  // The interview is still started through the invite code, which is
  // what identifies the job to the server. Guarded against a second
  // click: the first one navigates away, but a fast double-click would
  // otherwise run this twice before React unmounts the page.
  const beginInterview = () => {
    if (!pending || starting) return;

    setStarting(true);

    sessionStorage.setItem('jobInvite', JSON.stringify({
      code: pending.inviteCode,
      title: pending.jobTitle,
      company: pending.company,
    }));
    navigate('/interview');
  };

  return (
    <div className="workspace-page workspace-page--applications" ref={pageRef} style={{ maxWidth: 960, margin: '0 auto', padding: '0' }}>
      <PageHeader
        icon={<Send size={18} />}
        title="My applications"
        subtitle="Jobs you have applied for, and what the recruiter decided."
        action={(
          <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={load} loading={loading}>
            Refresh
          </Button>
        )}
      />

      {error && (
        <Card as="section" padding="md" style={{ marginBottom: 'var(--space-5)' }}>
          <div role="alert" style={{ display: 'flex', gap: 'var(--space-2)', color: 'var(--danger)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ flex: 1 }}>
              <span className="sr-only">Error: </span>{error}
              {loadedOnce && applications.length > 0 && ' The list below is from your last successful load and may be out of date.'}
            </p>
            <Button size="sm" variant="secondary" onClick={load} loading={loading}>Try again</Button>
          </div>
        </Card>
      )}

      {notificationsError && (
        <p role="alert" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', color: 'var(--danger)', marginBottom: 'var(--space-4)', fontSize: 'var(--fs-sm)' }}>
          <AlertCircle size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <span><span className="sr-only">Error: </span>{notificationsError}</span>
        </p>
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

      <div className="subreveal-stagger" style={{ display: 'grid', gap: 'var(--space-4)' }}>
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

      {/* A job interview is one attempt, timed, with the recruiter's own
          questions - and until now a single click began it. This only
          restates rules that already apply; it changes none of them.

          Kept short on purpose: five paragraphs of prose is a wall
          nobody reads before clicking past it. One line each, an icon
          to anchor it, and the whole thing fits without scrolling. */}
      <ConfirmDialog
        open={Boolean(pending)}
        title="Before you start"
        confirmLabel="Start interview"
        width={420}
        busy={starting}
        onConfirm={beginInterview}
        onCancel={() => setPending(null)}
      >
        {pending && (
          <>
            <p style={{ ...meta, marginTop: 'calc(-1 * var(--space-2))' }}>
              <Briefcase size={14} aria-hidden="true" />
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{pending.jobTitle}</span>
              {pending.company ? ` · ${pending.company}` : ''}
            </p>

            <ul style={rules}>
              <li style={rule}>
                <AlertCircle size={15} aria-hidden="true" style={ruleIcon} />
                <span><strong>One attempt.</strong> It cannot be retaken.</span>
              </li>
              <li style={rule}>
                <Clock size={15} aria-hidden="true" style={ruleIcon} />
                <span><strong>{MINUTES_PER_QUESTION} minutes</strong> per question, then it submits as it stands.</span>
              </li>
              <li style={rule}>
                <ListOrdered size={15} aria-hidden="true" style={ruleIcon} />
                <span>Questions are set by the recruiter, in a fixed order.</span>
              </li>
              <li style={rule}>
                <EyeOff size={15} aria-hidden="true" style={ruleIcon} />
                <span>Expected answers appear only on your scorecard.</span>
              </li>
              <li style={rule}>
                <Eye size={15} aria-hidden="true" style={ruleIcon} />
                <span>Leaving the page and pasting are recorded.</span>
              </li>
            </ul>

            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)', marginTop: 'var(--space-3)', lineHeight: 'var(--lh-normal)' }}>
              Reloading is safe - you continue from the same question.
            </p>
          </>
        )}
      </ConfirmDialog>
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
          : 'var(--bg-card2)',
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

const rules = {
  listStyle: 'none',
  margin: 'var(--space-4) 0 0',
  padding: 0,
  display: 'grid',
  gap: 'var(--space-2)',
  fontSize: 'var(--fs-sm)',
  lineHeight: 'var(--lh-normal)',
};

const rule = {
  display: 'flex',
  gap: 'var(--space-3)',
  alignItems: 'flex-start',
};

const ruleIcon = {
  flexShrink: 0,
  marginTop: 3,
  color: 'var(--text-muted)',
};

const panel = {
  marginTop: 'var(--space-5)',
  padding: 'var(--space-4)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--bg-card2)',
};

const meta = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  color: 'var(--text-secondary)',
  fontSize: 'var(--fs-sm)',
  lineHeight: 'var(--lh-normal)',
};
