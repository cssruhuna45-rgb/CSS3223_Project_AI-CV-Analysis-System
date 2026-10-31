import React from 'react';
import { createRoot } from 'react-dom/client';
import { act, Simulate } from 'react-dom/test-utils';
import HiringDecisionPanel from './HiringDecisionPanel';
import { applicantsAPI } from '../services/jobApplicationsApi';

jest.mock('../services/jobApplicationsApi', () => ({
  ...jest.requireActual('../services/jobApplicationsApi'),
  applicantsAPI: {
    getDecision: jest.fn(),
    saveDecision: jest.fn(),
    publishDecision: jest.fn(),
  },
}));

const CANDIDATE = { applicationId: 77, candidateName: 'Cara Silva' };

const UNDECIDED = {
  applicationId: 77,
  decision: 'PENDING',
  decisionLabel: 'Awaiting recruiter decision',
  publicationStatus: 'DRAFT',
  published: false,
  readyToPublish: false,
  candidateFeedback: null,
  internalNotes: null,
};

const SAVED_DRAFT = {
  ...UNDECIDED,
  decision: 'SELECTED',
  decisionLabel: 'Selected',
  readyToPublish: true,
  candidateFeedback: 'Congratulations!',
  decidedByName: 'Rita',
};

const PUBLISHED = {
  ...SAVED_DRAFT,
  publicationStatus: 'PUBLISHED',
  published: true,
  readyToPublish: false,
  publishedAt: '2026-02-01T10:00:00',
  internalNotes: 'Strong on Spring.',
};

let container;
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  applicantsAPI.getDecision.mockResolvedValue(UNDECIDED);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.clearAllMocks();
});

async function render(decision) {
  if (decision) applicantsAPI.getDecision.mockResolvedValue(decision);

  await act(async () => {
    root.render(
      <HiringDecisionPanel candidate={CANDIDATE} jobTitle="Backend Developer" />,
    );
  });
}

const button = (text) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === text);

async function click(el) {
  await act(async () => { el.click(); });
}

const feedbackBox = () => container.querySelector('#feedback-77');

// ---- Choosing is not announcing --------------------------------------

test('choosing an option does not save or publish anything', async () => {
  await render();

  await click(button('Selected for job'));

  // The whole point: picking an option tells the candidate nothing.
  expect(applicantsAPI.saveDecision).not.toHaveBeenCalled();
  expect(applicantsAPI.publishDecision).not.toHaveBeenCalled();
});

test('choosing an option offers editable suggested wording', async () => {
  await render();

  expect(feedbackBox().value).toBe('');

  await click(button('Selected for job'));

  expect(feedbackBox().value).toContain('Congratulations');
  expect(feedbackBox().value).toContain('Backend Developer');
  // It is a starting point, not a fixed template.
  expect(feedbackBox().disabled).toBeFalsy();
  expect(feedbackBox().readOnly).toBeFalsy();
});

test('not-selected wording is respectful and does not suggest a rejection notice', async () => {
  await render();

  await click(button('Not selected'));

  const text = feedbackBox().value.toLowerCase();

  expect(text).toContain('thank you');
  expect(text).not.toContain('rejected');
});

test('publish is disabled until a decision has been saved', async () => {
  await render();

  expect(button('Publish decision').disabled).toBe(true);

  await click(button('Selected for job'));

  // Still disabled: choosing is not saving.
  expect(button('Publish decision').disabled).toBe(true);
});

// ---- Saving ----------------------------------------------------------

test('saving sends the decision and says the candidate has not been told', async () => {
  applicantsAPI.saveDecision.mockResolvedValue(SAVED_DRAFT);

  await render();
  await click(button('Selected for job'));
  await click(button('Save draft'));

  expect(applicantsAPI.saveDecision).toHaveBeenCalledWith(77, expect.objectContaining({
    decision: 'SELECTED',
  }));
  expect(container.textContent).toContain('has not been told yet');
  expect(applicantsAPI.publishDecision).not.toHaveBeenCalled();
});

test('saving without choosing is refused in the browser', async () => {
  await render();
  await click(button('Save draft'));

  expect(applicantsAPI.saveDecision).not.toHaveBeenCalled();
  expect(container.querySelector('[role="alert"]').textContent).toContain('Choose whether');
});

