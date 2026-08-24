import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import CVUpload from './pages/CVUpload';
import InterviewRoom from './pages/InterviewRoom';
import Scorecard from './pages/Scorecard';
import SkillGap from './pages/SkillGap';
import RecruiterDashboard from './pages/RecruiterDashboard';

function ProtectedRoute({ user, children, recruiterOnly }) {
  if (!user) return <Navigate to="/login" replace />;
  if (recruiterOnly && user.role !== 'recruiter') return <Navigate to="/upload" replace />;
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
        <Navbar user={user} onLogout={handleLogout} />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Landing user={user} />} />
            <Route path="/login" element={<Login onLogin={setUser} />} />
            <Route path="/register" element={<Register onLogin={setUser} />} />
            <Route path="/upload" element={<ProtectedRoute user={user}><CVUpload /></ProtectedRoute>} />
            <Route path="/interview" element={<ProtectedRoute user={user}><InterviewRoom /></ProtectedRoute>} />
            <Route path="/scorecard" element={<ProtectedRoute user={user}><Scorecard /></ProtectedRoute>} />
            <Route path="/skill-gap" element={<ProtectedRoute user={user}><SkillGap /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute user={user} recruiterOnly><RecruiterDashboard /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
