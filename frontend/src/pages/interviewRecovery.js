// What the interview page decides after a failed answer submit, kept
// apart from the page so the rules can be tested on their own.

export const MODEL_ANSWER_UNAVAILABLE =
  "We couldn't create an example answer for this question. You can continue with the interview.";

/**
 * Whether a job interview answer reached the server, from the resume
 * endpoint's view of the session.
 *
 * data            the resume response ({ answered, complete, question }),
 *                 or null when the check itself failed
 * submittedIndex  zero-based index of the question that was answered
 * failure         the error from the check, if any
 *
 * Returns
 *   'complete'      every answer is in; only grading is left
 *   'received'      this answer is stored; move to the next question
 *   'not-received'  the server is still on this question; sending the
 *                   same answer again cannot record it twice
 *   'unknown'       the check failed; a resend could duplicate it, so
 *                   it stays blocked
 */
export function submitOutcome(data, submittedIndex, failure = null) {
  if (failure || !data || typeof data !== 'object') return 'unknown';
  if (data.complete) return 'complete';
  const answered = Number(data.answered);
  if (!Number.isInteger(answered)) return 'unknown';
  if (answered > submittedIndex) {
    return data.question && (data.question.question || typeof data.question === 'string')
      ? 'received'
      : 'unknown';
  }
  return 'not-received';
}
