package com.aiinterview.service;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Writes the durable copy of an interview as it happens.
 *
 * <p>Called by {@code AiProxyController} after each AI call returns,
 * with the request that was forwarded and the response that came back.
 * Every method is best effort: the interview is already in progress by
 * the time it runs, and a database problem must not take a successful
 * AI response away from the candidate.
 *
 * <p>The AI service owns the live session and keeps its own in-memory
 * state; nothing here writes back to it.
 */
public interface InterviewPersistenceService {

    /**
     * Creates the session row and stores the first question.
     *
     * @param userEmail  authenticated user, from the JWT subject
     * @param request    body forwarded to the AI service
     * @param aiResponse body the AI service returned
     */
    void recordStart(String userEmail, JsonNode request, JsonNode aiResponse);

    /**
     * Stores the candidate's answer against the question it belongs
     * to, then appends the next question as a new turn.
     */
    void recordAnswer(String userEmail, JsonNode request, JsonNode aiResponse);

    /**
     * Marks the session completed and stores the final scorecard.
     */
    void recordFinish(String userEmail, JsonNode request, JsonNode aiResponse);
}
