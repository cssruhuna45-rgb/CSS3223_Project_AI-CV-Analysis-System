import React from 'react';
import { Globe } from 'lucide-react';
import { Button, Card } from './ui';

/**
 * Asked once, straight after a job is created: publish it to the
 * candidates' Public Jobs list now, or keep it as a draft.
 *
 * Keep as draft is the default (it has the focus, and closing the
 * dialog any other way means the same), so nothing becomes public
 * without the recruiter choosing it. Either way the job can be
 * published or unpublished later from its card.
 */
export default function PublishJobDialog({ job, publishing = false, onPublish, onKeepDraft }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-job-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center',
        background: 'rgba(0,0,0,0.5)', padding: 'var(--space-5)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !publishing) onKeepDraft(); }}
      onKeyDown={(e) => { if (e.key === 'Escape' && !publishing) onKeepDraft(); }}
    >
      <Card padding="lg" style={{ maxWidth: 460, width: '100%' }}>
        <h2 id="publish-job-title" style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
          Make “{job.title}” public?
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--lh-normal)' }}>
          A published job is listed under Public Jobs, where any signed-in candidate can find it
          and apply. A draft stays private: only candidates you send the invite link to can apply.
          You can change this at any time from the job's card.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 'var(--space-5)' }}>
          <Button variant="ghost" onClick={onKeepDraft} disabled={publishing} autoFocus>
            Keep as draft
          </Button>
          <Button icon={<Globe size={16} />} loading={publishing} onClick={onPublish}>
            Publish now
          </Button>
        </div>
      </Card>
    </div>
  );
}
