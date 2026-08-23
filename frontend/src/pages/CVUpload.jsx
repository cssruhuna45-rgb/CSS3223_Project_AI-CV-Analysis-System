import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle, Briefcase, ChevronRight, X, Sparkles, AlertCircle, Brain, Zap, Mic } from 'lucide-react';
import { resumeAPI, aiResumeAPI } from '../services/api';

const JOB_ROLES = [
  'Full Stack Developer', 'Frontend Developer', 'Backend Developer',
  'Data Scientist', 'Machine Learning Engineer', 'DevOps Engineer',
  'Cloud Architect', 'Product Manager', 'UI/UX Designer', 'Cybersecurity Analyst',
];

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

export default function CVUpload() {
  const navigate = useNavigate();
  const fileRef = useRef();
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const handleFile = (f) => {
    if (f && f.type === 'application/pdf') { setFile(f); setError(''); }
    else setError('Only PDF files are supported.');
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleAnalyze = async () => {
    if (!file || !role) return;
    setLoading(true);
    setError('');
    try {
      const resumeData = await resumeAPI.upload(file);
      const jobDescription = `I am interviewing for a ${role} position. Please ask me relevant technical and behavioral interview questions suited for this role.`;
      const resumeText = resumeData.extractedText || '';
      const aiResult = await aiResumeAPI.analyze(resumeData.id, resumeText || `Candidate applying for ${role} role.`);

      sessionStorage.setItem('resumeId', resumeData.id);
      sessionStorage.setItem('resumeText', resumeText);
      sessionStorage.setItem('jobRole', role);
      sessionStorage.setItem('jobDescription', jobDescription);
      sessionStorage.setItem('aiAnalysis', JSON.stringify(aiResult));

      setAnalysis(aiResult);
    } catch (err) {
      setError(err.message || 'Failed to analyze CV. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>

      <StepBar current={1} />

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Upload Your CV</h1>
        <p style={{ color: '#F5EFE7', fontSize: 15 }}>Our AI will analyze your resume and tailor interview questions to your profile.</p>
      </div>

      {/* Upload Zone */}
      <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden', background: '#000000' }}>
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => !file && fileRef.current.click()}
          style={{
            padding: 48, textAlign: 'center', cursor: file ? 'default' : 'pointer',
            border: `2px dashed ${drag || file ? '#D8C4B6' : '#3E5879'}`,
            borderRadius: 16,
            background: drag || file ? 'rgba(216,196,182,0.05)' : 'transparent',
            transition: 'all 0.2s',
          }}>
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])} />
          {file ? (
            <div>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(216,196,182,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <FileText size={28} color="#D8C4B6" />
              </div>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>{file.name}</p>
              <p style={{ color: '#F5EFE7', fontSize: 13, marginBottom: 16 }}>{(file.size / 1024).toFixed(1)} KB · PDF</p>
              <button className="btn btn-danger" style={{ fontSize: 12 }}
                onClick={e => { e.stopPropagation(); setFile(null); setAnalysis(null); }}>
                <X size={14} /> Remove
              </button>
            </div>
          ) : (
            <div>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(216,196,182,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Upload size={28} color="#D8C4B6" />
              </div>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Drop your CV here</p>
              <p style={{ color: '#F5EFE7', fontSize: 13 }}>or <span style={{ color: '#D8C4B6' }}>browse files</span> · PDF only</p>
            </div>
          )}
        </div>
      </div>

      {/* Job Role */}
      <div className="card" style={{ marginBottom: 24, background: '#000000' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Briefcase size={16} color="#D8C4B6" />
          <span style={{ fontWeight: 600, fontSize: 15 }}>Target Job Role</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {JOB_ROLES.map(r => (
            <button key={r} onClick={() => setRole(r)}
              style={{
                padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, transition: 'all 0.2s',
                background: role === r ? '#D8C4B6' : '#213555',
                color: role === r ? '#213555' : '#F5EFE7',
              }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(245,239,231,0.08)', border: '1px solid rgba(245,239,231,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <AlertCircle size={15} color="#F5EFE7" />
          <p style={{ fontSize: 13, color: '#F5EFE7' }}>{error}</p>
        </div>
      )}

      {/* AI Analysis Result */}
      {analysis && (
        <div style={{ background: 'rgba(216,196,182,0.08)', border: '1px solid rgba(216,196,182,0.25)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <CheckCircle size={18} color="#D8C4B6" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>CV Analyzed — Score: {analysis.score}/100</span>
          </div>
          <p style={{ fontSize: 13, color: '#F5EFE7', lineHeight: 1.6, marginBottom: 10 }}>{analysis.summary}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {analysis.skills?.slice(0, 8).map(s => (
              <span key={s} className="badge badge-blue" style={{ fontSize: 11 }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      {!analysis ? (
        <button className="btn btn-primary"
          disabled={!file || !role || loading}
          onClick={handleAnalyze}
          style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, opacity: (!file || !role) ? 0.5 : 1 }}>
          {loading
            ? <> Analyzing CV with AI...</>
            : <> Analyze with AI</>}
        </button>
      ) : (
        <button className="btn btn-primary" onClick={() => navigate('/skill-gap')}
          style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}>
          Continue to Skill Gap <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
