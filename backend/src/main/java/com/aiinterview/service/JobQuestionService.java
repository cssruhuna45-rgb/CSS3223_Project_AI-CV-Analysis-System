package com.aiinterview.service;

import com.aiinterview.dto.JobAssessmentDto;
import com.aiinterview.dto.JobQuestionRequestDto;
import com.aiinterview.dto.JobQuestionSettingsDto;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.JobQuestion;
import com.fasterxml.jackson.databind.node.ArrayNode;

import java.util.List;

/**
 * A job's fixed interview: what every candidate for the job is asked,
 * and what their answers are graded against.
 *
 * <p>Recruiter methods are scoped by the recruiter from the token, so a
 * job id belonging to someone else is "not found". Once approved, a set
 * cannot change: every method that would change it refuses.
 */
public interface JobQuestionService {

    // ---- Recruiter ------------------------------------------------

    JobAssessmentDto getAssessment(String recruiterEmail, Long jobId);

    /** Required skills and question count; only before approval. */
    JobAssessmentDto updateSettings(String recruiterEmail, Long jobId, JobQuestionSettingsDto settings);

    /**
     * Drafts a full set from the job's skills and description - never
     * from a CV - replacing any draft questions.
     */
    JobAssessmentDto generate(String recruiterEmail, Long jobId);

    /** Replaces one draft question with a new generated one. */
    JobAssessmentDto regenerate(String recruiterEmail, Long jobId, Long questionId);

    /** Saves the recruiter's edited draft, in the order given. */
    JobAssessmentDto saveDraft(String recruiterEmail, Long jobId, List<JobQuestionRequestDto> questions);

    /** Locks the set. Refused unless it passes every rule. */
    JobAssessmentDto approve(String recruiterEmail, Long jobId);

    // ---- Interview start ------------------------------------------

    /**
     * The job's approved questions in the order they are asked.
     *
     * @throws com.aiinterview.exception.ConflictException when the set
     *         is not approved; the job's interview is not ready
     */
    List<JobQuestion> getApprovedQuestions(JobPosting job);

    /**
     * The approved questions as the AI service's {@code fixed_questions}
     * start field: question_id, position, question, difficulty, topic,
     * key_points. Built from the database only, never from the browser.
     */
    ArrayNode fixedQuestionsPayload(JobPosting job);
}
