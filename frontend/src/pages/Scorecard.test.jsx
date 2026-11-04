import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import Scorecard, { NOT_SCORED_MESSAGE, gradingUnavailable } from './Scorecard';
import { ApiError } from '../services/http';

// What a candidate may read about their own answers.
//
// A job interview puts the recruiter's approved questions to every
// candidate in turn, so "what was missing" on one of those questions is
// the answer key for the next candidate. A practice interview's
// questions are generated for that session alone, and the same feedback
// is the whole point of sitting one.
//
// The scorecard carries a question_id only on the recruiter's fixed
// questions, which is what separates the two here.

const mockNavigate = jest.fn();
// The query string the component sees; set per test. "session=..."
// asks for one stored report, empty asks for the archive.
let mockSearch = '';

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(mockSearch)],
}));

jest.mock('../components/ToastProvider', () => ({ useToast: () => jest.fn() }));

// Rendered below the report and not under test; both fetch on mount.
jest.mock('../components/InterviewProgress', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/LearningRoadmap', () => ({ __esModule: true, default: () => null }));

jest.mock('../services/api', () => ({
  interviewAPI: {
    getScorecard: jest.fn(() => new Promise(() => {})),
    history: jest.fn(() => new Promise(() => {})),
    getScorecardHistory: jest.fn(() => new Promise(() => {})),
    progress: jest.fn(() => new Promise(() => {})),
  },
  roadmapAPI: {
    getBySessionId: jest.fn(() => new Promise(() => {})),
    getLatest: jest.fn(() => new Promise(() => {})),
    generate: jest.fn(() => new Promise(() => {})),
  },
}));

const MISSING = 'the dependency array and the render cycle';

const QUESTION = {
  question_number: 1,
  question: 'What does useEffect do?',
  score: 60,
  verdict: 'partial',
  what_was_good: 'You described the basic idea clearly.',
  what_was_missing: `The answer did not mention ${MISSING}.`,
  references: [],
};

const PRACTICE = {
  session_id: 'session-1',
  status: 'completed',
  evaluated: true,
  mode: 'practice',
  overall_score: 60,
  total_questions: 1,
  category_scores: [],
  strengths: ['Explains ideas in plain terms'],
  improvements: ['Go deeper on React internals'],
  // No question_id: these questions were generated for this session.
  per_question: [QUESTION],
  turns: [],
};

// The same interview, sat against a recruiter's approved question set.
const JOB = {
  ...PRACTICE,
  mode: 'exam',
  per_question: [{ ...QUESTION, question_id: 41 }],
};

let container;
let root;

const render = async (result) => {
  sessionStorage.setItem('interviewResult', JSON.stringify(result));

  await act(async () => {
    root.render(<Scorecard />);
  });
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  mockSearch = '';
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  sessionStorage.clear();
  jest.clearAllMocks();
});

describe('a practice interview', () => {

  test('shows what the answer was missing', async () => {
    await render(PRACTICE);

    expect(container.textContent).toContain('What was missing');
    expect(container.textContent).toContain(MISSING);
  });
});

describe('a job interview', () => {

  test('does not show what the answer was missing', async () => {
    await render(JOB);

    // The recruiter's answer key, in all but name.
    expect(container.textContent).not.toContain('What was missing');
    expect(container.textContent).not.toContain(MISSING);
  });

  test('says why the detail is absent rather than looking broken', async () => {
    await render(JOB);

    expect(container.textContent).toContain('questions set by the recruiter');
    expect(container.textContent).toContain('shown only to the recruiter');
  });

  test('still shows the score, the question and what went well', async () => {
    await render(JOB);

    const text = container.textContent;

    // Everything a candidate was already entitled to is still here.
    expect(text).toContain('What does useEffect do?');
    expect(text).toContain('60');
    expect(text).toContain('What worked');
    expect(text).toContain('You described the basic idea clearly.');
  });

  test('still shows the overall summary', async () => {
    await render(JOB);

    expect(container.textContent).toContain('Explains ideas in plain terms');
    expect(container.textContent).toContain('Go deeper on React internals');
  });
});

describe('the distinction is per interview, not per field', () => {

  test('one fixed question is enough to treat the whole report as a job interview', async () => {
    // A mixed set should never leak: if any question came from the
    // recruiter's approved set, the report is a job interview.
    await render({
      ...PRACTICE,
      total_questions: 2,
      per_question: [
        { ...QUESTION, question_id: 41 },
        { ...QUESTION, question_number: 2, what_was_missing: 'Something else entirely.' },
      ],
    });

    expect(container.textContent).not.toContain('What was missing');
    expect(container.textContent).not.toContain('Something else entirely.');
  });
});


