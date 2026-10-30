import { statusTone, matchLabel, matchTone, STATUS_TONES } from './jobApplicationsApi';

// The display rules the applicant list and the status page both read.
// Pure functions, so these pin down the two decisions that actually
// matter: a missing match must not read as a bad one, and a status must
// never be shown without a colour that means the same thing.

describe('matchLabel', () => {

  test('a percentage is shown as a percentage', () => {
    expect(matchLabel(75)).toBe('75%');
  });

  test('zero is a real result and is shown as zero', () => {
    expect(matchLabel(0)).toBe('0%');
  });

  test('a missing match reads "Not available", never 0%', () => {
    // A zero would tell the recruiter this candidate matched nothing,
    // when in fact nothing was computed.
    expect(matchLabel(null)).toBe('Not available');
    expect(matchLabel(undefined)).toBe('Not available');
  });
});

describe('matchTone', () => {

  test('a strong match is success, a weak one is danger', () => {
    expect(matchTone(100)).toBe('success');
    expect(matchTone(80)).toBe('success');
    expect(matchTone(60)).toBe('info');
    expect(matchTone(40)).toBe('warning');
    expect(matchTone(39)).toBe('danger');
    expect(matchTone(0)).toBe('danger');
  });

  test('a missing match is neutral, not alarming', () => {
    expect(matchTone(null)).toBe('neutral');
    expect(matchTone(undefined)).toBe('neutral');
  });
});

describe('statusTone', () => {

  test('every application status has a tone', () => {
    ['APPLIED', 'SHORTLISTED', 'REJECTED', 'INTERVIEWED']
      .forEach((status) => expect(STATUS_TONES[status]).toBeDefined());
  });

  test('shortlisted reads as good news and rejected as bad', () => {
    expect(statusTone('SHORTLISTED')).toBe('success');
    expect(statusTone('REJECTED')).toBe('danger');
    expect(statusTone('APPLIED')).toBe('info');
  });

  test('an unknown status falls back to neutral rather than breaking', () => {
    expect(statusTone('SOMETHING_NEW')).toBe('neutral');
    expect(statusTone(undefined)).toBe('neutral');
  });
});
