package com.aiinterview.service;

import com.aiinterview.dto.InterviewHistoryItemDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.aiinterview.dto.InterviewProgressResponse;

import java.util.List;

/**
 * Reads a candidate's own interview record out of the database.
 *
 * <p>Both methods take the authenticated user's email rather than a
 * user id, so a caller cannot ask for somebody else's interviews.
 */
public interface InterviewProgressService {

    /**
     * Completed interviews, newest first.
     */
    List<InterviewHistoryItemDto> getHistory(String userEmail);

    /**
     * Completed interviews with the score comparison across them.
     */
    InterviewProgressResponse getProgress(String userEmail);

    /**
     * The stored scorecard for one interview, so a candidate can reopen
     * a result they have already seen.
     *
     * <p>Returned as the AI service's own finish payload, which is what
     * was stored and what the scorecard page already renders. Scoped by
     * email like the rest: asking for a session belonging to somebody
     * else is refused, not merely empty.
     */
    JsonNode getScorecard(
            String userEmail,
            String sessionId
    );
}
