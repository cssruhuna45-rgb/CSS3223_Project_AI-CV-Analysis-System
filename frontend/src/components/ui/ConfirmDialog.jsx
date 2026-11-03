import React, { useEffect, useId, useRef } from 'react';
import Button from './Button';
import Card from './Card';

/**
 * A modal that asks before doing something that cannot be taken back.
 *
 * <p>Replaces window.confirm, which cannot be styled, cannot be read
 * properly by a screen reader in every browser, and blocks the whole
 * tab while it is open.
 *
 * <p>The caller owns the decision: this component only asks. onConfirm
 * is called once per confirmation, and the confirm button disables
 * itself while {@code busy} so a second click cannot repeat the action
 * the first one started.
 *
 * Focus moves into the dialog when it opens and returns to whatever
 * opened it when it closes, so a keyboard does not end up at the top
 * of the page with no idea what happened.
 */
export default function ConfirmDialog({
  open,
  title,
  description = null,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  busy = false,
  tone = 'primary',
  width = 460,
  children = null,
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  // What had focus before the dialog opened, so it can be given back.
  const openerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    openerRef.current = document.activeElement;

    const panel = panelRef.current;

    // No visibility filter: everything inside an open dialog is on
    // screen by construction, and offsetParent - the usual test - needs
    // layout, which means it reports nothing at all under jsdom and
    // would leave this silently doing nothing in tests.
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll(
          'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
        ) || []
      );

    // Cancel first, not confirm: opening a confirmation must never put
    // the destructive action under a stray Enter press.
    focusables()[0]?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (!busy) onCancel();
        return;
      }

      if (event.key !== 'Tab') return;

      // Tab stays inside the dialog: behind it the page is unreachable
      // to the eye, and should be to the keyboard too.
      const items = focusables();
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Only take focus back if it is still inside the dialog; if the
      // page moved on, wrenching it back would be the surprise.
      if (panel?.contains(document.activeElement)) {
        openerRef.current?.focus?.();
      }
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{
        position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center',
        background: 'rgba(0,0,0,0.5)', padding: 'var(--space-5)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      {/* The ref sits on a wrapper because Card is a plain function
          component and does not forward one. */}
      <div
        ref={panelRef}
        style={{
          maxWidth: width,
          width: '100%',
          maxHeight: 'calc(100vh - 2 * var(--space-5))',
          overflowY: 'auto',
        }}
      >
        <Card padding="md">
          <h2
            id={titleId}
            style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: 'var(--space-3)' }}
          >
            {title}
          </h2>

          {description && (
            <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--lh-normal)' }}>
              {description}
            </p>
          )}

          {children}

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-5)', flexWrap: 'wrap' }}>
            <Button variant="ghost" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </Button>
            <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
