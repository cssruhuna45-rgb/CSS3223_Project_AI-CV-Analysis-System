package com.aiinterview.service;

import com.aiinterview.dto.ApplicantDetailDto;
import com.aiinterview.dto.ApplicantSummaryDto;
import com.aiinterview.dto.ApplicationDecisionRequestDto;
import com.aiinterview.dto.JobComparisonDto;

import java.util.List;

/**
 * The recruiter's side of applications: reviewing them, deciding on
 * them, and comparing the candidates who went on to interview.
 *
 * <p>Every method is scoped by the recruiter from the token, and the
 * scoping is part of the query rather than a check after loading. A job
 * or application belonging to someone else is simply "not found", so
 * guessing ids reveals neither another recruiter's candidates nor the
 * fact that the id exists at all.
 *
 * <p>Nothing here decides anything. A match percentage is shown to a
 * recruiter and a comparison is laid out for them to read; shortlisting
 * and rejecting happen only when a recruiter asks for them.
 */
public interface RecruiterApplicationService {

    /**
     * The applicants for one of the recruiter's own jobs, best CV match
     * first, with applications whose match is unknown last.
     *
     * @throws com.aiinterview.exception.ResourceNotFoundException when
     *         the job is not this recruiter's
     */
    List<ApplicantSummaryDto> listApplicants(String recruiterEmail, Long jobId);

    /**
     * One applicant in full: their CV analysis snapshot as it was when
     * they applied, beside the job's requirements.
     *
     * @throws com.aiinterview.exception.ResourceNotFoundException when
     *         the application is not on one of this recruiter's jobs
     */
    ApplicantDetailDto getApplicant(String recruiterEmail, Long applicationId);

    /**
     * Shortlists or rejects an applicant.
     *
     * <p>Only SHORTLISTED and REJECTED are accepted, only from APPLIED,
     * and only by the recruiter who owns the job. The actor and the
     * time are recorded. Re-sending a decision an application already
     * has returns it unchanged rather than failing, so a double-clicked
     * button is harmless; changing a decision that has been made is
     * refused.
     *
     * @throws com.aiinterview.exception.BadRequestException when the
     *         decision is not one a recruiter may make
     * @throws com.aiinterview.exception.ConflictException when the
     *         application has already been decided or interviewed
     */
    ApplicantSummaryDto decide(
            String recruiterEmail,
            Long applicationId,
            ApplicationDecisionRequestDto request
    );

    /**
     * Every completed assessment for one of the recruiter's jobs, side
     * by side, aligned on the job's approved questions.
     *
     * <p>Scores and per-question grading are read from the stored
     * scorecards. Nothing is recomputed: the grading is the interview
     * service's, and a second derivation of it would give the recruiter
     * two disagreeing numbers for one answer.
     *
     * @throws com.aiinterview.exception.ResourceNotFoundException when
     *         the job is not this recruiter's
     */
    JobComparisonDto compare(String recruiterEmail, Long jobId);
}
