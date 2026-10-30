package com.aiinterview.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * Something the application wants to tell one person, in the app
 * (V12).
 *
 * <p>Deliberately small. The project had no persistent notifications -
 * only transient toasts, which are gone the moment the page reloads -
 * and a published hiring decision is exactly the kind of thing a
 * candidate must not miss because they happened to be looking
 * elsewhere. This is the minimum that fixes that: a row per person per
 * event, read or unread. No email, no push, no delivery infrastructure.
 *
 * <p>Always addressed to one {@link #recipient}, and every query is
 * scoped by that recipient, so one candidate's result cannot surface in
 * another's list.
 */
@Entity
@Table(
        name = "notifications",
        indexes = @Index(
                name = "idx_notifications_recipient",
                columnList = "recipient_id, created_at"
        )
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"recipient", "jobApplication"})
@EqualsAndHashCode(of = "id")
public class Notification {

    /** A recruiter announced a hiring decision. */
    public static final String TYPE_HIRING_DECISION = "HIRING_DECISION";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Column(name = "type", nullable = false, length = 32)
    private String type;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;

    /**
     * What this is about, so the UI can link straight to it. Nullable
     * because not every future notification will concern an
     * application.
     *
     * <p>Carries no outcome itself: the notification says a result is
     * available, and the result is read from the application, where
     * ownership is checked again.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_application_id")
    private JobApplication jobApplication;

    /** Null until the recipient opens it. */
    @Column(name = "read_at")
    private LocalDateTime readAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public boolean isRead() {
        return readAt != null;
    }
}
