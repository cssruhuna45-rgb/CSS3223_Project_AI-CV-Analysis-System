import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown, ArrowRight, AudioLines, BarChart3, BookOpen, Check,
  CheckCircle2, Compass, FileText, Layers3, Mic, Sparkles, Users,
} from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import useScrollReveal from '../hooks/useScrollReveal';
import { homePathFor } from '../constants/accounts';

const FEATURES = [
  { icon: FileText, label: 'Start with your experience', title: 'A clearer picture of your CV.', text: 'Bring your skills, projects, and experience together. Explore relevant career tracks and see where you can grow.' },
  { icon: AudioLines, label: 'Practise with purpose', title: 'Find your interview voice.', text: 'Work through technical questions with text or supported voice tools. Choose a learning-focused practice or a timed exam.' },
  { icon: Compass, label: 'Find your focus', title: 'Know what to work on.', text: 'Compare your skills with a target career track and make sense of the gaps.' },
  { icon: BarChart3, label: 'Understand the feedback', title: 'Go beyond a score.', text: 'Explore four competency dimensions with answer feedback and supporting explanations.' },
  { icon: BookOpen, label: 'Keep moving forward', title: 'Turn feedback into a plan.', text: 'Build a 14-day learning roadmap around the areas that need your attention.' },
  { icon: Users, label: 'For hiring teams', title: 'Bring evidence into view.', text: 'Review submitted CVs and job-linked interviews. Compare evidence and make your own hiring decisions.' },
];
const STEPS = [
  { icon: FileText, title: 'Bring your CV', text: 'Upload a PDF and review your experience.' },
  { icon: Compass, title: 'Choose your direction', text: 'Explore a career track and your skill gaps.' },
  { icon: Mic, title: 'Put it into practice', text: 'Work through a relevant technical interview.' },
  { icon: BarChart3, title: 'Take your next step', text: 'Use your feedback to focus your learning.' },
];

function ProductPreview() {
  return (
    <figure className="product-preview" aria-label="Illustrative product preview, not your personal results">
      <div className="preview-topbar">
        <span className="preview-brand"><BrandLogo alt="" className="preview-brand-mark" shine={false} /> Your workspace</span>
        <span className="preview-label">Illustrative preview</span>
      </div>
      <div className="preview-content">
        <div className="preview-cv">
          <span className="preview-file-icon"><FileText size={23} aria-hidden="true" /></span>
          <div><strong>Your CV, understood</strong><span>Skills, experience, and possibilities</span></div>
          <CheckCircle2 size={20} className="preview-complete" aria-label="Analysis complete in this example" />
        </div>
        <div className="preview-skill-tags" aria-label="Example extracted skills"><span>React</span><span>Java</span><span>SQL</span><span>Problem solving</span></div>
        <div className="preview-feedback">
          <div className="preview-feedback-heading">
            <div><span className="landing-eyebrow">INTERVIEW FEEDBACK</span><h3>See the whole picture.</h3></div>
            <span className="preview-score">82<span>/100</span></span>
          </div>
          <div className="preview-bars">
            {[['Technical knowledge', 82], ['Implementation depth', 76], ['Problem solving', 88], ['Communication clarity', 80]].map(([label, value]) => (
              <div className="preview-bar-row" key={label}><span>{label}</span><div className="preview-bar-track" aria-hidden="true"><span style={{ width: value + '%' }} /></div><strong>{value}</strong></div>
            ))}
          </div>
        </div>
        <div className="preview-roadmap">
          <span className="preview-roadmap-icon"><BookOpen size={20} aria-hidden="true" /></span>
          <div><strong>A plan for what comes next</strong><span>Your personalised 14-day learning roadmap</span></div>
          <ArrowRight size={18} aria-hidden="true" />
        </div>
      </div>
      <figcaption>Example content. Your feedback is based on your own CV and answers.</figcaption>
    </figure>
  );
}

