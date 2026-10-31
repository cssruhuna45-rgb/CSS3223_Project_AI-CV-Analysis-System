package com.aiinterview.service;

import com.aiinterview.dto.NotificationDto;
import com.aiinterview.entity.HiringDecision;
import com.aiinterview.entity.HiringDecisionValue;
import com.aiinterview.entity.JobApplication;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.Notification;
import com.aiinterview.entity.PublicationStatus;
import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.NotificationRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.impl.NotificationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests for the in-app notification a published hiring decision
 * produces.
 *
 * <p>Two things matter. A candidate must be told once and only once,
 * however many times Publish is pressed. And the notification itself
 * must carry no outcome, so that even a misrouted row would reveal
 * nothing - the result is read from the application, where ownership is
 * checked again.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class NotificationServiceTest {

    private static final String CARA = "cara@example.com";
    private static final String EVE = "eve@example.com";

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private NotificationServiceImpl service;

    private User cara;
    private User eve;
    private JobApplication application;
    private HiringDecision decision;

    @BeforeEach
    void setUp() {

        cara = User.builder().id(20L).name("Cara").email(CARA).role(Role.CANDIDATE).build();
        eve = User.builder().id(21L).name("Eve").email(EVE).role(Role.CANDIDATE).build();

        JobPosting job = JobPosting.builder()
                .id(5L)
                .title("Backend Developer")
                .company("Example Company")
                .build();

        application = JobApplication.builder()
                .id(77L)
                .jobPosting(job)
                .candidate(cara)
                .build();

        decision = HiringDecision.builder()
                .id(900L)
                .jobApplication(application)
                .decision(HiringDecisionValue.NOT_SELECTED)
                .publicationStatus(PublicationStatus.PUBLISHED)
                .candidateFeedback("Thank you for attending.")
                .internalNotes("Weak on SQL.")
                .publishedAt(LocalDateTime.now())
                .build();

        when(userRepository.findByEmail(CARA)).thenReturn(Optional.of(cara));
        when(userRepository.findByEmail(EVE)).thenReturn(Optional.of(eve));

        when(notificationRepository.existsByJobApplicationIdAndType(any(), any()))
                .thenReturn(false);
        when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private Notification captureSaved() {
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        return captor.getValue();
    }

    // ---- Creating ----------------------------------------------------

    @Test
    @DisplayName("publishing a decision notifies the right candidate")
    void notifiesTheCandidate() {
        service.notifyHiringDecisionPublished(decision);

        Notification saved = captureSaved();

        assertEquals(cara, saved.getRecipient());
        assertEquals(Notification.TYPE_HIRING_DECISION, saved.getType());
        assertEquals(application, saved.getJobApplication());
        assertFalse(saved.isRead());
    }

    @Test
    @DisplayName("the notification names the job but never the outcome")
    void notificationCarriesNoOutcome() {
        service.notifyHiringDecisionPublished(decision);

        Notification saved = captureSaved();
        String text = saved.getTitle() + " " + saved.getMessage();

        assertTrue(text.contains("Backend Developer"));
        // Even a misrouted notification would give nothing away.
        assertFalse(text.contains("NOT_SELECTED"));
        assertFalse(text.toLowerCase().contains("not selected"));
        assertFalse(text.toLowerCase().contains("congratulations"));
        assertFalse(text.contains("Weak on SQL."));
        assertFalse(text.contains("Thank you for attending."));
    }

    @Test
    @DisplayName("publishing twice does not tell the candidate twice")
    void notificationIsIdempotent() {
        when(notificationRepository.existsByJobApplicationIdAndType(
                77L, Notification.TYPE_HIRING_DECISION)).thenReturn(true);

        service.notifyHiringDecisionPublished(decision);

        verify(notificationRepository, never()).save(any());
    }

    @Test
    @DisplayName("two publishes racing each other still leave one notification")
    void concurrentNotificationIsRefusedByTheConstraint() {
        // Both passed the exists check; the unique index on
        // (application, type) is what stops the second row.
        when(notificationRepository.save(any(Notification.class)))
                .thenThrow(new DataIntegrityViolationException("uk_notifications_hiring_decision"));

        // Swallowed, not propagated: the decision is already published
        // and must not be rolled back over a duplicate notification.
        service.notifyHiringDecisionPublished(decision);
    }

    // ---- Reading -----------------------------------------------------

    @Test
    @DisplayName("a candidate sees only their own notifications")
    void listingIsScopedToTheRecipient() {
        when(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(20L))
                .thenReturn(List.of(Notification.builder()
                        .id(1L)
                        .recipient(cara)
                        .type(Notification.TYPE_HIRING_DECISION)
                        .title("Your interview result is available")
                        .message("Open your applications to see it.")
                        .jobApplication(application)
                        .build()));

        List<NotificationDto> mine = service.listMine(CARA);

        assertEquals(1, mine.size());
        assertEquals(77L, mine.get(0).getApplicationId());
        // Queried by the id from the token, never from the request.
        verify(notificationRepository).findByRecipientIdOrderByCreatedAtDesc(20L);
    }

    @Test
    @DisplayName("another candidate cannot open somebody else's notification")
    void cannotOpenAnotherCandidatesNotification() {
        when(notificationRepository.findByIdAndRecipientId(1L, 21L))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.markRead(EVE, 1L));
    }

    @Test
    @DisplayName("opening a notification marks it read")
    void markingRead() {
        Notification unread = Notification.builder()
                .id(1L)
                .recipient(cara)
                .type(Notification.TYPE_HIRING_DECISION)
                .title("Your interview result is available")
                .message("Open your applications to see it.")
                .jobApplication(application)
                .build();

        when(notificationRepository.findByIdAndRecipientId(1L, 20L))
                .thenReturn(Optional.of(unread));

        NotificationDto dto = service.markRead(CARA, 1L);

        assertTrue(dto.isRead());
        assertNotNull(unread.getReadAt());
    }

    @Test
    @DisplayName("opening an already-read notification keeps the first time")
    void markingReadTwiceKeepsTheFirstTime() {
        LocalDateTime firstRead = LocalDateTime.now().minusDays(2);

        Notification alreadyRead = Notification.builder()
                .id(1L)
                .recipient(cara)
                .type(Notification.TYPE_HIRING_DECISION)
                .title("Your interview result is available")
                .message("Open your applications to see it.")
                .readAt(firstRead)
                .build();

        when(notificationRepository.findByIdAndRecipientId(1L, 20L))
                .thenReturn(Optional.of(alreadyRead));

        service.markRead(CARA, 1L);

        assertEquals(firstRead, alreadyRead.getReadAt());
        verify(notificationRepository, never()).save(any());
    }

    @Test
    @DisplayName("the unread count is scoped to the signed-in user")
    void unreadCountIsScoped() {
        when(notificationRepository.countByRecipientIdAndReadAtIsNull(20L)).thenReturn(3L);

        assertEquals(3L, service.unreadCount(CARA));
        verify(notificationRepository).countByRecipientIdAndReadAtIsNull(20L);
    }
}
