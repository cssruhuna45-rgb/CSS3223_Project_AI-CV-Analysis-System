import React from 'react';

/**
 * The title row at the top of a section.
 *
 * Pages drew these as a styled <span>, so to a screen reader the page
 * had no headings at all and could not be navigated by them. This
 * renders a real heading element, styled to look the same.
 *
 * level     2 for a section of the page, 3 for a section inside one.
 *           The page title itself is the h1.
 * icon      a lucide icon element shown before the title
 * color     colour of the icon and title, e.g. "var(--info)"
 * subtitle  one line under the title
 * action    an element on the right, e.g. a small Button
 */
export default function SectionHeader({
  level = 2,
  icon = null,
  color = null,
  title,
  subtitle = null,
  action = null,
  id,
}) {
  const Heading = `h${Math.min(Math.max(level, 2), 6)}`;

  return (
    <div className="section-header">
      <div>
        <Heading
          id={id}
          className="section-header__title"
          style={color ? { color } : undefined}
        >
          {icon && <span aria-hidden="true" style={{ display: 'inline-flex' }}>{icon}</span>}
          {title}
        </Heading>
        {subtitle && <p className="section-header__subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
