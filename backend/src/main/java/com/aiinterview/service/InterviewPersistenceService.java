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
     * Refuses a request that names an interview session belonging to
     * somebody else.
     *
     * <p>Unlike everything below, this is a gate rather than a write,
     * and it is meant to run <em>before</em> the AI service is called.
     * The recording methods already decline to write into a session the
     * caller does not own, but by the time they run the AI has already
     * answered: a candidate who guessed another candidate's session id
     * would still be handed the next question, the grade, or the final
     * scorecard, with only a log line to show for it.
     *
     * <p>A session id the database does not know is allowed through. It
     * is the normal case for interviews that began before the session
     * was persisted, and failing those closed would break a running
     * interview to guard data that was never stored.
     *
     * @param userEmail authenticated user, from the JWT subject
     * @param request   body about to be forwarded to the AI service
     * @throws com.aiinterview.exception.UnauthorizedAccessException
     *         if the session is stored and another user owns it
     */
    void requireSessionOwnership(String userEmail, JsonNode request);

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
