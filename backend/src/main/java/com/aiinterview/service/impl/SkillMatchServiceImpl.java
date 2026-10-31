package com.aiinterview.service.impl;

import com.aiinterview.service.AiServiceClient;
import com.aiinterview.service.SkillMatchService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SkillMatchServiceImpl implements SkillMatchService {

    private static final Logger log =
            LoggerFactory.getLogger(SkillMatchServiceImpl.class);

    /**
     * The AI service's deterministic matcher. Not
     * {@code /skill-gap/analyze}, which reads CV text with Gemini and
     * scores against the catalogue's job field rather than this
     * recruiter's requirements.
     */
    private static final String MATCH_PATH = "/api/v1/skill-gap/match";

    private final AiServiceClient aiServiceClient;

    private final ObjectMapper objectMapper;

    @Override
    public SkillMatchResult match(
            List<String> requiredSkills,
            List<String> candidateSkills
    ) {

        if (requiredSkills == null || requiredSkills.isEmpty()) {
            // The caller is meant to refuse the application before
            // this point; reaching here means a job with no stated
            // requirements, which cannot be matched against.
            log.warn("Skill match asked for with no required skills");
            return SkillMatchResult.unavailable();
        }

        ObjectNode request = objectMapper.createObjectNode();

        request.set("required_skills", toArray(requiredSkills));
        request.set("candidate_skills", toArray(candidateSkills));

        try {

            JsonNode response = aiServiceClient.post(MATCH_PATH, request);

            return new SkillMatchResult(
                    intOrNull(response, "match_percentage"),
                    intOrNull(response, "required_skill_count"),
                    strings(response, "matched_skills"),
                    strings(response, "related_skills"),
                    strings(response, "missing_skills")
            );

        } catch (Exception e) {

            // The application itself is still worth recording. The
            // match is decision support, and a recruiter can read the
            // CV analysis snapshot and decide without it - whereas
            // refusing the application would cost the candidate their
            // place over an infrastructure problem.
            log.warn(
                    "Could not compute skill match over {} required skills: {}",
                    requiredSkills.size(),
                    e.getMessage()
            );

            return SkillMatchResult.unavailable();
        }
    }

    // ========================================================
    // Internals
    // ========================================================

    private ArrayNode toArray(List<String> values) {

        ArrayNode array = objectMapper.createArrayNode();

        for (String value : values == null ? List.<String>of() : values) {
            if (value != null && !value.isBlank()) {
                array.add(value);
            }
        }

        return array;
    }

    /**
     * Null rather than 0 for a missing or non-numeric field, so an
     * unreadable response is never stored as a real 0% result.
     */
    private static Integer intOrNull(JsonNode node, String field) {

        JsonNode value = node == null ? null : node.get(field);

        return value == null || !value.isNumber() ? null : value.asInt();
    }

    private static List<String> strings(JsonNode node, String field) {

        JsonNode array = node == null ? null : node.get(field);

        if (array == null || !array.isArray()) {
            return List.of();
        }

        List<String> values = new ArrayList<>(array.size());

        for (JsonNode element : array) {
            if (element != null && element.isTextual() && !element.asText().isBlank()) {
                values.add(element.asText());
            }
        }

        return values;
    }
}
