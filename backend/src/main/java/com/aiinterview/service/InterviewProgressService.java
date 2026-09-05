package com.aiinterview.service;

import com.aiinterview.dto.InterviewHistoryItemDto;
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
}
