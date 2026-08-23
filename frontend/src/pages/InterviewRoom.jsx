import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Send, Clock, ChevronRight, Brain, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { interviewAPI } from '../services/api';

const MAX_QUESTIONS = 5;
const TOTAL_TIME = 120;

function StepBar({ current }) {
  const steps = [
    { n: 1, label: 'Upload & Analyze CV', icon: <Brain size={15} /> },
    { n: 2, label: 'Skill Gap Analysis',  icon: <Zap size={15} /> },
    { n: 3, label: 'Interview',           icon: <Mic size={15} /> },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: s.n <= current ? '#D8C4B6' : '#3E5879',
              color: '#213555',
              fontSize: 13, fontWeight: 700, flexShrink: 0,
            }}>
              {s.n < current ? <CheckCircle size={15} /> : s.icon}
            </div>
            <span style={{
              fontSize: 13, whiteSpace: 'nowrap',
              fontWeight: s.n === current ? 600 : 400,
              color: s.n <= current ? '#D8C4B6' : '#F5EFE7',
            }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, margin: '0 12px', background: s.n < current ? '#D8C4B6' : '#3E5879', borderRadius: 2 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function InterviewRoom() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState('');
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [listening, setListening] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [displayedQ, setDisplayedQ] = useState('');
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  // Read context from CVUpload step
  const jobRole = sessionStorage.getItem('jobRole') || 'Software Developer';
  const resumeText = sessionStorage.getItem('resumeText') || '';
  const jobDescription = sessionStorage.getItem('jobDescription') || `I am interviewing for a ${jobRole} position. Please ask me relevant technical and behavioral interview questions suited for this role.`;

  // Typewriter effect
  useEffect(() => {
    if (!question) return;
    setDisplayedQ('');
    setAiTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedQ(question.slice(0, i + 1));
      i++;
      if (i >= question.length) { clearInterval(interval); setAiTyping(false); }
    }, 22);
    return () => clearInterval(interval);
  }, [question]);

  // Countdown timer
  useEffect(() => {
    setTimeLeft(TOTAL_TIME);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [qIndex]);

  // Start interview session on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await interviewAPI.start(jobDescription, resumeText);
        // FastAPI returns { session_id, question: { question, ... } }
        setSessionId(data.session_id);
        setQuestion(data.question?.question || data.question);
      } catch (err) {
        setError('Could not connect to AI service. Make sure FastAPI is running on port 8000.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Speech recognition not supported in this browser.'); return; }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    } else {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
        setAnswer(transcript);
      };
      rec.onend = () => setListening(false);
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim() || !sessionId) return;
    setLoading(true);
    clearInterval(timerRef.current);
    try {
      if (qIndex + 1 >= MAX_QUESTIONS) {
        // Finish session
        await interviewAPI.finish(sessionId);
        sessionStorage.setItem('sessionId', sessionId);
        navigate('/scorecard');
        return;
      }
      // Submit answer → get next question
      const data = await interviewAPI.submitAnswer(sessionId, answer);
      setQuestion(data.question?.question || data.question);
      setQIndex(q => q + 1);
      setAnswer('');
      setSubmitted(false);
    } catch (err) {
      setError('Failed to submit answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setSubmitted(false);
    handleSubmit();
  };

  const timerPct = (timeLeft / TOTAL_TIME) * 100;
  const timerColor = timeLeft > 30 ? '#D8C4B6' : '#F5EFE7';
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');

  if (loading && qIndex === 0) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      
      <p style={{ color: '#F5EFE7', fontSize: 14 }}>AI is preparing your interview...</p>
      {error && <p style={{ color: '#F5EFE7', fontSize: 13 }}>{error}</p>}
    </div>
  );

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>

      <StepBar current={3} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D8C4B6', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 13, color: '#D8C4B6', fontWeight: 500 }}>Live Interview · {jobRole}</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Question {qIndex + 1} of {MAX_QUESTIONS}</h1>
        </div>

        {/* Timer */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', width: 72, height: 72 }}>
            <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="36" cy="36" r="30" fill="none" stroke="#3E5879" strokeWidth="4" />
              <circle cx="36" cy="36" r="30" fill="none" stroke={timerColor} strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 30}`}
                strokeDashoffset={`${2 * Math.PI * 30 * (1 - timerPct / 100)}`}
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={12} color={timerColor} />
              <span style={{ fontSize: 13, fontWeight: 700, color: timerColor }}>{mins}:{secs}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ height: 4, background: '#3E5879', borderRadius: 2, marginBottom: 32, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: 'linear-gradient(90deg, #D8C4B6, #D8C4B6)',
          width: `${((qIndex + 1) / MAX_QUESTIONS) * 100}%`,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* AI Question Card */}
      <div className="card" style={{ marginBottom: 24, position: 'relative', overflow: 'hidden', background: '#000000' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #D8C4B6, #D8C4B6)' }} />
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', paddingTop: 8 }}>
          
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#D8C4B6' }}>AI Interviewer</span>
              {aiTyping && (
                <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#D8C4B6', animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
                  ))}
                </div>
              )}
            </div>
            <p style={{ fontSize: 17, lineHeight: 1.7, fontWeight: 500 }}>{displayedQ}</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(245,239,231,0.08)', border: '1px solid rgba(245,239,231,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <AlertCircle size={15} color="#F5EFE7" />
          <p style={{ fontSize: 13, color: '#F5EFE7' }}>{error}</p>
        </div>
      )}

      {/* Answer Area */}
      {!submitted ? (
        <div className="card" style={{ marginBottom: 20, background: '#000000' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#F5EFE7' }}>Your Answer</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {listening && <span className="badge badge-red" style={{ fontSize: 11 }}>● Recording</span>}
              <span style={{ fontSize: 12, color: '#F5EFE7' }}>{answer.length} chars</span>
            </div>
          </div>
          <textarea className="input" rows={5}
            placeholder="Type your answer here, or use the microphone to speak..."
            value={answer} onChange={e => setAnswer(e.target.value)}
            style={{ resize: 'vertical', lineHeight: 1.6 }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="btn" onClick={toggleMic}
              style={{
                background: listening ? 'rgba(245,239,231,0.15)' : 'rgba(216,196,182,0.1)',
                color: listening ? '#F5EFE7' : '#D8C4B6',
                border: `1px solid ${listening ? 'rgba(245,239,231,0.3)' : 'rgba(216,196,182,0.2)'}`,
                flex: 1, justifyContent: 'center',
              }}>
              {listening ? <><MicOff size={16} /> Stop Recording</> : <><Mic size={16} /> Use Microphone</>}
            </button>
            <button className="btn btn-primary" onClick={() => setSubmitted(true)}
              disabled={!answer.trim() || loading}
              style={{ flex: 2, justifyContent: 'center', opacity: !answer.trim() ? 0.5 : 1 }}>
              <Send size={15} /> Submit Answer
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ background: 'rgba(216,196,182,0.08)', border: '1px solid rgba(216,196,182,0.25)', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
            <CheckCircle size={20} color="#D8C4B6" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Answer recorded!</p>
              <p style={{ color: '#F5EFE7', fontSize: 13, lineHeight: 1.6 }}>{answer}</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleNext} disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15 }}>
            {loading ? 'Loading next question...' : qIndex + 1 >= MAX_QUESTIONS ? 'View Scorecard 🎉' : <>Next Question <ChevronRight size={16} /></>}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 16, padding: '12px 16px', background: 'rgba(245,239,231,0.06)', borderRadius: 10, border: '1px solid rgba(245,239,231,0.15)' }}>
        <AlertCircle size={15} color="#F5EFE7" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: '#F5EFE7', lineHeight: 1.6 }}>
          Tip: Structure your answer using the <strong style={{ color: '#F5EFE7' }}>STAR method</strong> — Situation, Task, Action, Result.
        </p>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      `}</style>
    </div>
  );
}
