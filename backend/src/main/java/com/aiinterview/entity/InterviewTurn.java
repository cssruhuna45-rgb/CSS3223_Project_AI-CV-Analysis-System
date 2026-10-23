package com.aiinterview.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * One question in an interview, together with the answer it received.
 *
 * <p>Deliberately an {@link Embeddable} rather than an entity. A turn
 * has no meaning or identity outside the session that owns it: it is
 * never queried on its own, never shared, and dies with its session.
 * Giving it a surrogate key and a repository would add a lifecycle the
 * domain does not have.
 *
 * <p>The row is written when the question is generated and updated in
 * place when the candidate answers it, so {@code answer} and
 * {@code answeredAt} are null for the question currently on screen.
 *
 * <p>{@code equals}/{@code hashCode} cover every field because
 * Hibernate uses them to reconcile element collections.
 */
@Embeddable
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class InterviewTurn {

    /**
     * 1-based position in the interview. The collection is ordered by
     * this rather than by insertion, so the transcript survives a
     * reload in the order it was asked.
     */
    @Column(name = "turn_number", nullable = false)
    private Integer turnNumber;

    @Column(name = "question", columnDefinition = "TEXT")
    private String question;

    /**
     * Null until the candidate answers this question.
     */
    @Column(name = "answer", columnDefinition = "TEXT")
    private String answer;

    /**
     * The AI service's explanation of why it asked this question.
     */
    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "category")
    private String category;

    @Column(name = "difficulty", length = 32)
    private String difficulty;

    /**
     * How the answer arrived - typed, spoken, or skipped. Recorded
     * when the client reports it and left null otherwise.
     */
    @Column(name = "answer_mode", length = 32)
    private String answerMode;

    @Column(name = "is_follow_up")
    private Boolean followUp;

    @Column(name = "answered_at")
    private LocalDateTime answeredAt;

    // --------------------------------------------------------
    // Integrity signals (V8): what the browser saw while this answer
    // was being written, recorded in exam mode only. Null = not
    // recorded, which is not the same as 0 = recorded, none seen.
    // --------------------------------------------------------

    /** Times the candidate left the interview page (tab or window). */
    @Column(name = "left_page_count")
    private Integer leftPageCount;

    /** Total seconds spent away from the page. */
    @Column(name = "away_seconds")
    private Integer awaySeconds;

    /** Times text was pasted into the answer. */
    @Column(name = "paste_count")
    private Integer pasteCount;

    /** Characters pasted in total. */
    @Column(name = "pasted_chars")
    private Integer pastedChars;
}
