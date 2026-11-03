import React, { useEffect, useId, useRef } from 'react';
import Button from './Button';
import Card from './Card';

/**
 * The app's confirmation dialog, in place of the browser's
 * window.confirm, which ignores the theme. Same look as the hiring
 * decision and shortlist confirmations.
 *
 * open          shows the dialog
 * title         the question, e.g. "Approve these questions?"
 * children      what happens if the user confirms
 * confirmLabel  the confirm button's text; name the action ("Approve"),
 *               not "OK"
 * tone          primary, or danger for something destructive
 * busy          spinner on the confirm button, and the dialog cannot be
 *               dismissed while the action runs
 * onConfirm / onCancel
 *
 * Escape and a click outside cancel. Focus starts on Cancel, so Enter
 * never confirms a one-way action by accident, and returns to whatever
 * had it once the dialog closes.
 */
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previous = document.activeElement;
    panel.current?.querySelector('button')?.focus();

    return () => {
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{
        position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center',
        background: 'rgba(0,0,0,0.5)', padding: 'var(--space-5)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}
    >
      <Card padding="lg" style={{ maxWidth: 460, width: '100%' }}>
        <div ref={panel}>
          <h2 id={titleId} style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
            {title}
          </h2>
          {children && (
            <div style={{ color: 'var(--text-secondary)', lineHeight: 'var(--lh-normal)' }}>
              {children}
            </div>
          )}
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 'var(--space-5)' }}>
            <Button variant="ghost" onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
            <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
