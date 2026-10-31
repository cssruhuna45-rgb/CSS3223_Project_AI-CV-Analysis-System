import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './index.css';

import Navbar from './components/Navbar';
import AppShell, { BLEED_ROUTES } from './components/AppShell';
import Footer from './components/Footer';
import { ToastProvider, useToast } from './components/ToastProvider';
import Landing from './pages/Landing';
import Home from './pages/Home';
import CandidateHome from './pages/CandidateHome';
import Login from './pages/Login';
import PasswordRecovery from './pages/PasswordRecovery';
import Register from './pages/Register';
import CVUpload from './pages/CVUpload';
import InterviewRoom from './pages/InterviewRoom';
import Scorecard from './pages/Scorecard';
import Progress from './pages/Progress';
import SkillGap from './pages/SkillGap';
import RecruiterDashboard from './pages/RecruiterDashboard';
import PendingApproval from './pages/PendingApproval';
import RecruiterJobs from './pages/RecruiterJobs';
import JoinInterview from './pages/JoinInterview';
import AdminPanel from './pages/AdminPanel';
import DesignSystem from './pages/DesignSystem';
import { homePathFor, isApprovedRecruiter, toStoredUser } from './constants/accounts';

// Focus mode. The interview is the most demanding screen in the app,
// so the footer links are left out there: nothing on screen competes
// with the question for attention.
const FOCUS_ROUTES = ['/interview'];

function useFocusMode() {
  const { pathname } = useLocation();
  return FOCUS_ROUTES.includes(pathname);
}

function FooterOutsideFocus({ user }) {
  return useFocusMode() ? null : <Footer user={user} />;
}

// Pages that keep the public header whoever is looking at them. The
// landing page argues for signing up and the design system is a
// maintainer reference: neither belongs inside a workspace sidebar,
// and a signed-in visitor following a shared link to one should see
// the same page everybody else does.
const PUBLIC_CHROME_ROUTES = ['/', '/login', '/register', '/design-system'];

/**
 * The frame around the routes.
 *
 * <p>A signed-in account gets the workspace shell - sidebar, page bar
 * and page search - and a visitor keeps the public header, because the
 * two have different jobs: one returns to a handful of pages over and
 * over, the other is reading an argument for signing up.
 *
 * <p>The routes themselves are the same element in both branches, so
 * nothing about this choice reaches the pages. Signing in or out does
 * remount them, which it already did when the user state changed.
 */
function Chrome({ user, onLogout, children }) {
  const { pathname } = useLocation();
  const publicChrome = PUBLIC_CHROME_ROUTES.includes(pathname);

  if (user && !publicChrome) {
    return (
      <AppShell user={user} onLogout={onLogout}>
        <main
          id="main-content"
          className={`app-content shell-content ${
            BLEED_ROUTES.includes(pathname) ? 'shell-content--bleed' : ''
          }`}
          role="main"
        >
          {children}
        </main>
        <FooterOutsideFocus user={user} />
      </AppShell>
    );
  }

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <main id="main-content" className="app-content" role="main">
        {children}
      </main>
      <FooterOutsideFocus user={user} />
    </>
  );
}

// Sends each account to the page it may use. These redirects only
// keep people from landing on a screen that will be refused: the
// server checks the role and approval on every request regardless.
function ProtectedRoute({ user, children, only }) {
  const location = useLocation();

  // Remember where they were going, so an invite link opened while
  // signed out lands back on the invite after signing in.
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  // Candidate pages are guarded too. Without it an administrator or a
  // recruiter who reached one - by typing the address, or by signing in
  // from a page a candidate's expired session had been on - saw the
  // candidate workspace with someone else's navigation around it.
  const allowed =
    only === 'candidate' ? user.role === 'candidate'
    : only === 'recruiter' ? isApprovedRecruiter(user)
    : only === 'admin' ? user.role === 'admin'
    : only === 'pending' ? user.role === 'recruiter' && !isApprovedRecruiter(user)
    : true;

  return allowed ? children : <Navigate to={homePathFor(user)} replace />;
}

export default function App() {
  return <ToastProvider><AppContent /></ToastProvider>;
}

function AppContent() {
  const notify = useToast();
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    if (!localStorage.getItem('token') || !storedUser) return null;
    try {
      // Passed through toStoredUser so an account saved before approval
      // existed still gets a status - a recruiter without one waits.
      return toStoredUser(JSON.parse(storedUser));
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    setUser(null);
    notify('You’ve signed out successfully.', 'success');
  };

  return (
    <BrowserRouter>
      <div className="app-shell">
        {/* Skip to content link for keyboard/screen reader users (WCAG 2.1) */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>

        <Chrome user={user} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Landing user={user} />} />
            <Route path="/login" element={<Login onLogin={setUser} />} />
            <Route path="/forgot-password" element={<PasswordRecovery key="forgot" />} />
            <Route path="/reset-password" element={<PasswordRecovery key="reset" reset onReset={() => setUser(null)} />} />
            <Route path="/register" element={<Register onLogin={setUser} />} />
            {/* Two candidate entry points. /home is the branded front
                door; /dashboard is the workspace that carries the live
                CV, scores and recent results. */}
            <Route path="/home" element={<ProtectedRoute user={user} only="candidate"><CandidateHome /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute user={user} only="candidate"><Home user={user} /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute user={user} only="candidate"><CVUpload /></ProtectedRoute>} />
            <Route path="/interview" element={<ProtectedRoute user={user} only="candidate"><InterviewRoom /></ProtectedRoute>} />
            <Route path="/scorecard" element={<ProtectedRoute user={user} only="candidate"><Scorecard /></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute user={user} only="candidate"><Progress /></ProtectedRoute>} />
            <Route path="/skill-gap" element={<ProtectedRoute user={user} only="candidate"><SkillGap /></ProtectedRoute>} />
            {/* The recruiter review screen. Was /dashboard, which now
                belongs to the candidate workspace; a recruiter opening
                an old /dashboard link fails that route's candidate
                guard and is redirected here by homePathFor. */}
            <Route path="/recruiter" element={<ProtectedRoute user={user} only="recruiter"><RecruiterDashboard /></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute user={user} only="recruiter"><RecruiterJobs /></ProtectedRoute>} />
            <Route path="/join" element={<ProtectedRoute user={user}><JoinInterview user={user} /></ProtectedRoute>} />
            <Route path="/join/:code" element={<ProtectedRoute user={user}><JoinInterview user={user} /></ProtectedRoute>} />
            <Route path="/pending" element={<ProtectedRoute user={user} only="pending"><PendingApproval user={user} onUserChange={setUser} /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute user={user} only="admin"><AdminPanel /></ProtectedRoute>} />
            <Route path="/design-system" element={<DesignSystem />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Chrome>
      </div>
    </BrowserRouter>
  );
}
