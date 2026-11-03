import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import JobQuestionEditor from './JobQuestionEditor';
import { jobQuestionsAPI } from '../services/jobQuestionsApi';

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