// ---- Getting back to the archive --------------------------------------

describe('the "All Past Interviews" button', () => {

  const click = async (label) => {
    const el = [...container.querySelectorAll('button')]
      .find((b) => b.textContent.trim().includes(label));

    await act(async () => { el.click(); });
  };

  test('goes to the archive, not to the progress page', async () => {
    await render(PRACTICE);

    await click('All Past Interviews');

    // It used to navigate to /progress, which is a different page
    // entirely - the label promised the list of past interviews.
    expect(mockNavigate).toHaveBeenCalledWith('/scorecard');
    expect(mockNavigate).not.toHaveBeenCalledWith('/progress');
  });

  test('forgets the open report, so the archive can actually render', async () => {
    await render(PRACTICE);

    await click('All Past Interviews');

    // The archive only renders when no result is loaded, and a cached
    // result is read straight back on the next render. Leaving it in
    // place put the same report back on screen.
    expect(sessionStorage.getItem('interviewResult')).toBeNull();
    expect(container.textContent).not.toContain('What does useEffect do?');
  });
});

describe('opening a stored report', () => {

  test('does not overwrite the cache that means "just finished"', async () => {
    const { interviewAPI } = require('../services/api');
    interviewAPI.getScorecard.mockResolvedValue(JOB);

    // Nothing cached, and a report asked for by id.
    sessionStorage.clear();
    mockSearch = 'session=session-1';

    await act(async () => {
      root.render(<Scorecard />);
    });

    expect(interviewAPI.getScorecard).toHaveBeenCalledWith('session-1');
    expect(container.textContent).toContain('What does useEffect do?');

    // Caching every report a candidate opens made a bare /scorecard -
    // the sidebar's own Scorecards link - show that report instead of
    // the archive, for the rest of the session.
    expect(sessionStorage.getItem('interviewResult')).toBeNull();
  });
});

// ---- The archive: which kind of interview each row was -----------------

