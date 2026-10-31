package com.aiinterview.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * One step in the life of a hiring decision (V12).
 *
 * <p>A hiring decision is the kind of record somebody eventually asks
 * questions about: who decided, when, and whether it changed after the
 * candidate was told. The decision row itself only holds the current
 * state, so each change is appended here instead of overwriting the
 * last one.
 *
 * <p>Append-only. Nothing in the application updates or deletes these
 * rows, which is what makes the trail worth having.
 */
@Entity
@Table(
        name = "hiring_decision_events",
        indexes = @Index(
                name = "idx_hiring_decision_events_decision",
                columnList = "hiring_decision_id, created_at"
        )
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"hiringDecision", "actor"})
@EqualsAndHashCode(of = "id")
public class HiringDecisionEvent {

    /** A draft was created or changed. */
    public static final String ACTION_DRAFTED = "DRAFTED";

    /** The decision was announced to the candidate. */
    public static final String ACTION_PUBLISHED = "PUBLISHED";

    /**
     * A published decision was deliberately corrected. Kept as its own
     * action so a correction can never be mistaken for the original
     * announcement.
     */
    public static final String ACTION_CORRECTED = "CORRECTED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "hiring_decision_id", nullable = false)
    private HiringDecision hiringDecision;

    @Column(name = "action", nullable = false, length = 16)
    private String action;

    /** The decision value as it stood after this step. */
    @Enumerated(EnumType.STRING)
    @Column(name = "decision", nullable = false, length = 16)
    private HiringDecisionValue decision;

    @Enumerated(EnumType.STRING)
    @Column(name = "publication_status", nullable = false, length = 16)
    private PublicationStatus publicationStatus;

    /**
     * Who did it. Null only if that account was later deleted; the
     * event itself is never removed.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
