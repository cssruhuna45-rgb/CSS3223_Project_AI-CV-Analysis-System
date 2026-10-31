package com.aiinterview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One candidate's answer to one approved question, as graded.
 *
 * <p>Read straight out of the stored scorecard's {@code per_question}
 * entry. Nothing here is recomputed: the grading is Person 1's, and
 * re-deriving a score would give a recruiter a second, disagreeing
 * number for the same answer.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComparisonAnswerDto {

    /**
     * The approved question this answers. What aligns one candidate's
     * answer with another's, rather than position alone.
     */
    private Long questionId;

    /** 1-based order the question was asked in. */
    private Integer questionNumber;

    /** 0-100, as graded. Null when the scorecard carried no score. */
    private Integer score;

    /** strong, partial, weak or none. */
    private String verdict;

    private String answer;

    private String whatWasGood;
    private String whatWasMissing;
}
