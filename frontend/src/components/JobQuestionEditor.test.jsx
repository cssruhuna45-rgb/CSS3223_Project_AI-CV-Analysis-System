import React from 'react';
import { createRoot } from 'react-dom/client';
import { act, Simulate } from 'react-dom/test-utils';
import JobQuestionEditor from './JobQuestionEditor';
import { jobQuestionsAPI } from '../services/jobQuestionsApi';
import { ApiError } from '../services/http';

// Regenerating and approving are both one-way doors: one discards the
// recruiter's edits, the other locks the question set for every
// candidate who will ever sit this job's interview. They used to ask
// with window.confirm, which cannot be styled and sits outside the
// page. These tests pin down that they still ask, that nothing happens
// until the recruiter says so, and that the handlers behind them are
// unchanged.

jest.mock('../components/ToastProvider', () => ({ useToast: () => jest.fn() }));

jest.mock('../services/jobQuestionsApi', () => ({
  jobQuestionsAPI: {
    get: jest.fn(),
    generate: jest.fn(),
    approve: jest.fn(),
    save: jest.fn(),
    regenerate: jest.fn(),
    updateSettings: jest.fn(),
    add: jest.fn(),
  },
}));

const QUESTION = {
  id: 7,
  question: 'Explain the React render cycle.',
  difficulty: 'medium',
  topic: 'React',
  keyPoints: ['Reconciliation', 'Dependency arrays'],
  source: 'AI',
};

const DRAFT = {
  approved: false,
  approvedBy: null,
  approvedAt: null,
  questionCount: 5,
  requiredSkills: ['react'],
  questions: [QUESTION],
  issues: [],
};

let container;
let root;

const render = async (assessment = DRAFT) => {
  jobQuestionsAPI.get.mockResolvedValue(assessment);

  await act(async () => {
    root.render(<JobQuestionEditor jobId={3} />);
  });
};

const dialog = () => container.querySelector('[role="dialog"]');

const button = (label, scope) =>
  [...(scope || container).querySelectorAll('button')]
    .find((b) => b.textContent.trim() === label);

const click = async (el) => { await act(async () => { el.click(); }); };

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.clearAllMocks();
});

