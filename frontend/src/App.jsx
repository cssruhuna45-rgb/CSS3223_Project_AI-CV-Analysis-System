import React, { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('interview');

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#090d16', color: '#fff', minHeight: '100vh', padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h2>🤖 AI Interview Platform (React)</h2>
        <div>
          <button onClick={() => setActiveTab('interview')} style={{ padding: '0.5rem 1rem', marginRight: '0.5rem' }}>Interview Room</button>
          <button onClick={() => setActiveTab('recruiter')} style={{ padding: '0.5rem 1rem' }}>Recruiter Dashboard</button>
        </div>
      </header>

      {activeTab === 'interview' ? (
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '12px' }}>
          <h3>Candidate Interview Session</h3>
          <p style="color: #94a3b8">Spring Boot & Python FastAPI RAG AI Backend Connected</p>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '12px' }}>
          <h3>Recruiter Scorecard & Analytics</h3>
        </div>
      )}
    </div>
  );
}