test('a refused save is reported', async () => {
  applicantsAPI.saveDecision.mockRejectedValue(
    new Error('This candidate has not completed the interview.'),
  );

  await render();
  await click(button('Selected for job'));
  await click(button('Save draft'));

  expect(container.querySelector('[role="alert"]').textContent)
    .toContain('has not completed the interview');
});

// ---- Publishing ------------------------------------------------------

test('publishing asks for confirmation before anything is announced', async () => {
  await render(SAVED_DRAFT);

  await click(button('Publish decision'));

  expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  expect(container.textContent).toContain('Publish this hiring decision?');
  expect(container.textContent).toContain('final');
  expect(applicantsAPI.publishDecision).not.toHaveBeenCalled();
});

test('confirming publishes and reports that the candidate can see it', async () => {
  applicantsAPI.publishDecision.mockResolvedValue(PUBLISHED);

  await render(SAVED_DRAFT);
  await click(button('Publish decision'));

  const dialog = container.querySelector('[role="dialog"]');
  const confirm = [...dialog.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Publish');

  await click(confirm);

  expect(applicantsAPI.publishDecision).toHaveBeenCalledWith(77);
  // The panel switches to the announced, read-only view.
  expect(container.textContent).toContain('has been notified');
  expect(container.textContent).toContain('cannot be changed here');
  expect(container.querySelector('[role="dialog"]')).toBeNull();
});

test('cancelling the confirmation announces nothing', async () => {
  await render(SAVED_DRAFT);

  await click(button('Publish decision'));

  const dialog = container.querySelector('[role="dialog"]');
  const cancel = [...dialog.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cancel');

  await click(cancel);

  expect(applicantsAPI.publishDecision).not.toHaveBeenCalled();
  expect(container.querySelector('[role="dialog"]')).toBeNull();
});

// ---- Published is final ----------------------------------------------

test('an announced decision offers no way to change it', async () => {
  await render(PUBLISHED);

  expect(button('Selected for job')).toBeUndefined();
  expect(button('Not selected')).toBeUndefined();
  expect(button('Save draft')).toBeUndefined();
  expect(button('Publish decision')).toBeUndefined();
  expect(container.textContent).toContain('cannot be changed here');
});

test('an announced decision shows what the candidate was told', async () => {
  await render(PUBLISHED);

  expect(container.textContent).toContain('Congratulations!');
  expect(container.textContent).toContain('Message the candidate can see');
});

// ---- Private notes ---------------------------------------------------

test('private notes are labelled as never shown to the candidate', async () => {
  await render(PUBLISHED);

  expect(container.textContent).toContain('never shown to the candidate');
  expect(container.textContent).toContain('Strong on Spring.');
});

test('the notes field is separate from the candidate message', async () => {
  await render();

  // Hidden until asked for, so it cannot be typed into by mistake
  // while writing the candidate's message.
  expect(container.querySelector('#notes-77')).toBeNull();

  await click(button('Add private notes'));

  expect(container.querySelector('#notes-77')).not.toBeNull();
});

test('editing the suggested message is what gets sent', async () => {
  applicantsAPI.saveDecision.mockResolvedValue(SAVED_DRAFT);

  await render();
  await click(button('Selected for job'));

  await act(async () => {
    const box = feedbackBox();
    box.value = 'We would love to have you on the team.';
    Simulate.change(box);
  });

  await click(button('Save draft'));

  expect(applicantsAPI.saveDecision).toHaveBeenCalledWith(77, expect.objectContaining({
    candidateFeedback: 'We would love to have you on the team.',
  }));
});

// ---- Nothing decides for the recruiter -------------------------------

test('the panel offers no automatic or score-based decision', async () => {
  await render();

  const labels = [...container.querySelectorAll('button')].map((b) => b.textContent.toLowerCase());

  expect(labels.some((l) => l.includes('auto'))).toBe(false);
  expect(labels.some((l) => l.includes('recommend'))).toBe(false);
  expect(labels.some((l) => l.includes('suggest'))).toBe(false);
});

test('nothing is preselected for the recruiter', async () => {
  await render();

  const selected = button('Selected for job');
  const notSelected = button('Not selected');

  expect(selected.getAttribute('aria-pressed')).toBe('false');
  expect(notSelected.getAttribute('aria-pressed')).toBe('false');
});
