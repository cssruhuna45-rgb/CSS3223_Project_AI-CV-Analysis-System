package com.aiinterview.service;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Keeps a skill gap analysis so the candidate can look at it again.
 *
 * <p>Called by {@code AiProxyController} after the AI service answers,
 * with the request that was forwarded and the response that came back.
 * Best effort, for the same reason interview recording is: the
 * candidate is already looking at their result, and a database problem
 * must not take it away from them.
 */
public interface SkillGapPersistenceService {

    /**
     * Stores the analysis against the CV it was run on.
     *
     * <p>Writes nothing unless the request names a resume the caller
     * owns. The resume id travels through the browser, so on its own
     * it is not permission to write a row against somebody else's CV -
     * and {@code CVUpload} has been seen to send a {@code Date.now()}
     * value when an upload returns no id, which belongs to no CV at
     * all.
     *
     * @param userEmail  authenticated user, from the JWT subject
     * @param request    body forwarded to the AI service
     * @param aiResponse body the AI service returned
     */
    void record(String userEmail, JsonNode request, JsonNode aiResponse);
}
