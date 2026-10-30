import React, { useEffect, useState } from 'react';
import {
  CheckCircle, XCircle, Save, Send, AlertCircle, Lock, Eye, EyeOff,
} from 'lucide-react';
import {
  applicantsAPI, decisionTone, defaultFeedback,
} from '../services/jobApplicationsApi';
import { Button, Card, SectionHeader, Badge } from './ui';

/**
 * The recruiter's final hiring decision for one interviewed candidate.
 *
 * <p>Two deliberate properties of this panel.
 *
 * <p><strong>Choosing is not announcing.</strong> Picking Selected or
 * Not selected changes nothing the candidate can see; it has to be
 * saved, and then published as a separate, confirmed step. Nothing here
 * auto-publishes.
 *
 * <p><strong>The score does not decide.</strong> The interview mark and
 * CV match are shown elsewhere on the page for the recruiter to read.
 * This panel never preselects an option from them, and offers no
 * "decide for me" action.
 *
 * Internal notes are kept visually apart from candidate feedback, and
 * labelled, so the two are hard to confuse while typing.
 */
export default function HiringDecisionPanel({ candidate, jobTitle, onChanged }) {
  const { applicationId, candidateName } = candidate;

  const [decision, setDecision] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const [loaded, setLoaded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError('');

    applicantsAPI.getDecision(applicationId)
      .then((found) => {
        if (cancelled) return;
        setLoaded(found);
        setDecision(found.decision === 'PENDING' ? null : found.decision);
        setFeedback(found.candidateFeedback || '');
        setNotes(found.internalNotes || '');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'The decision could not be loaded.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [applicationId]);

  const published = Boolean(loaded?.published);

  // Offer wording the recruiter can then edit, rather than sending
  // something they never saw.
  const choose = (value) => {
    setDecision(value);
    setNotice('');
    if (!feedback.trim()) setFeedback(defaultFeedback(value, jobTitle));
  };

  const save = async () => {
    if (!decision) {
      setError('Choose whether this candidate is selected.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const saved = await applicantsAPI.saveDecision(applicationId, {
        decision,
        candidateFeedback: feedback,
        internalNotes: notes,
      });
      setLoaded(saved);
      setNotice('Saved. The candidate has not been told yet.');
      onChanged?.(saved);
    } catch (err) {
      setError(err.message || 'The decision could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    setError('');

    try {
      const out = await applicantsAPI.publishDecision(applicationId);
      setLoaded(out);
      setConfirming(false);
      setNotice('Published. The candidate can see this result now.');
      onChanged?.(out);
    } catch (err) {
      setError(err.message || 'The decision could not be published.');
      setConfirming(false);
    } finally {
      setPublishing(false);
    }
  };

  const reset = () => {
    setDecision(loaded?.decision === 'PENDING' ? null : loaded?.decision ?? null);
    setFeedback(loaded?.candidateFeedback || '');
    setNotes(loaded?.internalNotes || '');
    setError('');
    setNotice('');
  };

  if (loading) {
    return (
      <Card as="section" padding="md">
        <p role="status" style={{ color: 'var(--text-secondary)' }}>Loading the decision…</p>
      </Card>
    );
  }

  return (
    <Card as="section" padding="lg" accent="var(--accent)">
      <SectionHeader
        level={3}
        title={`Final hiring decision — ${candidateName}`}
        subtitle={
          published
            ? 'Announced. The candidate has been notified and can see this result.'
            : 'Saved decisions stay private until you publish them.'
        }
        action={
          loaded ? (
            <Badge tone={decisionTone(loaded.decision)}>
              {loaded.decisionLabel}
              {loaded.published ? '' : ' (draft)'}
            </Badge>
          ) : null
        }
      />

      {/* Published: final, read-only */}
      {published ? (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <p style={meta}>
            <Lock size={15} aria-hidden="true" />
            Announced{loaded.publishedAt ? ` on ${new Date(loaded.publishedAt).toLocaleDateString()}` : ''}
            {loaded.decidedByName ? ` by ${loaded.decidedByName}` : ''}. This cannot be changed here.
          </p>

          {loaded.candidateFeedback && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <p style={label}>Message the candidate can see</p>
              <p style={quoted}>{loaded.candidateFeedback}</p>
            </div>
          )}

          {loaded.internalNotes && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <p style={label}>
                <EyeOff size={13} aria-hidden="true" /> Your private notes — never shown to the candidate
              </p>
              <p style={quoted}>{loaded.internalNotes}</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* The choice */}
          <fieldset style={{ border: 0, padding: 0, margin: 'var(--space-4) 0 0' }}>
            <legend style={label}>Your decision</legend>

            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
              <Button
                variant={decision === 'SELECTED' ? 'primary' : 'secondary'}
                icon={<CheckCircle size={16} />}
                onClick={() => choose('SELECTED')}
                aria-pressed={decision === 'SELECTED'}
              >
                Selected for job
              </Button>
              <Button
                variant={decision === 'NOT_SELECTED' ? 'danger' : 'secondary'}
                icon={<XCircle size={16} />}
                onClick={() => choose('NOT_SELECTED')}
                aria-pressed={decision === 'NOT_SELECTED'}
              >
                Not selected
              </Button>
            </div>
          </fieldset>

          {/* What the candidate reads */}
          <div style={{ marginTop: 'var(--space-5)' }}>
            <label className="label" htmlFor={`feedback-${applicationId}`}>
              <Eye size={13} aria-hidden="true" /> Message the candidate will see
            </label>
            <textarea
              id={`feedback-${applicationId}`}
              className="input"
              rows={4}
              maxLength={2000}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Optional. Choose a decision above to start from a suggested message, then edit it."
            />
            <p style={{ ...meta, marginTop: 'var(--space-1)' }}>
              {feedback.length}/2000 characters. Shown only once you publish.
            </p>
          </div>

          {/* The recruiter's own notes */}
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Button
              variant="ghost"
              size="sm"
              icon={showNotes ? <EyeOff size={14} /> : <Eye size={14} />}
              onClick={() => setShowNotes((v) => !v)}
            >
              {showNotes ? 'Hide private notes' : 'Add private notes'}
            </Button>

            {showNotes && (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <label className="label" htmlFor={`notes-${applicationId}`}>
                  <EyeOff size={13} aria-hidden="true" /> Private notes — never shown to the candidate
                </label>
                <textarea
                  id={`notes-${applicationId}`}
                  className="input"
                  rows={3}
                  maxLength={2000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Your own reasoning. Stays with your account."
                />
              </div>
            )}
          </div>

          {error && (
            <p role="alert" style={{ display: 'flex', gap: 'var(--space-2)', color: 'var(--danger)', fontSize: 'var(--fs-sm)', marginTop: 'var(--space-3)' }}>
              <AlertCircle size={16} aria-hidden="true" /> {error}
            </p>
          )}

          {notice && (
            <p role="status" style={{ display: 'flex', gap: 'var(--space-2)', color: 'var(--success)', fontSize: 'var(--fs-sm)', marginTop: 'var(--space-3)' }}>
              <CheckCircle size={16} aria-hidden="true" /> {notice}
            </p>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-5)' }}>
            <Button variant="secondary" icon={<Save size={16} />} loading={saving} onClick={save}>
              Save draft
            </Button>
            <Button
              icon={<Send size={16} />}
              disabled={!loaded?.readyToPublish}
              onClick={() => setConfirming(true)}
            >
              Publish decision
            </Button>
            <Button variant="ghost" onClick={reset} disabled={saving}>
              Cancel
            </Button>
          </div>

          {!loaded?.readyToPublish && (
            <p style={{ ...meta, marginTop: 'var(--space-3)' }}>
              Save a decision before you can publish it.
            </p>
          )}
        </>
      )}

      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`confirm-publish-${applicationId}`}
          style={{
            position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center',
            background: 'rgba(0,0,0,0.5)', padding: 'var(--space-5)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirming(false); }}
        >
          <Card padding="lg" style={{ maxWidth: 460, width: '100%' }}>
            <h2
              id={`confirm-publish-${applicationId}`}
              style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: 'var(--space-3)' }}
            >
              Publish this hiring decision?
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--lh-normal)' }}>
              {candidateName} will be able to see this result immediately, and will be
              notified. Published decisions are final.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-5)' }}>
              <Button variant="ghost" onClick={() => setConfirming(false)} disabled={publishing}>
                Cancel
              </Button>
              <Button loading={publishing} onClick={publish}>Publish</Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}

const meta = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  color: 'var(--text-secondary)',
  fontSize: 'var(--fs-sm)',
  lineHeight: 'var(--lh-normal)',
  flexWrap: 'wrap',
};

const label = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  fontSize: 'var(--fs-xs)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-secondary)',
  marginBottom: 'var(--space-1)',
};

const quoted = {
  whiteSpace: 'pre-wrap',
  lineHeight: 'var(--lh-normal)',
  padding: 'var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  background: 'color-mix(in srgb, var(--accent) 6%, transparent)',
};
