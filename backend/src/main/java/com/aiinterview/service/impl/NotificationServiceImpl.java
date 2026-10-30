package com.aiinterview.service.impl;

import com.aiinterview.dto.NotificationDto;
import com.aiinterview.entity.HiringDecision;
import com.aiinterview.entity.JobApplication;
import com.aiinterview.entity.Notification;
import com.aiinterview.entity.User;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.NotificationRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private static final Logger log =
            LoggerFactory.getLogger(NotificationServiceImpl.class);

    private static final String DECISION_TITLE = "Your interview result is available";

    private final NotificationRepository notificationRepository;

    private final UserRepository userRepository;

    // ========================================================
    // Writing
    // ========================================================

    @Override
    @Transactional
    public void notifyHiringDecisionPublished(HiringDecision decision) {

        JobApplication application = decision.getJobApplication();

        // A replayed publish must not tell the candidate twice. Checked
        // here, and guaranteed by a unique index on (application, type)
        // for the case where two requests race past this check.
        if (notificationRepository.existsByJobApplicationIdAndType(
                application.getId(), Notification.TYPE_HIRING_DECISION)) {

            log.debug(
                    "Application {} already has a hiring decision notification",
                    application.getId()
            );
            return;
        }

        String jobTitle = application.getJobPosting().getTitle();

        Notification notification = Notification.builder()
                .recipient(application.getCandidate())
                .type(Notification.TYPE_HIRING_DECISION)
                .title(DECISION_TITLE)
                // Says a result exists, not what it is. The outcome is
                // read from the application, where ownership is
                // checked again.
                .message("The final hiring decision for your " + jobTitle
                        + " application has been announced. Open your applications to see it.")
                .jobApplication(application)
                .build();

        try {
            notificationRepository.save(notification);
        } catch (DataIntegrityViolationException e) {
            // Two publishes raced each other; the unique index kept the
            // second notification out, which is exactly its job.
            log.info(
                    "Duplicate hiring decision notification for application {} was refused",
                    application.getId()
            );
            return;
        }

        log.info(
                "Notified candidate {} that application {} has a decision",
                application.getCandidate().getId(),
                application.getId()
        );
    }

    // ========================================================
    // Reading
    // ========================================================

    @Override
    @Transactional(readOnly = true)
    public List<NotificationDto> listMine(String userEmail) {

        User user = user(userEmail);

        return notificationRepository
                .findByRecipientIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(NotificationDto::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long unreadCount(String userEmail) {
        return notificationRepository.countByRecipientIdAndReadAtIsNull(user(userEmail).getId());
    }

    @Override
    @Transactional
    public NotificationDto markRead(String userEmail, Long notificationId) {

        User user = user(userEmail);

        // Scoped to the recipient, so another person's notification id
        // is "not found" rather than something that can be read.
        Notification notification = notificationRepository
                .findByIdAndRecipientId(notificationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No notification with id " + notificationId
                ));

        // Opening it again keeps the time it was first read.
        if (!notification.isRead()) {
            notification.setReadAt(LocalDateTime.now());
            notificationRepository.save(notification);
        }

        return NotificationDto.from(notification);
    }

    private User user(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }
}
