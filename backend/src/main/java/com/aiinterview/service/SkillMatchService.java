package com.aiinterview.service;

import java.util.List;

/**
 * Compares a CV's skills with the skills a recruiter put on their job.
 *
 * <p>Deterministic: the AI service endpoint behind this runs set
 * arithmetic over two lists and calls no model, so the same inputs
 * always give the same percentage. That is what makes a number stored
 * against an application still meaningful when a recruiter reads it
 * weeks later.
 *
 * <p>Called <strong>once</strong>, when an application is submitted.
 * The result is stored on the application; opening an applicant list
 * reads those rows and never comes back here.
 *
 * <p>The percentage is decision support. Nothing in this project may
 * shortlist or reject a candidate from it.
 */
public interface SkillMatchService {

    /**
     * @param requiredSkills the job's own required skills, already
     *                       normalised by {@code JobAssessmentRules}
     * @param candidateSkills skills from the CV analysis snapshot
     *
     * @return the match, or {@link SkillMatchResult#unavailable()} when
     *         it could not be computed - the AI service was unreachable,
     *         say. Never an exception: an application is worth recording
     *         even when its decision support is missing.
     */
    SkillMatchResult match(List<String> requiredSkills, List<String> candidateSkills);

    /**
     * What the matcher returned.
     *
     * @param matchPercentage 0-100, or null when unavailable
     */
    record SkillMatchResult(
            Integer matchPercentage,
            Integer requiredSkillCount,
            List<String> matchedSkills,
            List<String> relatedSkills,
            List<String> missingSkills
    ) {

        /**
         * No match could be computed. Stored as a null percentage,
         * which the UI shows as "not available" rather than as 0% - a
         * zero would read as a weak candidate.
         */
        public static SkillMatchResult unavailable() {
            return new SkillMatchResult(null, null, List.of(), List.of(), List.of());
        }
    }
}
