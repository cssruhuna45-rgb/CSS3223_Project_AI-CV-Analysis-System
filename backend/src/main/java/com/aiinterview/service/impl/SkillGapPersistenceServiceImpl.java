package com.aiinterview.service.impl;

import com.aiinterview.entity.Resume;
import com.aiinterview.entity.SkillGapAnalysis;
import com.aiinterview.entity.User;
import com.aiinterview.repository.ResumeRepository;
import com.aiinterview.repository.SkillGapAnalysisRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.SkillGapPersistenceService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Stores skill gap analyses as the AI service returns them.
 *
 * <p>A separate bean with its own transaction, for the same reason
 * {@code InterviewPersistenceServiceImpl} is one: when a best-effort
 * write shares the caller's transaction, a failed insert marks that
 * transaction rollback-only, the caller catches the exception and
 * carries on, and the commit then fails with "Transaction silently
 * rolled back" - turning a survivable persistence problem into a
 * failed request.
 *
 * <p>Nothing here throws at the caller on purpose: it either records
 * what it was given or logs why it could not.
 */
@Service
@RequiredArgsConstructor
public class SkillGapPersistenceServiceImpl implements SkillGapPersistenceService {

    private static final Logger log =
            LoggerFactory.getLogger(SkillGapPersistenceServiceImpl.class);

    /** Matches the column, and the AI service's own field identifiers. */
    private static final int MAX_FIELD = 64;

    private static final int MAX_FIELD_NAME = 128;

    private final SkillGapAnalysisRepository skillGapAnalysisRepository;
    private final ResumeRepository resumeRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public void record(String userEmail, JsonNode request, JsonNode aiResponse) {

        if (aiResponse == null || !aiResponse.isObject()) {
            log.warn("Skill gap response was not an object; nothing to persist");
            return;
        }

        String jobField = clip(text(aiResponse, "job_field"), MAX_FIELD);

        if (jobField == null) {
            // Without the field there is nothing to file the row under,
            // and the unique constraint has no second column.
            log.warn("Skill gap response carried no job_field; nothing to persist");
            return;
        }

        Resume resume = ownedResume(userEmail, request, aiResponse);

        if (resume == null) return;

        Integer match = integer(aiResponse, "match_percentage");
        Integer gap = integer(aiResponse, "gap_percentage");

        if (match == null || gap == null) {
            // A row with no percentage would draw as "0% match", which
            // is a worse answer than having no stored analysis.
            log.warn(
                    "Skill gap response for resume {} carried no percentages; nothing to persist",
                    resume.getId()
            );
            return;
        }

        // Re-analysing the same CV and field replaces the row. The page
        // shows the current analysis of a pair, not a history, and the
        // unique constraint would refuse a second insert anyway.
        SkillGapAnalysis analysis = skillGapAnalysisRepository
                .findByResumeIdAndJobField(resume.getId(), jobField)
                .orElseGet(() -> SkillGapAnalysis.builder()
                        .resume(resume)
                        .jobField(jobField)
                        .build());

        analysis.setJobFieldName(clip(
                firstNonBlank(text(aiResponse, "job_field_name"), jobField),
                MAX_FIELD_NAME
        ));
        analysis.setMatchPercentage(match);
        analysis.setGapPercentage(gap);
        analysis.setSummary(text(aiResponse, "summary"));
        analysis.setResultJson(aiResponse.toString());
        analysis.setAnalysedAt(LocalDateTime.now());

        skillGapAnalysisRepository.save(analysis);

        log.info(
                "Stored skill gap analysis of resume {} against {} for user {}",
                resume.getId(),
                jobField,
                resume.getUser().getId()
        );
    }

    /**
     * The CV this analysis was run on, if the caller owns it.
     *
     * <p>The id arrives from the browser. It is therefore looked up
     * scoped to the owner, and anything that does not resolve to a CV
     * this user owns stores nothing rather than filing an analysis
     * against somebody else's CV.
     */
    private Resume ownedResume(String userEmail, JsonNode request, JsonNode aiResponse) {

        Long resumeId = integerAsLong(request, "resume_id");

        if (resumeId == null) {
            resumeId = integerAsLong(aiResponse, "resume_id");
        }

        if (resumeId == null) {
            log.debug("Skill gap request named no resume; nothing to persist");
            return null;
        }

        Resume resume = resumeRepository.findById(resumeId).orElse(null);

        if (resume == null) {
            // Normal: CVUpload falls back to Date.now() when an upload
            // returns no id, and that is not a CV.
            log.debug("No stored CV {} to file a skill gap analysis against", resumeId);
            return null;
        }

        User user = userRepository.findByEmail(userEmail).orElse(null);

        if (user == null || !user.getId().equals(resume.getUser().getId())) {
            log.warn(
                    "User {} does not own CV {}; refusing to store a skill gap analysis against it",
                    userEmail,
                    resumeId
            );
            return null;
        }

        return resume;
    }

    private static String firstNonBlank(String preferred, String fallback) {
        return preferred != null && !preferred.isBlank() ? preferred : fallback;
    }

    private static String clip(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }

    private static String text(JsonNode node, String field) {

        if (node == null) return null;

        JsonNode value = node.get(field);

        if (value == null || !value.isTextual()) return null;

        String text = value.asText().trim();

        return text.isEmpty() ? null : text;
    }

    private static Integer integer(JsonNode node, String field) {

        if (node == null) return null;

        JsonNode value = node.get(field);

        // isNumber() rather than asInt(): a missing field and a field
        // holding 0 must not look the same here.
        return value != null && value.isNumber() ? value.asInt() : null;
    }

    private static Long integerAsLong(JsonNode node, String field) {

        Integer value = integer(node, field);

        return value == null ? null : value.longValue();
    }
}
