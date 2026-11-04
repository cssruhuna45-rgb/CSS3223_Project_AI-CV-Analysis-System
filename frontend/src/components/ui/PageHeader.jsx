import React from 'react';

/** Shared page hierarchy. The shell bar provides location; this header
 * explains the task and exposes its primary action. */
export default function PageHeader({ title, subtitle = null, icon = null, action = null, id = undefined }) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        <h1 id={id} className="page-header-title">
          {icon && <span className="page-header-icon" aria-hidden="true">{icon}</span>}
          {title}
        </h1>
        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  );
}
