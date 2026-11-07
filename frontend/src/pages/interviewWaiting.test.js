import { shouldWaitForNextQuestion } from './InterviewRoom';

// An exam answers one question at a time and generates the next one on
// submit, so there is a gap with nothing in it. The page used to leave
// the question that had just been answered on screen with the box
// greyed out, which reads as a frozen form rather than as work in
// progress.
//
// What can go wrong here is the decision, not the markup: leaving the
// screen up through the finish, putting it over a practice interview
// that is not waiting for anything, or covering an empty page before
// the first question exists.

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
}));

const waiting = {
  isExam: true,
  submittingAnswer: true,
  question: 'How does a database index speed up a SELECT?',
  isFinishing: false,
};

describe('waiting for the next exam question', () => {

  test('an answer is with the server and the next question is not back', () => {
    expect(shouldWaitForNextQuestion(waiting)).toBe(true);
  });

  test('nothing is in flight, so there is nothing to wait for', () => {
    expect(shouldWaitForNextQuestion({ ...waiting, submittingAnswer: false })).toBe(false);
  });

  test('a practice interview does not wait here', () => {
    // It shows the model answer for the question just answered and
    // moves on when the candidate clicks Next.
    expect(shouldWaitForNextQuestion({ ...waiting, isExam: false })).toBe(false);
  });

  test('the last answer leaves this screen to the finishing one', () => {
    // Both would otherwise be up at once, the finishing one on top.
    expect(shouldWaitForNextQuestion({ ...waiting, isFinishing: true })).toBe(false);
  });

  test('before the first question arrives, the first-question screen owns the page', () => {
    expect(shouldWaitForNextQuestion({ ...waiting, question: '' })).toBe(false);
    expect(shouldWaitForNextQuestion({ ...waiting, question: null })).toBe(false);
    expect(shouldWaitForNextQuestion({ ...waiting, question: undefined })).toBe(false);
  });

  test('always a boolean, never a falsy question value', () => {
    // It drives a JSX guard, and returning '' there would render the
    // empty string rather than nothing.
    expect(shouldWaitForNextQuestion({ ...waiting, question: '' })).toBe(false);
    expect(typeof shouldWaitForNextQuestion(waiting)).toBe('boolean');
  });
});
