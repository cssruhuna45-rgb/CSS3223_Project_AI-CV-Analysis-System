package com.aiinterview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Every completed assessment for one job, side by side.
 *
 * <p>Candidates are comparable because they were all asked
 * {@link #questions} - the job's approved set, in one fixed order - and
 * graded against the same saved key points. Results from other jobs
 * never appear here: the query is scoped to one job that the requesting
 * recruiter owns.
 *
 * <p>The comparison supports a human reading it. It does not rank, pick
 * or recommend a candidate, and it deliberately offers no "best
 * candidate" field for a caller to lean on.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobComparisonDto {

    private Long jobId;
    private String jobTitle;
    private String company;

    /**
     * The approved questions, in asked order: id, position, text,
     * difficulty and topic.
     *
     * <p>Without key points. Those are the grading reference and stay
     * server side; the recruiter can read them through the assessment
     * page, which is where they are edited.
     */
    private List<QuestionHeaderDto> questions;

    /**
     * The candidates who finished, in the order they applied. Empty
     * when nobody has sat the assessment yet, which the page shows as
     * an empty state rather than an error.
     */
    private List<ComparisonCandidateDto> candidates;

    /**
     * One column header of the comparison table.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionHeaderDto {

        private Long id;
        private int position;
        private String question;
        private String difficulty;
        private String topic;
    }
}
