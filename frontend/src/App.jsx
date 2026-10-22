import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './index.css';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Login from './pages/Login';
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
  };

  return (
    <BrowserRouter>
      <div className="app-shell">
        {/* Skip to content link for keyboard/screen reader users (WCAG 2.1) */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>

        <Navbar user={user} onLogout={handleLogout} />
        <main id="main-content" className="app-content" role="main">
          <Routes>
            <Route path="/" element={<Landing user={user} />} />
            <Route path="/login" element={<Login onLogin={setUser} />} />
            <Route path="/register" element={<Register onLogin={setUser} />} />
            <Route path="/home" element={<ProtectedRoute user={user} only="candidate"><Home user={user} /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute user={user} only="candidate"><CVUpload /></ProtectedRoute>} />
            <Route path="/interview" element={<ProtectedRoute user={user} only="candidate"><InterviewRoom /></ProtectedRoute>} />
            <Route path="/scorecard" element={<ProtectedRoute user={user} only="candidate"><Scorecard /></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute user={user} only="candidate"><Progress /></ProtectedRoute>} />
            <Route path="/skill-gap" element={<ProtectedRoute user={user} only="candidate"><SkillGap /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute user={user} only="recruiter"><RecruiterDashboard /></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute user={user} only="recruiter"><RecruiterJobs /></ProtectedRoute>} />
            <Route path="/join" element={<ProtectedRoute user={user}><JoinInterview user={user} /></ProtectedRoute>} />
            <Route path="/join/:code" element={<ProtectedRoute user={user}><JoinInterview user={user} /></ProtectedRoute>} />
            <Route path="/pending" element={<ProtectedRoute user={user} only="pending"><PendingApproval user={user} onUserChange={setUser} /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute user={user} only="admin"><AdminPanel /></ProtectedRoute>} />
            <Route path="/design-system" element={<DesignSystem />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <FooterOutsideFocus user={user} />
      </div>
    </BrowserRouter>
  );
}