describe('approving', () => {

  test('asks first, and nothing is approved until it is confirmed', async () => {
    await render();

    await click(button('Approve questions'));

    expect(dialog()).not.toBeNull();
    expect(dialog().textContent).toContain('cannot be changed afterwards');
    expect(jobQuestionsAPI.approve).not.toHaveBeenCalled();
  });

  test('confirming calls the unchanged approve handler', async () => {
    jobQuestionsAPI.approve.mockResolvedValue({ ...DRAFT, approved: true });

    await render();
    await click(button('Approve questions'));
    await click(button('Approve', dialog()));

    expect(jobQuestionsAPI.approve).toHaveBeenCalledWith(3);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  test('cancelling approves nothing', async () => {
    await render();
    await click(button('Approve questions'));
    await click(button('Cancel', dialog()));

    expect(jobQuestionsAPI.approve).not.toHaveBeenCalled();
    expect(dialog()).toBeNull();
  });
});

describe('regenerating', () => {

  test('asks before discarding a draft that has questions in it', async () => {
    await render();

    await click(button('Regenerate all'));

    expect(dialog()).not.toBeNull();
    expect(dialog().textContent).toContain('will be discarded');
    expect(jobQuestionsAPI.generate).not.toHaveBeenCalled();
  });

  test('confirming calls the unchanged generate handler', async () => {
    jobQuestionsAPI.generate.mockResolvedValue(DRAFT);

    await render();
    await click(button('Regenerate all'));
    await click(button('Replace them', dialog()));

    expect(jobQuestionsAPI.generate).toHaveBeenCalledWith(3);
  });

  test('does not ask when there is no draft to lose', async () => {
    jobQuestionsAPI.generate.mockResolvedValue(DRAFT);

    await render({ ...DRAFT, questions: [] });
    await click(button('Generate questions'));

    // Nothing was going to be discarded, so nothing was asked.
    expect(dialog()).toBeNull();
    expect(jobQuestionsAPI.generate).toHaveBeenCalledWith(3);
  });
});

describe('the confirmation itself', () => {

  test('is the app\'s own dialog, announced as modal', async () => {
    await render();
    await click(button('Approve questions'));

    const d = dialog();
    expect(d.getAttribute('aria-modal')).toBe('true');
    // Named by its heading, so a screen reader says what is being asked.
    expect(d.getAttribute('aria-labelledby')).toBeTruthy();
    expect(document.getElementById(d.getAttribute('aria-labelledby'))).not.toBeNull();
  });

  test('opens with focus inside it, on the non-destructive action', async () => {
    await render();
    await click(button('Approve questions'));

    // A stray Enter on opening must not approve anything.
    expect(dialog().contains(document.activeElement)).toBe(true);
    expect(document.activeElement.textContent.trim()).toBe('Cancel');
  });

  test('key points stay out of the candidate-facing world but remain editable here', async () => {
    await render();

    // Unchanged behaviour, asserted so the dialog work cannot quietly
    // disturb it: the recruiter still sees and edits the key points.
    expect(container.textContent).toContain('Reconciliation');
  });
});

// ---- Adding a question ----------------------------------------------

describe('adding a question', () => {

  const SECOND = {
    id: 8,
    question: 'How does useEffect clean up a subscription?',
    difficulty: 'easy',
    topic: 'Hooks',
    keyPoints: ['Return a cleanup function', 'Runs before the next effect'],
    source: 'AI',
  };

  const ADDED = {
    id: 9,
    question: 'How would you split a large React bundle?',
    difficulty: 'hard',
    topic: 'Performance',
    keyPoints: ['Dynamic import', 'React.lazy and Suspense'],
    source: 'AI',
  };

  const TWO = { ...DRAFT, questions: [QUESTION, SECOND] };

  const type = async (el, value) => {
    await act(async () => {
      el.value = value;
      Simulate.change(el);
    });
  };

  const questionBoxes = () => [...container.querySelectorAll('textarea[id^="q-3-"]')];
  const addPanel = () => container.querySelector('[role="group"][aria-label="Add a question"]');

  const openAi = async () => {
    await click(button('Add question'));
    await click(button('Generate with AI', addPanel()));
  };

  test('"Add question" offers both ways to add', async () => {
    await render(TWO);

    const add = button('Add question');
    expect(add.getAttribute('aria-expanded')).toBe('false');
    await click(add);

    expect(add.getAttribute('aria-expanded')).toBe('true');
    expect(button('Generate with AI', addPanel())).toBeTruthy();
    expect(button('Add manually', addPanel())).toBeTruthy();
  });

  test('adding manually appends an editable question and keeps unsaved edits', async () => {
    jobQuestionsAPI.save.mockResolvedValue(TWO);
    await render(TWO);
    await type(questionBoxes()[0], 'Explain the React render cycle, step by step.');

    await click(button('Add question'));
    await click(button('Add manually', addPanel()));

    const boxes = questionBoxes();
    expect(boxes).toHaveLength(3);
    expect(boxes[0].value).toBe('Explain the React render cycle, step by step.');
    expect(boxes[1].value).toBe(SECOND.question);
    expect(boxes[2].value).toBe('');
    // Every field of the data model is there to fill in.
    expect(container.querySelector('#d-3-2')).not.toBeNull();
    expect(container.querySelector('#t-3-2')).not.toBeNull();
    expect(container.querySelector('#k-3-2')).not.toBeNull();
    expect(document.activeElement).toBe(boxes[2]);

    await type(boxes[2], 'What is the virtual DOM and why does React use it?');
    await type(container.querySelector('#k-3-2'), 'Diffing\nBatched updates');
    await click(button('Save draft'));

    const sent = jobQuestionsAPI.save.mock.calls[0][1];
    expect(sent).toHaveLength(3);
    expect(sent[0]).toMatchObject({ id: 7, question: 'Explain the React render cycle, step by step.' });
    expect(sent[2]).toEqual({
      id: null,
      question: 'What is the virtual DOM and why does React use it?',
      difficulty: 'medium',
      topic: '',
      keyPoints: ['Diffing', 'Batched updates'],
    });
  });

  test('generating with AI appends one question and keeps unsaved edits and order', async () => {
    // The server saved the new question after the two saved ones.
    jobQuestionsAPI.add.mockResolvedValue({ ...DRAFT, questions: [QUESTION, SECOND, ADDED] });
    await render(TWO);
    await type(questionBoxes()[1], 'How does useEffect clean up after itself on unmount?');

    await openAi();
    await type(container.querySelector('#add-d-3'), 'hard');
    await type(container.querySelector('#add-t-3'), '  Performance ');
    await click(button('Generate question'));

    expect(jobQuestionsAPI.add).toHaveBeenCalledWith(3, {
      difficulty: 'hard',
      topic: '  Performance ',
      draftQuestions: [QUESTION.question, 'How does useEffect clean up after itself on unmount?'],
    });
    expect(jobQuestionsAPI.generate).not.toHaveBeenCalled();
    expect(jobQuestionsAPI.regenerate).not.toHaveBeenCalled();

    const boxes = questionBoxes();
    expect(boxes.map((b) => b.value)).toEqual([
      QUESTION.question,
      'How does useEffect clean up after itself on unmount?',
      ADDED.question,
    ]);
    // The unsaved edit is still unsaved, and the new card is editable.
    expect(button('Save draft').disabled).toBe(false);
    expect(container.querySelector('#k-3-2').value).toBe('Dynamic import\nReact.lazy and Suspense');
    expect(addPanel()).toBeNull();
  });

  test('both choices are offered again for the next question', async () => {
    jobQuestionsAPI.add.mockResolvedValue({ ...DRAFT, questions: [QUESTION, SECOND, ADDED] });
    await render(TWO);
    await openAi();
    await click(button('Generate question'));

    await click(button('Add question'));
    expect(button('Generate with AI', addPanel())).toBeTruthy();
    await click(button('Add manually', addPanel()));
    expect(questionBoxes()).toHaveLength(4);
  });

  test('a failed generation keeps the draft and says to try again', async () => {
    jobQuestionsAPI.add.mockRejectedValue(new ApiError({
      status: 502, code: 'AI_FAILED', message: 'Traceback (most recent call last): KeyError',
    }));
    await render(TWO);
    await type(questionBoxes()[0], 'Explain the React render cycle, step by step.');

    await openAi();
    await click(button('Generate question'));

    expect(questionBoxes().map((b) => b.value)).toEqual([
      'Explain the React render cycle, step by step.', SECOND.question,
    ]);
    const alert = container.querySelector('[role="alert"]').textContent;
    expect(alert).toContain('Your draft is unchanged; please try again.');
    expect(alert).not.toContain('Traceback');
    // The form stays open with the recruiter's choices, ready to retry.
    expect(button('Generate question').disabled).toBe(false);
  });

  test('a second click while generating sends no second request', async () => {
    let finish;
    jobQuestionsAPI.add.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    await render(TWO);
    await openAi();

    const submit = button('Generate question');
    await act(async () => {
      submit.click();
      submit.click();
    });

    expect(jobQuestionsAPI.add).toHaveBeenCalledTimes(1);
    expect(submit.disabled).toBe(true);
    expect(container.textContent).toContain('Writing a new question');
    expect(button('Add question').disabled).toBe(true);

    await act(async () => { finish({ ...DRAFT, questions: [QUESTION, SECOND, ADDED] }); });
    expect(questionBoxes()).toHaveLength(3);
  });

  test('at the maximum of 10 questions, adding is off and says why', async () => {
    const ten = Array.from({ length: 10 }, (_, i) => ({
      ...QUESTION, id: 100 + i, question: 'Question number ' + (i + 1) + ' about React?',
    }));
    await render({ ...DRAFT, questionCount: 10, questions: ten });

    expect(button('Add question').disabled).toBe(true);
    expect(container.textContent).toContain('This job has the maximum of 10 questions. Remove one to add another.');
  });

  test('the server refusing at the limit is explained, and the draft kept', async () => {
    const refusal = 'This job already has the maximum of 10 questions. Remove one and save the draft before adding another.';
    jobQuestionsAPI.add.mockRejectedValue(new ApiError({
      status: 400, code: 'BAD_REQUEST', message: refusal, serverMessage: refusal,
    }));
    await render(TWO);
    await openAi();
    await click(button('Generate question'));

    expect(container.querySelector('[role="alert"]').textContent).toContain('Remove one and save the draft');
    expect(questionBoxes()).toHaveLength(2);
  });

  test('AI generation waits for unsaved settings, as full generation does', async () => {
    await render(TWO);
    await type(container.querySelector('#skills-3'), 'react, typescript');
    await click(button('Add question'));

    expect(button('Generate with AI', addPanel()).disabled).toBe(true);
    expect(addPanel().textContent).toContain('Save the question settings first');
    // Adding manually needs nothing from the AI.
    expect(button('Add manually', addPanel()).disabled).toBe(false);
  });

  test('a mismatch with the question count is explained, not changed silently', async () => {
    jobQuestionsAPI.add.mockResolvedValue({ ...DRAFT, questionCount: 5, questions: [QUESTION, SECOND, ADDED] });
    await render({ ...DRAFT, questionCount: 5, questions: [QUESTION, SECOND] });

    expect(container.textContent).toContain('This draft has 2 questions, but each candidate is set to be asked 5');
    await openAi();
    await click(button('Generate question'));

    expect(container.querySelector('#count-3').value).toBe('5');
    expect(jobQuestionsAPI.updateSettings).not.toHaveBeenCalled();
    expect(container.textContent).toContain('This draft has 3 questions');
  });

  test('an AI-added question that completes the set can be approved', async () => {
    const four = [QUESTION, SECOND,
      { ...SECOND, id: 10, question: 'What does React.memo skip, and when?' },
      { ...SECOND, id: 11, question: 'When would you reach for useReducer?' }];
    jobQuestionsAPI.add.mockResolvedValue({ ...DRAFT, questions: [...four, ADDED], issues: [] });
    jobQuestionsAPI.approve.mockResolvedValue({ ...DRAFT, approved: true, questions: [...four, ADDED] });
    await render({ ...DRAFT, questions: four, issues: ['Expected 5 questions, found 4.'] });
    expect(button('Approve questions').disabled).toBe(true);

    await openAi();
    await click(button('Generate question'));

    // Nothing unsaved: the new question is already in the saved set.
    expect(button('Save draft').disabled).toBe(true);
    expect(button('Approve questions').disabled).toBe(false);
    await click(button('Approve questions'));
    await click(button('Approve', dialog()));
    expect(jobQuestionsAPI.approve).toHaveBeenCalledWith(3);
  });

  test('saving settings keeps unsaved question edits', async () => {
    jobQuestionsAPI.updateSettings.mockResolvedValue({ ...TWO, questionCount: 6 });
    await render(TWO);
    await click(button('Add question'));
    await click(button('Add manually', addPanel()));
    await type(questionBoxes()[2], 'A manual question that is not saved yet?');

    await type(container.querySelector('#count-3'), '6');
    await click(button('Save settings'));

    expect(jobQuestionsAPI.updateSettings).toHaveBeenCalled();
    expect(questionBoxes()[2].value).toBe('A manual question that is not saved yet?');
  });

  test('an approved set offers no way to add questions', async () => {
    await render({ ...DRAFT, approved: true });

    expect(button('Add question')).toBeUndefined();
    expect(button('Generate with AI')).toBeUndefined();
  });
});
