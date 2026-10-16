import React from 'react';

const PADDING = {
  sm: 'var(--space-4)',
  md: 'var(--space-5)',
  lg: 'var(--space-6)',
};

/**
 * A surface that groups related content.
 *
 * as       the element to render. Use "section" or "article" when the
 *          card is a self-contained part of the page, so screen readers
 *          can jump between them; a plain "div" otherwise.
 * padding  sm, md or lg, from the spacing scale
 * accent   optional colour for the 3px top edge some pages use to tell
 *          sections apart, e.g. "var(--info)"
 */
export default function Card({
  as: Tag = 'div',
  padding = 'md',
  accent = null,
  className = '',
  style = {},
  children,
  ...rest
}) {
  return (
    <Tag
      className={['card', className].filter(Boolean).join(' ')}
      style={{
        padding: PADDING[padding] || PADDING.md,
        ...(accent ? { borderTop: `3px solid ${accent}` } : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
