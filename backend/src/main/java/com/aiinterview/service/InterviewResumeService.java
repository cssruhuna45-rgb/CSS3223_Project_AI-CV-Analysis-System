package com.aiinterview.service;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Picks a job interview up where the candidate left it.
 *
 * <p>A candidate gets one attempt at a job's interview, so starting
 * again after a reload is refused. Without this, a refreshed page or a
 * closed tab ended the attempt for good: the interview stayed "in
 * progress" and could never be finished or retaken.
 *
 * <p>Only job interviews can be resumed. Their questions are approved
 * and can no longer change, so the AI service can rebuild an expired
 * session from the answers stored here. A practice interview's
 * questions were generated one at a time, and the candidate can simply
 * start another.
 */
public interface InterviewResumeService {

    /**
     * Returns the question the candidate is on, or says every question
     * is answered so the page can finish the interview.
     *
     * <p>The same rules as the applications page's Resume button: the
     * candidate's own session, for a job interview, still under way,
     * with the application still shortlisted and the job still open.
     *
     * @return the AI service's resume response - session_id, question,
     *         answered, total_questions, complete - plus the job's
     *         title and company for the page heading
     *
     * @throws com.aiinterview.exception.ResourceNotFoundException when
     *         there is no such interview
     * @throws com.aiinterview.exception.UnauthorizedAccessException
     *         when it belongs to somebody else
     * @throws com.aiinterview.exception.BadRequestException when it is
     *         a practice interview
     * @throws com.aiinterview.exception.ConflictException when it is
     *         finished or may no longer be continued
     */
    JsonNode resume(String userEmail, String sessionId);
}
