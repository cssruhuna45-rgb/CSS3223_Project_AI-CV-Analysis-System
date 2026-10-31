package com.aiinterview.repository;

import com.aiinterview.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository
        extends JpaRepository<Notification, Long> {

    /**
     * One person's notifications, newest first.
     *
     * <p>Every read is scoped by recipient id, so one candidate's
     * result can never surface in another's list.
     */
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);

    long countByRecipientIdAndReadAtIsNull(Long recipientId);

    /**
     * One notification, but only if it belongs to this recipient, so
     * somebody else's id is "not found" rather than readable.
     */
    Optional<Notification> findByIdAndRecipientId(Long id, Long recipientId);

    /**
     * Whether this application already produced a notification of this
     * kind. What makes publishing idempotent: a replayed publish finds
     * the existing row and does not tell the candidate twice.
     */
    boolean existsByJobApplicationIdAndType(Long jobApplicationId, String type);
}
