import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, CheckCircle2, Lock, PenLine, Plus, RefreshCw, Save, Sparkles, Trash2,
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
  add: {
    fallback: "We couldn't write a new question. Your draft is unchanged; please try again.",
    uncertain: "We couldn't confirm whether a new question was added. Your draft is unchanged here; try again, or reload the page to check.",
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
  // Which irreversible action is waiting to be confirmed: 'generate',
  // 'approve', or null for none.
  const [confirming, setConfirming] = useState(null);

  // Adding a question: null (closed), 'choose' (AI or manual), or 'ai'
  // (difficulty and topic for the AI question).
  const [adding, setAdding] = useState(null);
  const [addDifficulty, setAddDifficulty] = useState('medium');
  const [addTopic, setAddTopic] = useState('');
  // Set synchronously, so a second click cannot send a second request
  // before the first one's busy state has rendered.
  const addInFlight = useRef(false);
  // Index of a just-added question whose text box should take focus.
  const [focusIndex, setFocusIndex] = useState(null);

  // keepDraft: the action did not change the questions (settings), so
  // the recruiter's unsaved edits stay as they are.
  const apply = (data, { keepDraft = false } = {}) => {
    setAssessment(data);
    if (!keepDraft) setDraft((data.questions || []).map(toDraft));
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
  const run = async (name, action, success, applyOptions) => {
    setBusy(name);
    setError('');
    try {
      apply(await action(), applyOptions);
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

  useEffect(() => {
    if (focusIndex === null) return;
    const box = document.getElementById(`q-${jobId}-${focusIndex}`);
    if (box) box.focus();
    setFocusIndex(null);
  }, [focusIndex, jobId]);

  const atLimit = draft.length >= MAX_QUESTIONS;

  // The AI writes from the saved skills, so unsaved settings must be
  // saved first, as for "Generate questions".
  const aiBlockedReason = !(assessment?.requiredSkills || []).length
    ? 'Add at least one required skill and save the settings to generate a question.'
    : settingsChanged
      ? 'Save the question settings first; the new question is written from the saved skills.'
      : '';

  const openAdd = () => {
    setError('');
    setAdding((open) => (open ? null : 'choose'));
  };

  const addManually = () => {
    if (atLimit) return;
    const index = draft.length;
    setDraft((list) => [
      ...list,
      { id: null, question: '', difficulty: 'medium', topic: '', keyPointsText: '', source: 'RECRUITER' },
    ]);
    setAdding(null);
    setFocusIndex(index);
  };

  // Writes one question and adds it to the end of the draft. Only the
  // new question is added: every other card, saved or not, stays as the
  // recruiter left it.
  const addWithAi = async (e) => {
    if (e) e.preventDefault();
    if (addInFlight.current || atLimit || aiBlockedReason) return;
    addInFlight.current = true;
    setBusy('add');
    setError('');

    const known = new Set([
      ...(assessment.questions || []).map((q) => q.id),
      ...draft.map((q) => q.id).filter(Boolean),
    ]);
    const difficulty = addDifficulty;

    try {
      const data = await jobQuestionsAPI.add(jobId, {
        difficulty,
        topic: addTopic,
        draftQuestions: draft.map((q) => q.question),
      });
      const fresh = (data.questions || []).filter((q) => !known.has(q.id));
      setAssessment(data);
      if (onChange) onChange(data);
      if (fresh.length) {
        const index = draft.length;
        setDraft((list) => [...list, ...fresh.map(toDraft)]);
        setFocusIndex(index);
      }
      setAdding(null);
      setAddTopic('');
      notify(`A new ${difficulty} question was added at the end. Review it before approving.`);
    } catch (err) {
      setError(userMessage(err, ACTION_ERRORS.add.fallback, { uncertain: ACTION_ERRORS.add.uncertain }));
    } finally {
      addInFlight.current = false;
      setBusy('');
    }
  };

  const saveSettings = () => run('settings', () => jobQuestionsAPI.updateSettings(jobId, {
    requiredSkills: skillsText.split(',').map((s) => s.trim()).filter(Boolean),
    questionCount: Number(count),
  }), 'Question settings saved.', { keepDraft: true });

  const doGenerate = () =>
    run('generate', () => jobQuestionsAPI.generate(jobId), 'Questions generated. Review them before approving.');

  const generate = () => {
    // Only worth asking when there is something to lose; generating
    // the first set discards nothing.
    if (draft.length > 0) {
      setConfirming('generate');
      return;
    }
    doGenerate();
  };

  const save = () => run('save', () => jobQuestionsAPI.save(jobId, draft.map(toRequest)), 'Draft saved.');

  const approve = () => setConfirming('approve');

  // Runs whichever action was being confirmed. The dialog stays up,
  // with its button disabled, until the request finishes - so a second
  // click cannot repeat an approval that is already on its way.
  const confirmAction = async () => {
    if (confirming === 'generate') await doGenerate();
    else if (confirming === 'approve') {
      await run('approve', () => jobQuestionsAPI.approve(jobId), 'Questions approved. Candidates can now take this interview.');
    }
    setConfirming(null);
  };

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

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
        <Button size="sm" variant="secondary" icon={<Plus size={14} />}
          aria-expanded={Boolean(adding)} aria-controls={`add-${jobId}`}
          aria-describedby={atLimit ? `add-limit-${jobId}` : undefined}
          disabled={atLimit || Boolean(busy)} onClick={openAdd}>
          Add question
        </Button>
        <Button size="sm" variant="secondary" icon={<Save size={14} />}
          disabled={!dirty || Boolean(busy)} loading={busy === 'save'} onClick={save}>
          Save draft
        </Button>
        {atLimit && (
          <span id={`add-limit-${jobId}`} style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
            This job has the maximum of {MAX_QUESTIONS} questions. Remove one to add another.
          </span>
        )}
      </div>

      {adding && !atLimit && (
        <div id={`add-${jobId}`} role="group" aria-label="Add a question"
          style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', display: 'grid', gap: 'var(--space-3)' }}>
          {adding === 'choose' && (
            <>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                How would you like to add question {draft.length + 1}?
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                <Button size="sm" icon={<Sparkles size={14} />} disabled={Boolean(aiBlockedReason)}
                  aria-describedby={aiBlockedReason ? `add-ai-blocked-${jobId}` : undefined}
                  onClick={() => setAdding('ai')}>
                  Generate with AI
                </Button>
                <Button size="sm" variant="secondary" icon={<PenLine size={14} />} onClick={addManually}>
                  Add manually
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAdding(null)}>Cancel</Button>
              </div>
              {aiBlockedReason && (
                <p id={`add-ai-blocked-${jobId}`} style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                  {aiBlockedReason}
                </p>
              )}
            </>
          )}

          {adding === 'ai' && (
            <form onSubmit={addWithAi} style={{ display: 'grid', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
                <div style={{ flex: '0 1 160px', minWidth: 140 }}>
                  <label className="label" htmlFor={`add-d-${jobId}`}>Difficulty</label>
                  <select id={`add-d-${jobId}`} className="input" value={addDifficulty}
                    disabled={busy === 'add'} onChange={(e) => setAddDifficulty(e.target.value)}>
                    {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <label className="label" htmlFor={`add-t-${jobId}`}>Topic (optional)</label>
                  <input id={`add-t-${jobId}`} className="input" maxLength={120} value={addTopic}
                    disabled={busy === 'add'} placeholder="e.g. REST APIs, SQL joins"
                    onChange={(e) => setAddTopic(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
                <Button type="submit" size="sm" icon={<Sparkles size={14} />}
                  loading={busy === 'add'} disabled={Boolean(busy) || Boolean(aiBlockedReason)}>
                  Generate question
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={busy === 'add'} onClick={() => setAdding('choose')}>
                  Back
                </Button>
                <span role="status" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                  {busy === 'add'
                    ? 'Writing a new question. This can take up to a minute.'
                    : "Written from the job's description and required skills, and added after the existing questions."}
                </span>
              </div>
            </form>
          )}
        </div>
      )}

      {draft.length > 0 && draft.length !== assessment.questionCount && (
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
          This draft has {draft.length} question{draft.length === 1 ? '' : 's'}, but each candidate is set to be
          asked {assessment.questionCount}. Before approving,{' '}
          {draft.length >= 5 && draft.length <= MAX_QUESTIONS
            ? <>change “Questions per candidate” to {draft.length} and save the settings, or {draft.length > assessment.questionCount ? 'remove' : 'add'} questions to match.</>
            : <>{draft.length > assessment.questionCount ? 'remove' : 'add'} questions to match.</>}
          {draft.length >= 5 && draft.length <= MAX_QUESTIONS && count !== draft.length && (
            <>
              {' '}
              <button type="button" onClick={() => setCount(draft.length)}
                style={{ background: 'none', border: 0, padding: 0, color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }}>
                Set to {draft.length}
              </button>
            </>
          )}
        </p>
      )}

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
        tone="danger"
        title="Replace the draft questions?"
        description={`The ${draft.length} question${draft.length === 1 ? '' : 's'} in this draft will be discarded and a new set written from the job's required skills. Any wording or key points you have edited here will be lost.`}
        confirmLabel="Replace them"
        busy={busy === 'generate'}
        onConfirm={confirmAction}
        onCancel={() => setConfirming(null)}
      />

      <ConfirmDialog
        open={confirming === 'approve'}
        title="Approve these questions?"
        description={`Every candidate will be asked exactly these ${draft.length} questions, in this order, and graded against their key points. Approved questions cannot be changed afterwards - a different set needs a new job.`}
        confirmLabel="Approve"
        busy={busy === 'approve'}
        onConfirm={confirmAction}
        onCancel={() => setConfirming(null)}
      />
    </section>
  );
}
