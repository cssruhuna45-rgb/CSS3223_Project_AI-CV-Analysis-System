import React, { useMemo, useState } from 'react';
import { Wand2, Copy, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { aiResumeAPI } from '../services/api';
import { Button, Card, SectionHeader } from './ui';

// Google's XYZ bullet: "Accomplished [X] as measured by [Y], by doing [Z]".
//
// The AI only restructures the bullet. Every fact it would need and the
// candidate has not given comes back as a [bracketed] gap with a
// question. The candidate's answers are put into the sentence here, word
// for word, with no AI call - so the finished bullet contains only what
// the candidate said and can defend in an interview.

function fillGaps(draft, gaps, answers) {
  return gaps.reduce((text, gap) => {
    const answer = (answers[gap.placeholder] || '').trim();
    return answer ? text.split(gap.placeholder).join(answer) : text;
  }, draft);
}

// The draft with each gap shown as a highlighted chip: the answer once
// given, otherwise the question in brackets.
function DraftPreview({ draft, gaps, answers }) {
  const parts = [];
  let rest = draft;
  let key = 0;

  while (rest) {
    const next = gaps
      .map((g) => ({ g, at: rest.indexOf(g.placeholder) }))
      .filter((x) => x.at >= 0)
      .sort((a, b) => a.at - b.at)[0];

    if (!next) {
      parts.push(rest);
      break;
    }

    parts.push(rest.slice(0, next.at));
    const answer = (answers[next.g.placeholder] || '').trim();
    parts.push(
      <span key={key++} className={`gap-chip ${answer ? 'gap-chip--filled' : ''}`}>
        {answer || next.g.placeholder}
      </span>
    );
    rest = rest.slice(next.at + next.g.placeholder.length);
  }

  return <p className="bullet-preview">{parts}</p>;
}

export default function BulletTuner({ suggestions = [], jobField = '' }) {
  const [bullet, setBullet] = useState('');
  const [result, setResult] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const finalText = useMemo(
    () => (result ? fillGaps(result.draft, result.gaps, answers) : ''),
    [result, answers]
  );

  const openGaps = result
    ? result.gaps.filter((g) => !(answers[g.placeholder] || '').trim()).length
    : 0;

  const rewrite = async (text) => {
    const value = (text ?? bullet).trim();
    if (!value) return;

    setBullet(value);
    setLoading(true);
    setError('');
    setResult(null);
    setAnswers({});
    setCopied(false);

    try {
      setResult(await aiResumeAPI.tuneBullet(value, jobField));
    } catch (err) {
      setError(err.message || 'Could not rewrite this bullet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async (e) => {
    try {
      await navigator.clipboard.writeText(finalText);
      setCopied(true);
    } catch {
      // Clipboard refused (older browser, permissions): select the text
      // so Ctrl+C still works.
      const area = e.currentTarget.closest('.bullet-tuner')?.querySelector('#bullet-final');
      area?.select();
    }
  };

  return (
    <Card as="section" className="bullet-tuner" aria-labelledby="bullet-tuner-title" style={{ marginTop: 'var(--space-5)' }}>
      <SectionHeader
        id="bullet-tuner-title"
        icon={<Wand2 size={18} />}
        title="Improve a bullet point"
        subtitle="Rewrite it as what you did, the result you can measure, and how you did it. You supply every fact; the AI never makes up numbers."
      />

      {suggestions.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <p className="label">Bullets from your CV worth improving</p>
          <ul className="bullet-suggestions">
            {suggestions.map((s) => (
              <li key={s}>
                <span>{s}</span>
                <Button size="sm" variant="secondary" onClick={() => rewrite(s)} disabled={loading}>
                  Improve
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <label className="label" htmlFor="bullet-input">Bullet point</label>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <textarea
          id="bullet-input"
          className="input"
          rows={2}
          maxLength={400}
          placeholder="e.g. Responsible for creating REST APIs in Spring Boot."
          value={bullet}
          onChange={(e) => setBullet(e.target.value)}
          style={{ flex: '1 1 320px', resize: 'vertical' }}
        />
        <Button onClick={() => rewrite()} loading={loading} disabled={!bullet.trim()} icon={<Wand2 size={16} />}>
          {loading ? 'Rewriting…' : 'Rewrite'}
        </Button>
      </div>

      {error && (
        <p role="alert" className="bullet-error">
          <AlertCircle size={16} aria-hidden="true" /> {error}
        </p>
      )}

      {result && (
        <div className="bullet-result" aria-live="polite">
          {result.why.length > 0 && (
            <div>
              <p className="label">Why the original is weak</p>
              <ul className="bullet-why">
                {result.why.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </div>
          )}

          <div>
            <p className="label">Rewritten, with the facts only you know left open</p>
            <DraftPreview draft={result.draft} gaps={result.gaps} answers={answers} />
            {result.invented_numbers_removed > 0 && (
              <p className="bullet-note">
                <ShieldCheck size={14} aria-hidden="true" />
                The AI added {result.invented_numbers_removed} figure
                {result.invented_numbers_removed === 1 ? '' : 's'} you did not give.
                {result.invented_numbers_removed === 1 ? ' It was' : ' They were'} turned
                into questions instead.
              </p>
            )}
          </div>

          {result.gaps.length > 0 && (
            <fieldset className="bullet-gaps">
              <legend className="label">Fill in the gaps with true facts</legend>
              {result.gaps.map((g, i) => (
                <div key={g.placeholder} className="bullet-gap">
                  <label htmlFor={`gap-${i}`}>{g.question}</label>
                  <input
                    id={`gap-${i}`}
                    className="input"
                    value={answers[g.placeholder] || ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [g.placeholder]: e.target.value }))}
                    aria-describedby={g.hint ? `gap-${i}-hint` : undefined}
                  />
                  {g.hint && <span id={`gap-${i}-hint`} className="bullet-hint">{g.hint}</span>}
                </div>
              ))}
              <p className="bullet-hint">
                No honest figure for a gap? Leave it empty and reword that part
                yourself after copying. A smaller true number beats a big guess.
              </p>
            </fieldset>
          )}

          <div>
            <label className="label" htmlFor="bullet-final">Your bullet</label>
            <textarea id="bullet-final" className="input" rows={3} readOnly value={finalText} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={copy} icon={copied ? <Check size={16} /> : <Copy size={16} />}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
              {openGaps > 0 && (
                <span className="bullet-hint" role="status">
                  {openGaps} gap{openGaps === 1 ? '' : 's'} still open
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