describe('the interview archive', () => {
  const { interviewAPI } = require('../services/api');

  // Newest first, which is the order the endpoint returns.
  const HISTORY = [
    { sessionId: 's7', score: 94, status: 'completed', mode: 'exam',
      jobTitle: 'Backend Developer', company: 'ABC', completedAt: '2026-11-03T10:00:00' },
    { sessionId: 's6', score: 49, status: 'completed', mode: 'exam',
      completedAt: '2026-10-24T10:00:00' },
    { sessionId: 's5', score: 85, status: 'completed', mode: 'practice',
      completedAt: '2026-10-24T09:00:00' },
  ];

  const renderArchive = async (history = HISTORY) => {
    sessionStorage.clear();
    interviewAPI.history.mockResolvedValue(history);

    await act(async () => {
      root.render(<Scorecard />);
    });
  };

  const chip = (label) =>
    [...container.querySelectorAll('button')]
      .find((b) => b.textContent.trim().startsWith(label));

  const rowNumbers = () =>
    [...container.querySelectorAll('span')]
      .map((el) => el.textContent)
      .filter((t) => /^Interview #\d+$/.test(t));

  test('an interview taken for a job is tagged as a job interview', async () => {
    await renderArchive();

    expect(container.textContent).toContain('Job interview');
    // And says which job, which is the useful part.
    expect(container.textContent).toContain('Backend Developer');
    expect(container.textContent).toContain('ABC');
  });

  test('a job interview is not also tagged Exam', async () => {
    await renderArchive([HISTORY[0]]);

    // It is always sat under exam conditions, so saying both is noise.
    expect(container.textContent).toContain('Job interview');
    expect(container.textContent).not.toContain('Exam');
  });

  test('interviews taken alone keep their existing tags', async () => {
    await renderArchive();

    expect(container.textContent).toContain('Exam');
    expect(container.textContent).toContain('Practice');
  });

  test('filtering to one kind shows only that kind', async () => {
    await renderArchive();

    await act(async () => { chip('Practice').click(); });

    // Checked on the rows, not the whole page: "Job interviews" is also
    // the name of a filter chip, which stays on screen either way.
    expect(rowNumbers()).toEqual(['Interview #1']);
    expect(container.textContent).not.toContain('Backend Developer');
    expect(container.textContent).toContain('Practice');
  });

  test('filtering never renumbers the interviews', async () => {
    await renderArchive();
    expect(rowNumbers()).toEqual(['Interview #3', 'Interview #2', 'Interview #1']);

    await act(async () => { chip('Job interviews').click(); });

    // #3 is the third interview whatever is filtered. Numbering the
    // filtered list would have called this one #1.
    expect(rowNumbers()).toEqual(['Interview #3']);
  });

  test('each filter shows how many it has', async () => {
    await renderArchive();

    expect(chip('All').textContent).toContain('3');
    expect(chip('Job interviews').textContent).toContain('1');
  });

  test('the selected filter is marked for screen readers', async () => {
    await renderArchive();

    expect(chip('All').getAttribute('aria-pressed')).toBe('true');

    await act(async () => { chip('Exam').click(); });

    expect(chip('Exam').getAttribute('aria-pressed')).toBe('true');
    expect(chip('All').getAttribute('aria-pressed')).toBe('false');
  });

  test('no filter is offered when every interview is the same kind', async () => {
    await renderArchive([HISTORY[2]]);

    // A single row with one kind has nothing to filter.
    expect(container.querySelector('[role="group"]')).toBeNull();
    expect(container.textContent).toContain('Practice');
  });
});

// ---- Interviews from before modes existed -----------------------------

describe('an interview with no mode and no job', () => {
  const { interviewAPI } = require('../services/api');

  const OLD = { sessionId: 's1', score: 0, status: 'completed', completedAt: '2026-09-05T10:00:00' };
  const PRACTICE_ROW = { sessionId: 's2', score: 85, status: 'completed', mode: 'practice', completedAt: '2026-10-24T09:00:00' };
  const JOB_ROW = { sessionId: 's3', score: 94, status: 'completed', mode: 'exam', jobTitle: 'Backend Developer', company: 'ABC', completedAt: '2026-11-03T10:00:00' };

  const renderArchive = async (history) => {
    sessionStorage.clear();
    interviewAPI.history.mockResolvedValue(history);
    await act(async () => { root.render(<Scorecard />); });
  };

  const chip = (label) =>
    [...container.querySelectorAll('button')]
      .find((b) => b.textContent.trim().startsWith(label));

  test('carries no tag, as before', async () => {
    await renderArchive([OLD]);

    expect(container.textContent).not.toContain('Exam');
    expect(container.textContent).not.toContain('Practice');
    expect(container.textContent).not.toContain('Job interview');
  });

  test('is not counted as an exam', async () => {
    await renderArchive([JOB_ROW, PRACTICE_ROW, OLD]);

    // Three rows, but only two of them can honestly be named.
    expect(chip('All').textContent).toContain('3');
    expect(chip('Exam')).toBeUndefined();
  });

  test('is still reachable under All', async () => {
    await renderArchive([JOB_ROW, PRACTICE_ROW, OLD]);

    expect(container.textContent).toContain('Interview #1');
    expect(container.textContent).toContain('Interview #3');
  });
});

// ---- Grading that did not run, and history that would not load ----------

describe('an interview grading could not score', () => {
  const { interviewAPI } = require('../services/api');

  // A failed grading run comes back with zeros in every score field.
  const UNSCORED = {
    session_id: 's-1',
    evaluated: false,
    evaluation_error: 'Scoring failed: google.api_core.exceptions.ResourceExhausted: 429 quota',
    overall_score: 0,
    category_scores: [{ key: 'technical', label: 'Technical', score: 0 }],
    per_question: [],
  };

  const renderArchive = async () => {
    sessionStorage.clear();
    await act(async () => { root.render(<Scorecard />); });
  };

  test('failed grading is never shown as a score of zero', async () => {
    await render(UNSCORED);

    expect(container.textContent).toContain(NOT_SCORED_MESSAGE);
    expect(container.textContent).not.toMatch(/\b0\s*\/\s*100\b/);
    // The stored technical reason stays off the page.
    expect(container.textContent).not.toMatch(/ResourceExhausted|429|Scoring failed/);
  });

  test('a real zero is a graded result, not a grading failure', () => {
    expect(gradingUnavailable({ evaluated: true, overall_score: 0 })).toBe(false);
    expect(gradingUnavailable(UNSCORED)).toBe(true);
  });

  test('history that fails to load is reported, not shown as having no interviews', async () => {
    interviewAPI.history.mockRejectedValue(new ApiError({ kind: 'network', code: 'NETWORK', message: 'x' }));

    await renderArchive();

    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.textContent).not.toContain('No interview to show');
    expect([...container.querySelectorAll('button')].map((b) => b.textContent)).toContain('Try again');
  });

  test('genuinely no interviews shows the empty state', async () => {
    interviewAPI.history.mockResolvedValue([]);

    await renderArchive();

    expect(container.textContent).toContain('No interview to show');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
