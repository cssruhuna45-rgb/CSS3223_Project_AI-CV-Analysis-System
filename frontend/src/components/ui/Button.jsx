import React from 'react';

// Visual style -> the CSS class in index.css that draws it.
const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-outline',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

const SIZES = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

/**
 * The one button for the app.
 *
 * variant  primary (the main action on a screen - use one), secondary,
 *          ghost or danger
 * size     sm, md or lg
 * icon     a lucide icon element shown before the label
 * loading  shows a spinner, disables the button and tells screen
 *          readers it is busy, so a slow AI call cannot be submitted
 *          twice and the user can see something is happening
 *
 * type defaults to "button". A plain <button> inside a <form> is a
 * submit button, which made accidental form submissions easy.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  icon = null,
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'btn',
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading
        ? <span className="btn-spinner" aria-hidden="true" />
        : icon}
      {children}
    </button>
  );
}
