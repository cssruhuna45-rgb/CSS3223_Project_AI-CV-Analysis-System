package com.aiinterview.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * One interview as a recruiter sees it.
 *
 * <p>Carries the candidate's name and email so the dashboard does not
 * have to fetch users separately, but nothing else about the account -
 * no password hash, no role, no id that would let a recruiter address
 * the user directly.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecruiterCandidateDto {

    private Long id;

    private String candidateName;

    private String candidateEmail;

    /**
     * The role interviewed for: the title of the job.
     */
    private String role;

    /**
     * The recruiter's job this interview was taken for, so the
     * dashboard can show one job's candidates at a time.
     */
    private Long jobId;

    /**
     * active, completed or cancelled.
     */
    private String status;

    /**
     * Null while an interview is unfinished or could not be graded.
     * Left null rather than zeroed: "not scored" and "scored zero" are
     * different things and the dashboard shows them differently.
     */
    private Integer score;

    private int questionCount;

    private int answeredCount;

    private LocalDateTime startedAt;

    private LocalDateTime completedAt;

    /**
     * Per-category scores, when the interview was graded.
     */
    private List<CategoryScoreDto> categoryScores;

    /**
     * Integrity signals summed over the interview's answers: times the
     * candidate left the page and for how long, and how often and how
     * much they pasted. Null (and left out of the JSON) when none were
     * recorded. Reported by the candidate's browser, so signals to
     * weigh, not proof.
     */
    private Integer leftPageCount;

    private Integer awaySeconds;

    private Integer pasteCount;

    private Integer pastedChars;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryScoreDto {
        private String key;
        private String label;
        private Integer score;
    }
}
