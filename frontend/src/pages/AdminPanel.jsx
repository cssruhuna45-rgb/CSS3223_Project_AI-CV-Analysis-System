import { useToast } from '../components/ToastProvider';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ShieldCheck, Check, X } from 'lucide-react';
import { adminAPI } from '../services/api';
import { Badge, Button, Card, SectionHeader, PageHeader } from '../components/ui';
import useScrollReveal from '../hooks/useScrollReveal';

const STATUS = {
  pending: { label: 'Waiting', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

const FILTERS = [
  ['pending', 'Waiting'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['all', 'All'],
];

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Administrator page: decides which recruiter accounts may see
// candidates' results. A decision can be changed later - approving a
// rejected account, or rejecting an approved one to take access away -
// and takes effect on that recruiter's next request.
export default function AdminPanel() {
  const notify = useToast();
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  const pageRef = useRef(null);

  // No early return in this component. A single fade for the whole
  // table, not a per-row stagger: a transform on every <tr> in a dense
  // admin table reads as busy rather than considered, which the lighter
  // card-grid treatment elsewhere does not have to worry about.
  useScrollReveal(pageRef, [recruiters.length]);

  useEffect(() => {
    adminAPI.recruiters()
      .then(setRecruiters)
      .catch((err) => setError(err.message || 'Could not load recruiter accounts.'))
      .finally(() => setLoading(false));
  }, []);

  const shown = useMemo(
    () => (filter === 'all' ? recruiters : recruiters.filter((r) => r.approvalStatus === filter)),
    [recruiters, filter]
  );

  const waiting = recruiters.filter((r) => r.approvalStatus === 'pending').length;

  const decide = async (id, action) => {
    setBusyId(id);
    setError('');
    try {
      const updated = await (action === 'approve' ? adminAPI.approve(id) : adminAPI.reject(id));
      notify(action === 'approve' ? 'Recruiter access approved.' : 'Recruiter access rejected.', action === 'approve' ? 'success' : 'info');
      setRecruiters((list) => list.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      setError(err.message || 'That change was not saved. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="workspace-page workspace-page--admin" ref={pageRef} style={{ maxWidth: 1040, margin: '0 auto', padding: '0' }}>
      <PageHeader
        icon={<ShieldCheck size={18} />}
        title="Administration"
        subtitle={loading
          ? 'Loading recruiter accounts…'
          : waiting === 0
            ? 'No recruiter accounts are waiting for a decision.'
            : `${waiting} recruiter account${waiting === 1 ? ' is' : 's are'} waiting for a decision.`}
      />

      <Card as="section" padding="md" aria-labelledby="recruiters-title" className="subreveal">
        <SectionHeader
          id="recruiters-title"
          icon={<ShieldCheck size={18} />}
          title="Recruiter accounts"
          subtitle="A recruiter sees candidates' results only after you approve the account."
        />

        <div role="group" aria-label="Show accounts" style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
          {FILTERS.map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={filter === value ? 'primary' : 'ghost'}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>

        {error && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-4)' }}>
            {error}
          </p>
        )}

        {!loading && shown.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: 'var(--space-5) 0', textAlign: 'center' }}>
            No accounts in this list.
          </p>
        ) : (
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Recruiter accounts">
            <table className="workspace-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
              <caption className="sr-only">Recruiter accounts and their approval status</caption>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th scope="col" style={{ padding: 'var(--space-2) var(--space-3)' }}>Name</th>
                  <th scope="col" style={{ padding: 'var(--space-2) var(--space-3)' }}>Email</th>
                  <th scope="col" style={{ padding: 'var(--space-2) var(--space-3)' }}>Registered</th>
                  <th scope="col" style={{ padding: 'var(--space-2) var(--space-3)' }}>Status</th>
                  <th scope="col" style={{ padding: 'var(--space-2) var(--space-3)' }}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const status = STATUS[r.approvalStatus] || STATUS.pending;
                  const busy = busyId === r.id;
                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: 'var(--space-3)', fontWeight: 600 }}>{r.name}</td>
                      <td style={{ padding: 'var(--space-3)' }}>{r.email}</td>
                      <td style={{ padding: 'var(--space-3)', whiteSpace: 'nowrap' }}>{formatDate(r.registeredAt)}</td>
                      <td style={{ padding: 'var(--space-3)' }}><Badge tone={status.tone}>{status.label}</Badge></td>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                          {r.approvalStatus !== 'approved' && (
                            <Button size="sm" icon={<Check size={14} />} loading={busy}
                              aria-label={`Approve ${r.name}`} onClick={() => decide(r.id, 'approve')}>
                              Approve
                            </Button>
                          )}
                          {r.approvalStatus !== 'rejected' && (
                            <Button size="sm" variant="danger" icon={<X size={14} />} loading={busy}
                              aria-label={`${r.approvalStatus === 'approved' ? 'Revoke access for' : 'Reject'} ${r.name}`}
                              onClick={() => decide(r.id, 'reject')}>
                              {r.approvalStatus === 'approved' ? 'Revoke' : 'Reject'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
