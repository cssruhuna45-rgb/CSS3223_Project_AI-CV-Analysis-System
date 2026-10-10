package com.aiinterview.service;

import com.aiinterview.dto.RoadmapGenerateRequestDto;
import com.aiinterview.dto.RoadmapResponseDto;

import java.util.Optional;

public interface LearningRoadmapService {

    /**
     * Generates a 14-day roadmap via the AI service and persists it for the candidate.
     * If request.sessionId is provided, interview feedback and session details are
     * automatically used to enrich the roadmap generation.
     */
    RoadmapResponseDto generateAndSaveRoadmap(String userEmail, RoadmapGenerateRequestDto request);

    /**
     * Retrieves the stored roadmap associated with a given interview session ID.
     */
    Optional<RoadmapResponseDto> getBySessionId(String userEmail, String sessionId);

    /**
     * Retrieves the signed-in candidate's latest learning roadmap.
     */
    Optional<RoadmapResponseDto> getLatest(String userEmail);

    /**
     * Retrieves a learning roadmap by its database ID.
     */
    Optional<RoadmapResponseDto> getById(String userEmail, Long id);

    /**
     * Toggles or marks completion for a specific day in the 14-day roadmap.
     */
    RoadmapResponseDto updateProgress(String userEmail, Long id, int dayNumber, boolean completed);
}
