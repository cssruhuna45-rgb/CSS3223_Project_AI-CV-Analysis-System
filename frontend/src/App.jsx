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
import DesignSystem from './pages/DesignSystem';

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

function ProtectedRoute({ user, children, recruiterOnly }) {
  if (!user) return <Navigate to="/login" replace />;
  if (recruiterOnly && user.role !== 'recruiter') return <Navigate to="/home" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    if (!localStorage.getItem('token') || !storedUser) return null;
    try {
      return JSON.parse(storedUser);
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
            <Route path="/home" element={<ProtectedRoute user={user}><Home user={user} /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute user={user}><CVUpload /></ProtectedRoute>} />
            <Route path="/interview" element={<ProtectedRoute user={user}><InterviewRoom /></ProtectedRoute>} />
            <Route path="/scorecard" element={<ProtectedRoute user={user}><Scorecard /></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute user={user}><Progress /></ProtectedRoute>} />
            <Route path="/skill-gap" element={<ProtectedRoute user={user}><SkillGap /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute user={user} recruiterOnly><RecruiterDashboard /></ProtectedRoute>} />
            <Route path="/design-system" element={<DesignSystem />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <FooterOutsideFocus user={user} />
      </div>
    </BrowserRouter>
  );
}
