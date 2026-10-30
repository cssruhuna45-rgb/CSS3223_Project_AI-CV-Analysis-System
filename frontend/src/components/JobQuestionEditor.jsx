import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowUp, CheckCircle2, Lock, Plus, RefreshCw, Save, Sparkles, Trash2,
} from 'lucide-react';
import { useToast } from './ToastProvider';
import { Badge, Button } from './ui';
import { jobQuestionsAPI } from '../services/jobQuestionsApi';

const MAX_QUESTIONS = 10;
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const DIFFICULTY_TONE = { easy: 'success', medium: 'info', hard: 'warning' };

// Key points are edited as one line each.
const toDraft = (q) => ({
  id: q.id,
  question: q.question || '',
  difficulty: q.difficulty || 'medium',
  topic: q.topic || '',
  keyPointsText: (q.keyPoints || []).join('\n'),
  source: q.source,
});

const toRequest = (d) => ({
  id: d.id || null,
  question: d.question,
  difficulty: d.difficulty,
  topic: d.topic,
  keyPoints: d.keyPointsText.split('\n').map((p) => p.trim()).filter(Boolean),
});

const sameDraft = (a, b) => JSON.stringify(a.map(toRequest)) === JSON.stringify(b.map(toRequest));

// A job's interview questions: generate them from the job's required
// skills, edit, reorder and approve. Approval locks the set - every
// candidate is then asked exactly these, in this order, and graded
// against these key points. Key points are only ever shown here, to
// the recruiter; candidates never see them.
export default function JobQuestionEditor({ jobId, onChange }) {
  const notify = useToast();

  const [assessment, setAssessment] = useState(null);
  const [draft, setDraft] = useState([]);
  const [skillsText, setSkillsText] = useState('');
  const [count, setCount] = useState(5);

  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const apply = (data) => {
    setAssessment(data);
    setDraft((data.questions || []).map(toDraft));
    setSkillsText((data.requiredSkills || []).join(', '));
    setCount(data.questionCount || 5);
    if (onChange) onChange(data);
  };

  useEffect(() => {
    jobQuestionsAPI.get(jobId)
      .then(apply)
      .catch((err) => setLoadError(err.message || 'Could not load the questions.'));
  }, [jobId]);

  const serverDraft = useMemo(
    () => (assessment?.questions || []).map(toDraft),
    [assessment],
  );
  const dirty = assessment && !sameDraft(draft, serverDraft);

  const settingsChanged = assessment && (
    count !== assessment.questionCount
    || skillsText.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).join(',')
      !== (assessment.requiredSkills || []).join(',')
  );

  // Runs one server action, showing its error inline.
  const run = async (name, action, success) => {
    setBusy(name);
    setError('');
    try {
      apply(await action());
      if (success) notify(success);
    } catch (err) {
      setError(err.message || 'That did not work. Please try again.');
    } finally {
      setBusy('');
    }
  };

  const update = (index, key) => (e) => {
    const value = e.target.value;
    setDraft((list) => list.map((q, i) => (i === index ? { ...q, [key]: value } : q)));
  };

  const move = (index, by) => setDraft((list) => {
    const next = [...list];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    return next;
  });

  const remove = (index) => setDraft((list) => list.filter((_, i) => i !== index));

  const add = () => setDraft((list) => [
    ...list,
    { id: null, question: '', difficulty: 'medium', topic: '', keyPointsText: '', source: 'RECRUITER' },
  ]);

  const saveSettings = () => run('settings', () => jobQuestionsAPI.updateSettings(jobId, {
    requiredSkills: skillsText.split(',').map((s) => s.trim()).filter(Boolean),
    questionCount: Number(count),
  }), 'Question settings saved.');

  const generate = () => {
    if (draft.length > 0 && !window.confirm('Replace the current draft questions with newly generated ones?')) {
      return;
    }
    run('generate', () => jobQuestionsAPI.generate(jobId), 'Questions generated. Review them before approving.');
  };

  const save = () => run('save', () => jobQuestionsAPI.save(jobId, draft.map(toRequest)), 'Draft saved.');

  const approve = () => {
    if (!window.confirm('Approve these questions? They cannot be changed afterwards; a different set needs a new job.')) {
      return;
    }
    run('approve', () => jobQuestionsAPI.approve(jobId), 'Questions approved. Candidates can now take this interview.');
  };

  if (loadError) {
    return <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--fs-sm)' }}>{loadError}</p>;
  }

  if (!assessment) {
    return <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)' }}>Loading questions{'…'}</p>;
  }

  // ---- Approved: read only ----------------------------------------

  if (assessment.approved) {
    return (
      <section aria-label="Approved interview questions" style={{ display: 'grid', gap: 'var(--space-3)' }}>
        <p style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
          <Lock size={16} aria-hidden="true" />
          Approved{assessment.approvedBy ? ` by ${assessment.approvedBy}` : ''}
          {assessment.approvedAt ? ` on ${new Date(assessment.approvedAt).toLocaleDateString()}` : ''}.
          Every candidate is asked these {assessment.questions.length} questions in this order.
        </p>
        <ol style={{ display: 'grid', gap: 'var(--space-3)', paddingLeft: 'var(--space-5)' }}>
          {assessment.questions.map((q) => (
            <li key={q.id}>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap', marginBottom: 'var(--space-1)' }}>
                <Badge tone={DIFFICULTY_TONE[q.difficulty]}>{q.difficulty}</Badge>
                {q.topic && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{q.topic}</span>}
              </div>
              <p style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>{q.question}</p>
              <ul style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', paddingLeft: 'var(--space-4)' }}>
                {q.keyPoints.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  // ---- Draft: editable ----------------------------------------------

  return (
    <section aria-label="Interview questions" style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)', alignItems: 'end' }}>
        <div>
          <label className="label" htmlFor={`skills-${jobId}`}>Required skills (comma separated)</label>
          <input id={`skills-${jobId}`} className="input" value={skillsText}
            placeholder="e.g. Spring Boot, PostgreSQL, REST APIs"
            onChange={(e) => setSkillsText(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor={`count-${jobId}`}>Questions per candidate</label>
          <select id={`count-${jobId}`} className="input" value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <Button variant="secondary" size="sm" disabled={!settingsChanged} loading={busy === 'settings'} onClick={saveSettings}>
            Save settings
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
        <Button size="sm" icon={<Sparkles size={14} />} loading={busy === 'generate'}
          disabled={Boolean(busy) || settingsChanged || !(assessment.requiredSkills || []).length}
          onClick={generate}>
          {draft.length ? 'Regenerate all' : 'Generate questions'}
        </Button>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
          Written from the job's required skills and description, never from a candidate's CV.
          {busy === 'generate' && ' This can take up to a minute.'}
        </span>
      </div>

      {draft.length > 0 && (
        <ol style={{ display: 'grid', gap: 'var(--space-3)', listStyle: 'none', padding: 0 }}>
          {draft.map((q, i) => (
            <li key={q.id || `new-${i}`} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 'var(--fs-sm)' }}>
                  Question {i + 1}{' '}
                  <Badge tone="neutral">{q.source === 'AI' ? 'AI draft' : 'Recruiter'}</Badge>
                </strong>
                <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                  <Button size="sm" variant="ghost" icon={<ArrowUp size={14} />} aria-label={`Move question ${i + 1} up`}
                    disabled={i === 0 || Boolean(busy)} onClick={() => move(i, -1)} />
                  <Button size="sm" variant="ghost" icon={<ArrowDown size={14} />} aria-label={`Move question ${i + 1} down`}
                    disabled={i === draft.length - 1 || Boolean(busy)} onClick={() => move(i, 1)} />
                  <Button size="sm" variant="ghost" icon={<RefreshCw size={14} />}
                    aria-label={`Regenerate question ${i + 1}`}
                    title={dirty ? 'Save your changes first' : 'Replace this question with a new one'}
                    disabled={!q.id || dirty || Boolean(busy)} loading={busy === `regen-${q.id}`}
                    onClick={() => run(`regen-${q.id}`, () => jobQuestionsAPI.regenerate(jobId, q.id), `Question ${i + 1} replaced.`)} />
                  <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} aria-label={`Remove question ${i + 1}`}
                    disabled={Boolean(busy)} onClick={() => remove(i)} />
                </div>
              </div>

              <label className="label" htmlFor={`q-${jobId}-${i}`}>Question</label>
              <textarea id={`q-${jobId}-${i}`} className="input" rows={2} maxLength={600}
                value={q.question} onChange={update(i, 'question')} style={{ resize: 'vertical' }} />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                <div>
                  <label className="label" htmlFor={`d-${jobId}-${i}`}>Difficulty</label>
                  <select id={`d-${jobId}-${i}`} className="input" value={q.difficulty} onChange={update(i, 'difficulty')}>
                    {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor={`t-${jobId}-${i}`}>Topic</label>
                  <input id={`t-${jobId}-${i}`} className="input" maxLength={120} value={q.topic} onChange={update(i, 'topic')} />
                </div>
              </div>

              <label className="label" htmlFor={`k-${jobId}-${i}`} style={{ marginTop: 'var(--space-2)' }}>
                Key points (one per line, 2-6) - what a complete answer covers
              </label>
              <textarea id={`k-${jobId}-${i}`} className="input" rows={3}
                value={q.keyPointsText} onChange={update(i, 'keyPointsText')} style={{ resize: 'vertical' }} />
            </li>
          ))}
        </ol>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <Button size="sm" variant="secondary" icon={<Plus size={14} />}
          disabled={draft.length >= MAX_QUESTIONS || Boolean(busy)} onClick={add}>
          Add question
        </Button>
        <Button size="sm" variant="secondary" icon={<Save size={14} />}
          disabled={!dirty || Boolean(busy)} loading={busy === 'save'} onClick={save}>
          Save draft
        </Button>
      </div>

      {(dirty || assessment.issues.length > 0) && (
        <div role="status" style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
          {dirty ? (
            <p>You have unsaved changes. Save the draft to check it for approval.</p>
          ) : (
            <>
              <p style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>Before these can be approved:</p>
              <ul style={{ paddingLeft: 'var(--space-4)' }}>
                {assessment.issues.map((issue) => <li key={issue}>{issue}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--fs-sm)' }}>{error}</p>}

      <div>
        <Button icon={<CheckCircle2 size={16} />} loading={busy === 'approve'}
          disabled={dirty || settingsChanged || assessment.issues.length > 0 || Boolean(busy)}
          onClick={approve}>
          Approve questions
        </Button>
      </div>
    </section>
  );
}
