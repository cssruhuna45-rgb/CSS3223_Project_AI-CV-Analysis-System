package com.aiinterview.service;

import com.aiinterview.dto.JobInviteDto;
import com.aiinterview.dto.JobPostingDto;
import com.aiinterview.dto.JobPostingRequestDto;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;
import java.util.Optional;

/**
 * Jobs, their invite codes, and how a code turns an interview into one
 * a recruiter may see.
 */
public interface JobPostingService {

    // ---- Recruiter ------------------------------------------------

    JobPostingDto create(String recruiterEmail, JobPostingRequestDto request);

    List<JobPostingDto> listMine(String recruiterEmail);

    /** Open or close one of the recruiter's own jobs. */
    JobPostingDto setOpen(String recruiterEmail, Long jobId, boolean open);

    // ---- Candidate ------------------------------------------------

    /** The job behind an invite code, for the candidate to read first. */
    JobInviteDto previewInvite(String candidateEmail, String inviteCode);

    /**
     * The interview start request to forward to the AI service.
     *
     * <p>Without an invite code the request is returned unchanged. With
     * one, the code is checked and the job description, job field and
     * mode are replaced with the job's own, so a candidate cannot be
     * interviewed against an easier text while their result is filed
     * under this job. The job's approved questions are added as
     * {@code fixed_questions} and the CV fields are emptied, so every
     * candidate is asked the same questions. A job whose questions are
     * not approved is refused as not ready. Without a code, any
     * {@code fixed_questions} the browser sent are removed.
     */
    JsonNode applyInvite(String candidateEmail, JsonNode startRequest);

    /**
     * Refuses an expected-answer request made while the user is sitting
     * a job interview: for that interview's session, or for any while
     * one of theirs is still running.
     *
     * @throws com.aiinterview.exception.UnauthorizedAccessException when
     *         a job interview is in progress
     */
    void requireNoJobInterviewInProgress(String userEmail, JsonNode modelAnswerRequest);

    /** Normalised form of what a person typed, or empty if it cannot be a code. */
    Optional<String> normalizeCode(String raw);
}