export default function Landing({ user }) {
  const pageRef = useRef(null);
  useScrollReveal(pageRef);
  const startPath = !user ? '/register' : user.role === 'candidate' ? '/upload' : homePathFor(user);
  const startLabel = !user ? 'Start your next chapter' : user.role === 'candidate' ? 'Analyse my CV' : 'Open my workspace';

  return (
    <div className="landing-page" ref={pageRef}>
      <div className="landing-reading-progress" aria-hidden="true" />
      <section className="landing-hero landing-container" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <div className="landing-kicker"><Sparkles size={15} aria-hidden="true" /><span>A clearer path to your next role</span></div>
          <h1 id="landing-title">Understand your CV.<br /><span>Strengthen your next interview.</span></h1>
          <p className="landing-hero-description">Explore your skills, practise technical interviews, and turn feedback into a focused learning plan.</p>
          <div className="landing-hero-actions">
            <Link className="btn btn-primary btn-lg" to={startPath}>{startLabel}<ArrowRight size={18} aria-hidden="true" /></Link>
            <a className="landing-text-link" href="#how-it-works">See how it works<ArrowDown size={16} aria-hidden="true" /></a>
          </div>
          <div className="landing-hero-notes"><span><Check size={15} aria-hidden="true" />CV-led preparation</span><span><Check size={15} aria-hidden="true" />Feedback you can explore</span></div>
        </div>
        <div className="landing-hero-visual"><ProductPreview /></div>
      </section>

      <section id="how-it-works" className="landing-workflow landing-container" aria-labelledby="workflow-title">
        <div className="landing-section-heading subreveal">
          <div><p className="landing-eyebrow">FROM EXPERIENCE TO OPPORTUNITY</p><h2 id="workflow-title">One connected journey.<br />A clear next step.</h2></div>
          <p>Start where you are. Build on what you know. Make every practice count.</p>
        </div>
        <ol className="landing-steps">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <li className="landing-step subreveal" key={title} style={{ '--reveal-order': index }}><div className="landing-step-head"><span className="landing-step-number">0{index + 1}</span><Icon size={21} aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p></li>
          ))}
        </ol>
      </section>

      <section id="features" className="landing-feature-section" aria-labelledby="features-title">
        <div className="landing-container">
          <div className="landing-section-heading subreveal">
            <div><p className="landing-eyebrow">THOUGHTFUL TOOLS. USEFUL INSIGHTS.</p><h2 id="features-title">Preparation with perspective.</h2></div>
            <p>Your experience is the starting point. Your feedback helps you decide where to go next.</p>
          </div>
          <div className="landing-features">
            {FEATURES.map(({ icon: Icon, label, title, text }, index) => (
              <article className={'landing-feature subreveal ' + (index < 2 ? 'landing-feature--lead' : '')} key={title} style={{ '--reveal-order': Math.min(index, 3) }}>
                <div className="landing-feature-top"><span className="landing-feature-icon"><Icon size={23} aria-hidden="true" /></span><span className="landing-feature-number">0{index + 1}</span></div>
                <p className="landing-feature-label">{label}</p><h3>{title}</h3><p>{text}</p>
                {index === 0 && <div className="landing-feature-detail" aria-hidden="true"><span>Experience</span><span>Skills</span><span>Career tracks</span></div>}
                {index === 1 && <div className="landing-feature-detail" aria-hidden="true"><span><Mic size={14} />Voice or text</span><span>Practice or exam</span></div>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="for-you" className="landing-audience landing-container" aria-labelledby="audience-title">
        <div className="landing-section-heading subreveal"><div><p className="landing-eyebrow">TWO PERSPECTIVES. SHARED CLARITY.</p><h2 id="audience-title">Built around your next decision.</h2></div></div>
        <div className="landing-audience-grid">
          <article className="landing-audience-card subreveal">
            <span className="landing-audience-label"><Compass size={17} aria-hidden="true" />FOR CANDIDATES</span>
            <h3>Make your next move<br />with more confidence.</h3>
            <p>Understand your strengths, find areas to develop, and practise at your own pace. Your personal practice stays private.</p>
            <Link to={startPath} className="landing-text-link">{user ? 'Continue in your workspace' : 'Explore your potential'}<ArrowRight size={17} aria-hidden="true" /></Link>
          </article>
          <article className="landing-audience-card subreveal">
            <span className="landing-audience-label"><Users size={17} aria-hidden="true" />FOR HIRING TEAMS</span>
            <h3>Better context.<br />More informed decisions.</h3>
            <p>Review submitted CVs and job-linked assessments side by side. Keep CV matching and interview performance in perspective, with the decision in your hands.</p>
            <Link to={user ? homePathFor(user) : '/login'} className="landing-text-link">{user ? 'Open your workspace' : 'Sign in to your workspace'}<ArrowRight size={17} aria-hidden="true" /></Link>
          </article>
        </div>
      </section>

      <section className="landing-closing landing-container" aria-labelledby="closing-title">
        <div className="landing-closing-inner subreveal">
          <div><span className="landing-closing-icon"><Layers3 size={25} aria-hidden="true" /></span><p className="landing-eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h2 id="closing-title">Bring your experience.<br />Find your way forward.</h2><p>Start with your CV. Leave with a clearer next step.</p></div>
          <Link className="btn btn-primary btn-lg" to={startPath}>{user ? 'Continue to my workspace' : 'Get started'}<ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  );
}
