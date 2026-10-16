import React from 'react';

// Badges are named by what they MEAN, not by their colour. A page that
// asks for tone="danger" stays right if the palette changes, and the
// same meaning always gets the same colour - so a score in red is
// always bad news, never just decoration.
const TONES = {
  success: 'badge-green',
  warning: 'badge-yellow',
  danger: 'badge-red',
  info: 'badge-blue',
  neutral: 'badge-neutral',
};

/**
 * A small label for a status or category.
 *
 * tone  success, warning, danger, info or neutral
 * icon  a lucide icon element shown before the text
 *
 * Colour is never the only signal: the text itself must say the status
 * ("Completed", not just a green dot), for colour-blind users.
 */
export default function Badge({
  tone = 'neutral',
  icon = null,
  className = '',
  children,
  ...rest
}) {
  return (
    <span
      className={['badge', TONES[tone] || TONES.neutral, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon && <span aria-hidden="true" style={{ display: 'inline-flex' }}>{icon}</span>}
      {children}
    </span>
  );
}
