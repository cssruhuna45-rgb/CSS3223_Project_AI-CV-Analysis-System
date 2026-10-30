package com.aiinterview.service;

import com.aiinterview.dto.CandidateFinalResultDto;
import com.aiinterview.dto.HiringDecisionDto;
import com.aiinterview.dto.HiringDecisionRequestDto;

/**
 * The recruiter's final answer on an interviewed candidate, and the
 * candidate's view of it once announced.
 *
 * <p>Two rules shape everything here.
 *
 * <p><strong>A person decides.</strong> No method derives a decision
 * from an interview score, a CV match or anything else the system
 * computed. The recruiter chooses; this records the choice.
 *
 * <p><strong>Saving is not announcing.</strong> A draft is private to
 * the owning recruiter - the candidate's own endpoint cannot load one
 * at all - and publishing is a separate call, so choosing an option
 * never tells the candidate anything by itself.
 */
public interface HiringDecisionService {

    // ---- Recruiter ------------------------------------------------

    /**
     * The decision for one of the recruiter's own applications, or an
     * undecided placeholder when none has been started.
     *
     * @throws com.aiinterview.exception.ResourceNotFoundException when
     *         the application is not on one of this recruiter's jobs
     */
    HiringDecisionDto getForRecruiter(String recruiterEmail, Long applicationId);

    /**
     * Creates or updates the private draft.
     *
     * <p>Refused unless the candidate actually finished the interview:
     * the application must be INTERVIEWED and have a completed
     * interview attempt behind it. A published decision is not
     * overwritten here - correcting one is a deliberate, audited act,
     * not a silent save.
     *
     * @throws com.aiinterview.exception.ResourceNotFoundException when
     *         the application is not this recruiter's
     * @throws com.aiinterview.exception.ConflictException when the
     *         candidate has not completed the interview, or the
     *         decision is already published
     */
    HiringDecisionDto saveDraft(
            String recruiterEmail,
            Long applicationId,
            HiringDecisionRequestDto request
    );

    /**
     * Announces the saved decision to the candidate and notifies them.
     *
     * <p>Idempotent: publishing an already-published decision returns
     * it unchanged and creates no second notification, so a repeated
     * request or a double-clicked button is harmless.
     *
     * @throws com.aiinterview.exception.ConflictException when there is
     *         no decision to publish, or it is still PENDING
     */
    HiringDecisionDto publish(String recruiterEmail, Long applicationId);

    // ---- Candidate ------------------------------------------------

    /**
     * The candidate's own final result for one of their applications.
     *
     * <p>Only published decisions are ever loaded, so a draft is not
     * hidden by the response shape - it is never read. The result
     * carries no internal recruiter notes and nothing about any other
     * candidate.
     *
     * @throws com.aiinterview.exception.ResourceNotFoundException when
     *         the application is not this candidate's
     */
    CandidateFinalResultDto getFinalResult(String candidateEmail, Long applicationId);
}
