import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowUp, CheckCircle2, Lock, Plus, RefreshCw, Save, Sparkles, Trash2,
} from 'lucide-react';
import { useToast } from './ToastProvider';
import { Badge, Button, ConfirmDialog } from './ui';
import { jobQuestionsAPI } from '../services/jobQuestionsApi';
import { userMessage } from '../services/http';
import { FormAlert } from './FormErrors';

// What each action says when it fails. `uncertain` is for when the
// server never answered, so the change may or may not have happened.
const ACTION_ERRORS = {
  settings: {
    fallback: "We couldn't save the question settings. Check the skills and question count, then try again.",
    uncertain: "We couldn't confirm the settings were saved. Save them again to be sure.",
  },
  generate: {
    fallback: "We couldn't generate questions for this job. Please try again.",
    uncertain: "We couldn't confirm whether new questions were generated. The questions below have been reloaded from the server.",
  },
  save: {
    fallback: "We couldn't save your draft. Your changes are still here; please try again.",
    uncertain: "We couldn't confirm your draft was saved. Your changes are still here; save again to be sure.",
  },
  approve: {
    fallback: "We couldn't approve these questions. Please try again.",
    uncertain: "We couldn't confirm the questions were approved. They have been reloaded from the server.",
  },
  regenerate: {
    fallback: "We couldn't write a new question. The current question is unchanged; please try again.",
    uncertain: "We couldn't confirm the question was replaced. Reload the page to check.",
  },
};

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
  // Which one-way action is waiting for confirmation: 'generate', 'approve' or null.
  const [confirming, setConfirming] = useState(null);

  const apply = (data) => {
    setAssessment(data);
    setDraft((data.questions || []).map(toDraft));
    setSkillsText((data.requiredSkills || []).join(', '));
    setCount(data.questionCount || 5);
    if (onChange) onChange(data);
  };

  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    setLoadError('');
    jobQuestionsAPI.get(jobId)
      .then(apply)
      .catch((err) => setLoadError(userMessage(err, "We couldn't load the interview questions for this job. Please try again.")));
  }, [jobId, loadAttempt]);

  // After a change whose outcome is unknown, show what the server holds
  // rather than guessing. Only for actions that replace the whole set,
  // so no unsaved edit is thrown away.
  const reread = () => jobQuestionsAPI.get(jobId).then(apply).catch(() => {});

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
      const messages = ACTION_ERRORS[name];
      setError(userMessage(err, messages.fallback, { uncertain: messages.uncertain }));
      if (err.uncertain && (name === 'generate' || name === 'approve')) reread();
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

  // The saved version of a draft question, to tell whether its
  // difficulty or topic was changed since.
  const savedById = useMemo(
    () => new Map(serverDraft.map((q) => [q.id, q])),
    [serverDraft],
  );

  const settingsEdited = (q) => {
    const saved = q.id ? savedById.get(q.id) : null;
    return Boolean(saved) && (
      saved.difficulty !== q.difficulty || saved.topic.trim() !== q.topic.trim()
    );
  };

  // Replaces one question with a new one at the difficulty and topic
  // currently set on its card. Only that card changes: unsaved edits
  // to the other questions are kept.
  const regenerate = async (index) => {
    const q = draft[index];
    setBusy(`regen-${q.id}`);
    setError('');
    try {
      const data = await jobQuestionsAPI.regenerate(jobId, q.id, {
        difficulty: q.difficulty,
        topic: q.topic,
      });
      const fresh = (data.questions || []).find((item) => item.id === q.id);
      setAssessment(data);
      if (onChange) onChange(data);
      if (fresh) {
        setDraft((list) => list.map((item) => (item.id === q.id ? toDraft(fresh) : item)));
      }
      notify(`Question ${index + 1} replaced with a new ${q.difficulty} question.`);
    } catch (err) {
      setError(userMessage(err, ACTION_ERRORS.regenerate.fallback, { uncertain: ACTION_ERRORS.regenerate.uncertain }));
    } finally {
      setBusy('');
    }
  };

  const add = () => setDraft((list) => [
    ...list,
    { id: null, question: '', difficulty: 'medium', topic: '', keyPointsText: '', source: 'RECRUITER' },
  ]);

  const saveSettings = () => run('settings', () => jobQuestionsAPI.updateSettings(jobId, {
    requiredSkills: skillsText.split(',').map((s) => s.trim()).filter(Boolean),
    questionCount: Number(count),
  }), 'Question settings saved.');

  const doGenerate = () => {
    setConfirming(null);
    run('generate', () => jobQuestionsAPI.generate(jobId), 'Questions generated. Review them before approving.');
  };

  // Replacing an existing draft is asked first; a first draft is not.
  const generate = () => (draft.length > 0 ? setConfirming('generate') : doGenerate());

  const save = () => run('save', () => jobQuestionsAPI.save(jobId, draft.map(toRequest)), 'Draft saved.');

  const doApprove = () => {
    setConfirming(null);
    run('approve', () => jobQuestionsAPI.approve(jobId), 'Questions approved. Candidates can now take this interview.');
  };

  const approve = () => setConfirming('approve');

  const cancelConfirm = () => setConfirming(null);

  if (loadError) {
    return (
      <FormAlert message={loadError}>
        <div style={{ marginTop: 'var(--space-2)' }}>
          <Button size="sm" variant="secondary" onClick={() => setLoadAttempt((n) => n + 1)}>Try again</Button>
        </div>
      </FormAlert>
    );
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
          {draft.map((q, i) => {
            const edited = settingsEdited(q);
            return (
            <li key={q.id || `new-${i}`} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 'var(--fs-sm)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                  Question {i + 1}
                  <Badge tone={DIFFICULTY_TONE[q.difficulty]}>{q.difficulty}</Badge>
                  <Badge tone="neutral">{q.source === 'AI' ? 'AI draft' : 'Recruiter'}</Badge>
                </strong>
                <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                  <Button size="sm" variant="ghost" icon={<ArrowUp size={14} />} aria-label={`Move question ${i + 1} up`}
                    disabled={i === 0 || Boolean(busy)} onClick={() => move(i, -1)} />
                  <Button size="sm" variant="ghost" icon={<ArrowDown size={14} />} aria-label={`Move question ${i + 1} down`}
                    disabled={i === draft.length - 1 || Boolean(busy)} onClick={() => move(i, 1)} />
                  <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} aria-label={`Remove question ${i + 1}`}
                    disabled={Boolean(busy)} onClick={() => remove(i)} />
                </div>
              </div>

              {/* Difficulty and topic first: they decide what a regenerated question asks. */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
                <div style={{ flex: '0 1 160px', minWidth: 140 }}>
                  <label className="label" htmlFor={`d-${jobId}-${i}`}>Difficulty</label>
                  <select id={`d-${jobId}-${i}`} className="input" value={q.difficulty} onChange={update(i, 'difficulty')}>
                    {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <label className="label" htmlFor={`t-${jobId}-${i}`}>Topic</label>
                  <input id={`t-${jobId}-${i}`} className="input" maxLength={120} value={q.topic}
                    placeholder="e.g. REST APIs, SQL joins" onChange={update(i, 'topic')} />
                </div>
                <div>
                  <Button size="sm" variant={edited ? 'primary' : 'secondary'} icon={<RefreshCw size={14} />}
                    aria-label={`Regenerate question ${i + 1} as ${q.difficulty}${q.topic.trim() ? ` about ${q.topic.trim()}` : ''}`}
                    title={q.id ? 'Write a new question at this difficulty and topic' : 'Save the draft first'}
                    disabled={!q.id || Boolean(busy)} loading={busy === `regen-${q.id}`}
                    onClick={() => regenerate(i)}>
                    Regenerate
                  </Button>
                </div>
              </div>
              {edited && (
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                  Difficulty or topic changed. Regenerate for a matching question, or save the draft to keep this one as is.
                </p>
              )}

              <label className="label" htmlFor={`q-${jobId}-${i}`} style={{ marginTop: 'var(--space-2)' }}>Question</label>
              <textarea id={`q-${jobId}-${i}`} className="input" rows={2} maxLength={600}
                value={q.question} onChange={update(i, 'question')} style={{ resize: 'vertical' }} />

              <label className="label" htmlFor={`k-${jobId}-${i}`} style={{ marginTop: 'var(--space-2)' }}>
                Key points (one per line, 2-6) - what a complete answer covers
              </label>
              <textarea id={`k-${jobId}-${i}`} className="input" rows={3}
                value={q.keyPointsText} onChange={update(i, 'keyPointsText')} style={{ resize: 'vertical' }} />
            </li>
            );
          })}
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

      <FormAlert message={error} />

      <div>
        <Button icon={<CheckCircle2 size={16} />} loading={busy === 'approve'}
          disabled={dirty || settingsChanged || assessment.issues.length > 0 || Boolean(busy)}
          onClick={approve}>
          Approve questions
        </Button>
      </div>

      <ConfirmDialog
        open={confirming === 'generate'}
        title="Replace the current questions?"
        confirmLabel="Regenerate all"
        tone="danger"
        onConfirm={doGenerate}
        onCancel={cancelConfirm}
      >
        <p>
          All {draft.length} draft question{draft.length === 1 ? '' : 's'} will be replaced with newly
          generated ones, including any edits you made.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirming === 'approve'}
        title="Approve these questions?"
        confirmLabel="Approve questions"
        onConfirm={doApprove}
        onCancel={cancelConfirm}
      >
        <p>
          Every candidate for this job will be asked these {draft.length} questions, in this order.
          They cannot be changed afterwards; a different set needs a new job.
        </p>
      </ConfirmDialog>
    </section>
  );
}
