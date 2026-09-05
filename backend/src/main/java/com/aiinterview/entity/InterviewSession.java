package com.aiinterview.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * The durable record of one interview.
 *
 * <p>The Python AI service still runs the live interview from its own
 * in-memory session; this is the copy Spring writes as the interview
 * progresses, and the only copy that survives a restart of either
 * service. Everything the history and progress features report is read
 * from here.
 *
 * <p>{@code sessionId} is the AI service's identifier, not ours: it is
 * what the client sends on every subsequent call, so the answer and
 * finish steps find their row by it. It is unique, which also makes a
 * replayed start harmless.
 */
@Entity
@Table(
        name = "interview_sessions",
        indexes = {
                @Index(
                        name = "idx_interview_sessions_user_status",
                        columnList = "user_id, status"
                )
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"user", "resume", "turns"})
@EqualsAndHashCode(of = "id")
public class InterviewSession {

    /**
     * An interview that is still being conducted.
     */
    public static final String STATUS_ACTIVE = "active";

    /**
     * An interview that reached the finish step. Only these appear in
     * history and progress.
     */
    public static final String STATUS_COMPLETED = "completed";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The AI service's session identifier.
     */
    @Column(name = "session_id", nullable = false, unique = true)
    private String sessionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Optional: an interview can be run from pasted resume text with
     * no stored resume behind it.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resume_id")
    private Resume resume;

    @Column(name = "job_description", columnDefinition = "TEXT")
    private String jobDescription;

    @Column(name = "status", nullable = false, length = 32)
    @Builder.Default
    private String status = STATUS_ACTIVE;

    /**
     * Which question the candidate is currently on.
     */
    @Column(name = "current_question_number")
    private Integer currentQuestionNumber;

    /**
     * How many questions have been asked so far.
     */
    @Column(name = "question_count")
    private Integer questionCount;

    /**
     * Final score out of 100.
     *
     * <p>Null when the interview is unfinished, and also when grading
     * failed - the AI service reports that as score 0 with
     * {@code evaluated=false}, and storing that zero would count as a
     * real result the candidate never received.
     */
    @Column(name = "score")
    private Integer score;

    @Column(name = "feedback_summary", columnDefinition = "TEXT")
    private String feedbackSummary;

    /**
     * The full scorecard as returned by the AI service, stored
     * verbatim. The service owns that shape; parsing it into columns
     * here would mean keeping a second copy of it in sync.
     */
    @Column(name = "feedback_json", columnDefinition = "TEXT")
    private String feedbackJson;

    @Column(name = "started_at", nullable = false, updatable = false)
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * The transcript, ordered as it was asked.
     *
     * <p>An element collection rather than a one-to-many: the rows
     * belong to this session completely and have no key of their own.
     * Eager because every read of a session - persisting an answer,
     * showing the history - needs the turns immediately, and the
     * collection is a handful of rows.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "interview_session_turns",
            joinColumns = @JoinColumn(name = "session_db_id"),
            indexes = {
                    @Index(
                            name = "idx_interview_session_turns_session",
                            columnList = "session_db_id, turn_number"
                    )
            }
    )
    @OrderBy("turnNumber ASC")
    @Builder.Default
    private List<InterviewTurn> turns = new ArrayList<>();

    // ========================================================
    // Behaviour
    // ========================================================

    /**
     * Appends a question as the next turn, numbering it for the
     * caller so turn numbers cannot drift from the list.
     */
    public void addTurn(InterviewTurn turn) {
        turn.setTurnNumber(turns.size() + 1);
        turns.add(turn);
    }

    /**
     * The question the candidate is currently looking at: the last
     * turn that has no answer yet.
     *
     * <p>Searched from the end because that is where it always is, and
     * because an earlier gap - a turn somehow left unanswered - must
     * not swallow the answer meant for the current question.
     */
    public InterviewTurn currentUnansweredTurn() {

        for (int i = turns.size() - 1; i >= 0; i--) {

            InterviewTurn turn = turns.get(i);

            if (turn.getAnswer() == null) {
                return turn;
            }
        }

        return null;
    }

    public boolean isCompleted() {
        return STATUS_COMPLETED.equals(status);
    }
}
