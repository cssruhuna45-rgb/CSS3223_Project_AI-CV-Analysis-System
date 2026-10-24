import { useToast } from '../components/ToastProvider';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, XCircle, RefreshCw } from 'lucide-react';
import { authAPI } from '../services/api';
import { homePathFor, toStoredUser } from '../constants/accounts';
import { Button, Card } from '../components/ui';

// Where a recruiter waits until an administrator has approved the
// account. The dashboard shows other people's results, so it stays
// closed until then - the server refuses it too, this page only says
// why instead of showing an error.
export default function PendingApproval({ user, onUserChange }) {
  const notify = useToast();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const rejected = user?.approvalStatus === 'rejected';

  const checkAgain = async () => {
    setChecking(true);
    setError('');
    try {
      const fresh = toStoredUser(await authAPI.me(), user?.name, user?.email);
      localStorage.setItem('user', JSON.stringify(fresh));
      onUserChange(fresh);
      const next = homePathFor(fresh);
      if (next !== '/pending') {
        notify('Your account is approved.');
        navigate(next, { replace: true });
      } else {
        notify(fresh.approvalStatus === 'rejected'
          ? 'Recruiter access was not approved.'
          : 'Your account is still awaiting approval.', 'info');
      }
    } catch (err) {
      setError(err.message || 'Could not check right now. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-7) var(--space-5)' }}>
      <Card as="section" padding="lg" aria-labelledby="pending-title" style={{ textAlign: 'center' }}>
        <div aria-hidden="true" style={{ color: rejected ? 'var(--danger)' : 'var(--warning)', marginBottom: 'var(--space-4)' }}>
          {rejected ? <XCircle size={40} /> : <Clock size={40} />}
        </div>

        <h1 id="pending-title" style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
          {rejected ? 'Recruiter access was not approved' : 'Waiting for approval'}
        </h1>

        <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--lh-normal)', marginBottom: 'var(--space-5)' }}>
          {rejected
            ? 'An administrator reviewed this account and did not give it recruiter access. If you think this is a mistake, contact the platform administrator.'
            : 'Recruiter accounts can see candidates’ interview results, so an administrator checks each one first. You can use the dashboard as soon as your account is approved.'}
        </p>

        {!rejected && (
          <Button variant="secondary" icon={<RefreshCw size={16} />} loading={checking} onClick={checkAgain}>
            Check again
          </Button>
        )}

        {error && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--fs-sm)', marginTop: 'var(--space-4)' }}>
            {error}
          </p>
        )}
      </Card>
    </div>
  );
}
