import { submitOutcome } from './interviewRecovery';

// After a job interview answer fails to send, the page asks the server
// how many answers it holds before allowing the same answer again. A
// wrong call here either records an answer twice (against the next
// question) or loses one, and a job interview has a single attempt.

describe('submitOutcome', () => {

  test('the server is past this question: the answer arrived, so it is not sent again', () => {
    expect(submitOutcome({ answered: 3, complete: false, question: { question: 'Q4?' } }, 2)).toBe('received');
  });

  test('the server is still on this question: resending cannot duplicate it', () => {
    expect(submitOutcome({ answered: 2, complete: false, question: { question: 'Q3?' } }, 2)).toBe('not-received');
  });

  test('every answer is in: only grading is left', () => {
    expect(submitOutcome({ answered: 5, complete: true }, 4)).toBe('complete');
  });

  test('the check itself failed: the outcome stays unknown and resending stays blocked', () => {
    expect(submitOutcome(null, 2, new Error('offline'))).toBe('unknown');
    expect(submitOutcome({ complete: false }, 2)).toBe('unknown');
  });

  test('an arrived answer without a next question is not treated as safe to move on', () => {
    expect(submitOutcome({ answered: 3, complete: false }, 2)).toBe('unknown');
  });
});
