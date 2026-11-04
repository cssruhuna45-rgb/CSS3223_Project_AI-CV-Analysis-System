import React from 'react';
import { useLocation } from 'react-router-dom';

// Without this, an error thrown while one page renders unmounts the
// whole app and leaves a blank white screen. The boundary catches it,
// keeps the navigation on screen, and offers a way out.
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // Still visible in the browser console for whoever is debugging.
    console.error('A page failed to render:', error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div role="alert" className="card" style={{ maxWidth: 520, margin: '64px auto', padding: 20, textAlign: 'center' }}>
        <h1 style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
          This page hit an unexpected problem. Reload to try again, or go back home. Anything you hadn't submitted yet may need to be entered again.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Reload page</button>
          <a href="/" className="btn btn-outline">Go home</a>
        </div>
      </div>
    );
  }
}

// Keyed by the path, so moving to another page clears a failure
// instead of leaving the error screen up everywhere.
export default function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <ErrorBoundary key={pathname}>{children}</ErrorBoundary>;
}
