package com.aiinterview.service;

import com.aiinterview.dto.CandidateApplicationDto;
import com.aiinterview.dto.JobApplicationRequestDto;

import java.util.List;

/**
 * The candidate's side of a job application: applying, and following
 * what happened to it.
 *
 * <p>Every method takes the candidate's email from the authenticated
 * token. Nothing here accepts a candidate id from a caller, so one
 * account can never apply as, or read the applications of, another.
 */
public interface JobApplicationService {

    /**
     * Applies for a job with one of the candidate's own CVs.
     *
     * <p>Refused unless the account is a candidate, the job is open and
     * ready for applications, the CV belongs to this candidate, consent
     * was given, and they have not already applied. The chosen CV and
     * the analysis behind it are copied onto the application as
     * evidence, and the deterministic skill match is computed once,
     * here.
     *
     * @throws com.aiinterview.exception.BadRequestException when the
     *         account may not apply, consent is missing, or the job has
     *         no required skills to match against
     * @throws com.aiinterview.exception.ResourceNotFoundException when
     *         the job is unavailable or the CV is not this candidate's
     * @throws com.aiinterview.exception.ConflictException when they
     *         have already applied for this job
     */
    CandidateApplicationDto apply(
            String candidateEmail,
            Long jobId,
            JobApplicationRequestDto request
    );

    /** The candidate's own applications, newest first. */
    List<CandidateApplicationDto> listMine(String candidateEmail);

    /**
     * One of the candidate's own applications.
     *
     * @throws com.aiinterview.exception.ResourceNotFoundException when
     *         the application is not this candidate's, so somebody
     *         else's id reveals nothing
     */
    CandidateApplicationDto getMine(String candidateEmail, Long applicationId);
}
