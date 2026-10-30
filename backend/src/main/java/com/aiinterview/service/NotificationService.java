package com.aiinterview.service;

import com.aiinterview.dto.NotificationDto;
import com.aiinterview.entity.HiringDecision;

import java.util.List;

/**
 * In-app notifications: the few things a person must not miss because
 * they happened to be looking elsewhere.
 *
 * <p>Minimal on purpose. The project had only transient toasts, which
 * vanish on reload; this adds a durable row per person per event and
 * nothing more. No email, no push, no delivery infrastructure.
 *
 * <p>Reads are scoped by the recipient from the authenticated token,
 * so one candidate's notification can never appear in another's list.
 */
public interface NotificationService {

    /**
     * Tells a candidate their hiring decision has been announced.
     *
     * <p>Idempotent: a replayed publish finds the notification that
     * already exists for the application and does nothing, so the
     * candidate is never told twice about one decision.
     *
     * <p>The notification says a result is available; it does not
     * carry the result. The candidate reads that from the application
     * endpoint, where ownership is checked again.
     */
    void notifyHiringDecisionPublished(HiringDecision decision);

    /** The signed-in user's own notifications, newest first. */
    List<NotificationDto> listMine(String userEmail);

    /** How many the user has not opened, for a badge. */
    long unreadCount(String userEmail);

    /**
     * Marks one of the user's own notifications read.
     *
     * @throws com.aiinterview.exception.ResourceNotFoundException when
     *         the notification is not this user's, so somebody else's
     *         id reveals nothing
     */
    NotificationDto markRead(String userEmail, Long notificationId);
}
