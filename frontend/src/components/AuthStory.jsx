import React from 'react';
import { Check, Compass, FileText, Mic } from 'lucide-react';

/** Presentation alongside the existing forms; no account or auth state. */
export default function AuthStory({ recovery = false }) {
  return (
    <aside className="auth-story" aria-label="About Vynterva AI">
      <p className="landing-eyebrow">A CLEARER PATH FORWARD</p>
      <h2>{recovery ? <>Let’s get you<br />back on track.</> : <>Your experience.<br />Your possibilities.<br /><span>Your next chapter.</span></>}</h2>
      <p>{recovery ? 'Recover access to your workspace and continue where you left off.' : 'Understand your CV, practise with purpose, and turn feedback into your next step.'}</p>
      <div className="auth-story-journey">
        {[{ icon: FileText, title: 'Understand your experience', text: 'Start with your CV and your skills.' }, { icon: Mic, title: 'Build interview confidence', text: 'Practise relevant technical questions.' }, { icon: Compass, title: 'Find your learning direction', text: 'Make a plan from your feedback.' }].map(({ icon: Icon, title, text }) => <div key={title}><span className="auth-story-icon"><Icon size={20} aria-hidden="true" /></span><div><strong>{title}</strong><p>{text}</p></div></div>)}
      </div>
      <p className="auth-story-note"><Check size={16} aria-hidden="true" />Your personal practice stays private.</p>
    </aside>
  );
}
