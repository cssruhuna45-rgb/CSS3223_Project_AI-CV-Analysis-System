import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import SkillGap from './SkillGap';
import { skillGapAPI } from '../services/api';

// Picking a second job field does not cancel the first analysis, so two
// requests can be in flight at once and can finish in either order.
// Before the latest-request guard, whichever finished LAST wrote the
// page and sessionStorage - so a slow earlier response could leave the
// candidate looking at one role's gaps under another role's name, and
// send that wrong role into the interview through `jobRole`.

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../services/api', () => ({
  ...jest.requireActual('../services/api'),
  skillGapAPI: { analyze: jest.fn() },
}));

const analysis = (fieldId, name, matchPct) => ({
  job_field: fieldId,
  job_field_name: name,
  match_percentage: matchPct,
  gap_percentage: 100 - matchPct,
  matched_skills: [],
  missing_skills: [],
  related_skills: [],
  additional_skills: [],
  summary: `${name} summary`,
});

/** A promise plus the handles to settle it whenever the test likes. */
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

let container;
let root;

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();

  // The page reads its inputs from sessionStorage on first render.
  sessionStorage.setItem('resumeId', '7');
  sessionStorage.setItem(
    'resumeText',
    'Java, Spring Boot, PostgreSQL, Docker and a good deal of REST API work.'
  );
  sessionStorage.setItem('selectedJobField', 'backend_development');

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  sessionStorage.clear();
});

async function render() {
  await act(async () => {
    root.render(<SkillGap />);
  });
}

function buttonLabelled(text) {
  const match = Array.from(container.querySelectorAll('button'))
    .find((b) => b.textContent.trim() === text);

  if (!match) throw new Error(`no button labelled "${text}"`);

  return match;
}

async function click(element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

/** Switches the page to another field through its own selector. */
async function chooseField(name) {
  await click(buttonLabelled('Change Career Field'));
  await click(buttonLabelled(name));
}

describe('two analyses in flight at once', () => {

  test('a slow earlier response does not overwrite the newest field', async () => {
    const first = deferred();
    const second = deferred();

    skillGapAPI.analyze
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    await render();

    expect(skillGapAPI.analyze).toHaveBeenCalledTimes(1);
    expect(skillGapAPI.analyze.mock.calls[0][1]).toBe('backend_development');

    await chooseField('Frontend Development');

    expect(skillGapAPI.analyze).toHaveBeenCalledTimes(2);
    const secondField = skillGapAPI.analyze.mock.calls[1][1];

    // The newer request finishes first...
    await act(async () => {
      second.resolve(analysis(secondField, 'Frontend Development', 71));
    });

    // ...and the older one arrives afterwards, carrying the field the
    // candidate has already moved away from.
    await act(async () => {
      first.resolve(analysis('backend_development', 'Backend Development', 44));
    });

    expect(sessionStorage.getItem('selectedJobField')).toBe(secondField);
    expect(sessionStorage.getItem('selectedJobFieldName')).toBe('Frontend Development');
    expect(sessionStorage.getItem('jobRole')).toBe('Frontend Development');
    expect(sessionStorage.getItem('jobDescription')).toContain('Frontend Development');

    // The page shows the newest role's numbers, not the stale ones.
    expect(container.textContent).not.toContain('Backend Development summary');
  });

  test('a superseded failure does not put an error on the newest field', async () => {
    const first = deferred();
    const second = deferred();

    skillGapAPI.analyze
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    await render();
    await chooseField('Frontend Development');

    const secondField = skillGapAPI.analyze.mock.calls[1][1];

    await act(async () => {
      second.resolve(analysis(secondField, 'Frontend Development', 71));
    });

    await act(async () => {
      first.reject(new Error('the abandoned request timed out'));
    });

    // The abandoned request's failure is not the current field's
    // problem, so the page must not report it.
    expect(container.textContent).not.toMatch(/couldn't compare|try again/i);
    expect(sessionStorage.getItem('jobRole')).toBe('Frontend Development');
  });

  test('a superseded request does not clear the spinner', async () => {
    const first = deferred();
    const second = deferred();

    skillGapAPI.analyze
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    await render();
    await chooseField('Frontend Development');

    // The older request settles while the newer one is still running.
    await act(async () => {
      first.resolve(analysis('backend_development', 'Backend Development', 44));
    });

    // The page is still waiting for the field it is actually showing.
    expect(container.textContent).toContain('Calculating your skill gap');
  });
});
