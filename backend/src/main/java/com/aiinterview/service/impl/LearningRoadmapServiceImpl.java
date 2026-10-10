package com.aiinterview.service.impl;

import com.aiinterview.dto.RoadmapGenerateRequestDto;
import com.aiinterview.dto.RoadmapResponseDto;
import com.aiinterview.entity.InterviewSession;
import com.aiinterview.entity.LearningRoadmap;
import com.aiinterview.entity.User;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.repository.LearningRoadmapRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.AiServiceClient;
import com.aiinterview.service.LearningRoadmapService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class LearningRoadmapServiceImpl implements LearningRoadmapService {

    private static final Logger log = LoggerFactory.getLogger(LearningRoadmapServiceImpl.class);

    private final LearningRoadmapRepository roadmapRepository;
    private final UserRepository userRepository;
    private final InterviewSessionRepository sessionRepository;
    private final AiServiceClient aiServiceClient;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public RoadmapResponseDto generateAndSaveRoadmap(String userEmail, RoadmapGenerateRequestDto request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + userEmail));

        enrichFromSession(request);

        log.info("Generating learning roadmap for user {} (role: {}, sessionId: {})",
                userEmail, request.getTargetRole(), request.getSessionId());

        JsonNode requestPayload = objectMapper.valueToTree(request);
        JsonNode aiResponse = aiServiceClient.post("/api/v1/roadmap/generate", requestPayload);

        String title = aiResponse.path("title").asText("14-Day Accelerated Upskilling Roadmap");
        String summary = aiResponse.path("summary").asText("");
        int durationDays = aiResponse.path("duration_days").asInt(request.getDurationDays() != null ? request.getDurationDays() : 14);

        String roadmapJson;
        try {
            roadmapJson = objectMapper.writeValueAsString(aiResponse);
        } catch (Exception e) {
            roadmapJson = aiResponse.toString();
        }

        // Check if a roadmap already exists for this interview session
        LearningRoadmap roadmap = null;
        if (request.getSessionId() != null && !request.getSessionId().isBlank()) {
            roadmap = roadmapRepository.findBySessionIdAndUserEmail(request.getSessionId(), userEmail).orElse(null);
        }

        if (roadmap == null) {
            roadmap = LearningRoadmap.builder()
                    .user(user)
                    .sessionId(request.getSessionId())
                    .targetRole(request.getTargetRole())
                    .jobField(request.getJobField())
                    .title(title)
                    .summary(summary)
                    .durationDays(durationDays)
                    .overallScore(request.getOverallScore())
                    .roadmapJson(roadmapJson)
                    .completedDaysJson("[]")
                    .createdAt(LocalDateTime.now())
                    .build();
        } else {
            roadmap.setTitle(title);
            roadmap.setSummary(summary);
            roadmap.setDurationDays(durationDays);
            roadmap.setTargetRole(request.getTargetRole());
            roadmap.setJobField(request.getJobField());
            roadmap.setOverallScore(request.getOverallScore());
            roadmap.setRoadmapJson(roadmapJson);
            roadmap.setUpdatedAt(LocalDateTime.now());
        }

        LearningRoadmap saved = roadmapRepository.save(roadmap);
        log.info("Saved learning roadmap id={} for user {}", saved.getId(), userEmail);
        return toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<RoadmapResponseDto> getBySessionId(String userEmail, String sessionId) {
        return roadmapRepository.findBySessionIdAndUserEmail(sessionId, userEmail)
                .map(this::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<RoadmapResponseDto> getLatest(String userEmail) {
        return roadmapRepository.findFirstByUserEmailOrderByCreatedAtDesc(userEmail)
                .map(this::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<RoadmapResponseDto> getById(String userEmail, Long id) {
        return roadmapRepository.findByIdAndUserEmail(id, userEmail)
                .map(this::toDto);
    }

    @Override
    @Transactional
    public RoadmapResponseDto updateProgress(String userEmail, Long id, int dayNumber, boolean completed) {
        LearningRoadmap roadmap = roadmapRepository.findByIdAndUserEmail(id, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Roadmap not found with id: " + id));

        Set<Integer> completedSet = new HashSet<>(parseCompletedDays(roadmap.getCompletedDaysJson()));

        if (completed) {
            completedSet.add(dayNumber);
        } else {
            completedSet.remove(dayNumber);
        }

        List<Integer> sorted = new ArrayList<>(completedSet);
        Collections.sort(sorted);

        try {
            roadmap.setCompletedDaysJson(objectMapper.writeValueAsString(sorted));
        } catch (Exception e) {
            log.error("Failed to serialize completed days: {}", e.getMessage());
        }

        roadmap.setUpdatedAt(LocalDateTime.now());
        LearningRoadmap saved = roadmapRepository.save(roadmap);
        return toDto(saved);
    }

    /**
     * Enriches the generation request with stored interview session data if sessionId is provided.
     */
    private void enrichFromSession(RoadmapGenerateRequestDto request) {
        if (request.getSessionId() == null || request.getSessionId().isBlank()) {
            return;
        }

        Optional<InterviewSession> sessionOpt = sessionRepository.findBySessionId(request.getSessionId());
        if (sessionOpt.isEmpty()) {
            return;
        }

        InterviewSession session = sessionOpt.get();

        if (request.getOverallScore() == null && session.getScore() != null) {
            request.setOverallScore(session.getScore());
        }

        if ((request.getTargetRole() == null || request.getTargetRole().isBlank()) && session.getJobDescription() != null) {
            request.setTargetRole(extractRoleFromJobDescription(session.getJobDescription()));
        }

        if (session.getFeedbackJson() != null && !session.getFeedbackJson().isBlank()) {
            try {
                JsonNode feedback = objectMapper.readTree(session.getFeedbackJson());

                if (request.getWeaknesses().isEmpty() && feedback.has("improvements")) {
                    List<String> improvements = new ArrayList<>();
                    feedback.path("improvements").forEach(node -> improvements.add(node.asText()));
                    request.setWeaknesses(improvements);
                }

                if (request.getStrengths().isEmpty() && feedback.has("strengths")) {
                    List<String> strengths = new ArrayList<>();
                    feedback.path("strengths").forEach(node -> strengths.add(node.asText()));
                    request.setStrengths(strengths);
                }

                if (feedback.has("per_question") && request.getPerQuestionFeedback().isEmpty()) {
                    List<Map<String, Object>> pqList = objectMapper.convertValue(
                            feedback.path("per_question"),
                            new TypeReference<List<Map<String, Object>>>() {}
                    );
                    request.setPerQuestionFeedback(pqList);
                }
            } catch (Exception e) {
                log.warn("Could not parse session feedbackJson for roadmap enrichment: {}", e.getMessage());
            }
        }
    }

    private String extractRoleFromJobDescription(String jd) {
        if (jd == null || jd.isBlank()) {
            return "Software Engineer";
        }
        String firstLine = jd.split("\n")[0].trim();
        if (firstLine.length() > 60) {
            return firstLine.substring(0, 60);
        }
        return firstLine.isEmpty() ? "Software Engineer" : firstLine;
    }

    private List<Integer> parseCompletedDays(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<Integer>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private RoadmapResponseDto toDto(LearningRoadmap entity) {
        JsonNode parsedRoadmap = null;
        try {
            if (entity.getRoadmapJson() != null && !entity.getRoadmapJson().isBlank()) {
                parsedRoadmap = objectMapper.readTree(entity.getRoadmapJson());
            }
        } catch (Exception e) {
            log.warn("Could not parse roadmap_json for id={}: {}", entity.getId(), e.getMessage());
        }

        return RoadmapResponseDto.builder()
                .id(entity.getId())
                .sessionId(entity.getSessionId())
                .targetRole(entity.getTargetRole())
                .jobField(entity.getJobField())
                .title(entity.getTitle())
                .summary(entity.getSummary())
                .durationDays(entity.getDurationDays())
                .overallScore(entity.getOverallScore())
                .completedDays(parseCompletedDays(entity.getCompletedDaysJson()))
                .roadmap(parsedRoadmap)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
