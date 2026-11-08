import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import PreviousCvs from './PreviousCvs';
import { resumeAPI } from '../services/api';
import { ApiError } from '../services/http';

// The section lists the candidate's CVs and, when one is opened, the
// skill gap analyses stored against it. The analyses are read, never
// re-run: re-running one is a model call that need not return the same
// skills, so an old analysis must be shown as it was recorded.

jest.mock('../services/api', () => ({
  ...jest.requireActual('../services/api'),
  resumeAPI: { getAll: jest.fn(), getSkillGaps: jest.fn() },
}));

const CVS = [
  {
    id: 7,
    originalFileName: 'cara-cv-2026.pdf',
    fileSize: 182000,
    uploadedAt: '2026-11-01T09:00:00',
  },
  {
    id: 3,
    originalFileName: 'older-cv.pdf',
    fileSize: 96000,
    uploadedAt: '2026-08-14T09:00:00',
  },
];

const ANALYSES = [
  {
    id: 11,
    resumeId: 7,
    jobField: 'backend_development',
    jobFieldName: 'Backend Development',
    matchPercentage: 67,
    gapPercentage: 33,
    summary: 'A moderate skill match for Backend Development.',
    analysedAt: '2026-11-02T10:00:00',
    result: {
      matched_skills: ['Java', 'Spring Boot'],
      missing_skills: ['PostgreSQL'],
      related_skills: ['Docker'],
      additional_skills: [],
    },
  },
  {
    id: 12,
    resumeId: 7,
    jobField: 'frontend_development',
    jobFieldName: 'Frontend Development',
    matchPercentage: 25,
    gapPercentage: 75,
    summary: 'A limited skill match for Frontend Development.',
    analysedAt: '2026-10-30T10:00:00',
    result: { matched_skills: ['Git'], missing_skills: ['React'] },
  },
];

let container;
let root;

beforeEach(() => {
  jest.clearAllMocks();
  resumeAPI.getAll.mockResolvedValue(CVS);
  resumeAPI.getSkillGaps.mockResolvedValue(ANALYSES);

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function render(props = {}) {
  await act(async () => {
    root.render(<PreviousCvs {...props} />);
  });
}

function buttonContaining(text) {
  const match = Array.from(container.querySelectorAll('button'))
    .find((b) => b.textContent.includes(text));

  if (!match) throw new Error(`no button containing "${text}"`);

  return match;
}

async function click(element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('listing the candidate\'s CVs', () => {

  test('shows every upload, newest first', async () => {
    await render();

    expect(container.textContent).toContain('cara-cv-2026.pdf');
    expect(container.textContent).toContain('older-cv.pdf');

    const text = container.textContent;
    expect(text.indexOf('cara-cv-2026.pdf')).toBeLessThan(text.indexOf('older-cv.pdf'));
  });

  test('marks the CV the page is currently showing', async () => {
    await render({ currentResumeId: '7' });

    // The id arrives from sessionStorage as a string and the API
    // returns a number, so the two are compared as strings.
    const current = buttonContaining('cara-cv-2026.pdf');
    expect(current.textContent).toContain('Current');

    expect(buttonContaining('older-cv.pdf').textContent).not.toContain('Current');
  });

  test('stays out of the way when there are no CVs', async () => {
    resumeAPI.getAll.mockResolvedValue([]);

    await render();

    expect(container.textContent).toBe('');
  });
});

describe('opening a CV', () => {

  test('asks for its analyses only when it is opened', async () => {
    await render();

    // A candidate who came to upload pays for the list and nothing
    // else.
    expect(resumeAPI.getSkillGaps).not.toHaveBeenCalled();

    await click(buttonContaining('cara-cv-2026.pdf'));

    expect(resumeAPI.getSkillGaps).toHaveBeenCalledWith(7);
  });

  test('lists the fields that CV has been compared with', async () => {
    await render();
    await click(buttonContaining('cara-cv-2026.pdf'));

    expect(container.textContent).toContain('Backend Development');
    expect(container.textContent).toContain('67%');
    expect(container.textContent).toContain('Frontend Development');
    expect(container.textContent).toContain('25%');
  });

  test('does not ask again when the same CV is reopened', async () => {
    await render();

    const row = buttonContaining('cara-cv-2026.pdf');

    await click(row);
    await click(row);
    await click(row);

    expect(resumeAPI.getSkillGaps).toHaveBeenCalledTimes(1);
  });

  test('says so when a CV has never been compared', async () => {
    resumeAPI.getSkillGaps.mockResolvedValue([]);

    await render();
    await click(buttonContaining('older-cv.pdf'));

    expect(container.textContent).toMatch(/hasn't been compared/i);
  });

  test('reports a failure against that CV without losing the list', async () => {
    resumeAPI.getSkillGaps.mockRejectedValue(new ApiError({
      status: 500, code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our side. Please try again in a moment.',
    }));

    await render();
    await click(buttonContaining('cara-cv-2026.pdf'));

    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.textContent).toContain('older-cv.pdf');
  });
});

describe('opening one analysis', () => {

  test('shows the skills behind the percentage', async () => {
    await render();
    await click(buttonContaining('cara-cv-2026.pdf'));

    // Closed to begin with: the page already carries a full analysis
    // of the current CV above this section.
    expect(container.textContent).not.toContain('Spring Boot');

    await click(buttonContaining('Backend Development'));

    expect(container.textContent).toContain('Spring Boot');
    expect(container.textContent).toContain('PostgreSQL');
    expect(container.textContent).toContain('Docker');
  });

  test('an analysis whose snapshot is missing still lists', async () => {
    // The stored snapshot could not be parsed, so the server sent the
    // columns without it. The row is still worth showing.
    resumeAPI.getSkillGaps.mockResolvedValue([
      { ...ANALYSES[0], result: null },
    ]);

    await render();
    await click(buttonContaining('cara-cv-2026.pdf'));

    expect(container.textContent).toContain('Backend Development');
    expect(container.textContent).toContain('67%');

    // Nothing to expand into, so the control does not invite a click.
    expect(buttonContaining('Backend Development').disabled).toBe(true);
  });
});
