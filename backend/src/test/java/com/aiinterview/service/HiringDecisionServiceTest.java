package com.aiinterview.service;

import com.aiinterview.dto.CandidateFinalResultDto;
import com.aiinterview.dto.HiringDecisionDto;
import com.aiinterview.dto.HiringDecisionRequestDto;
import com.aiinterview.entity.ApplicationStatus;
import com.aiinterview.entity.HiringDecision;
import com.aiinterview.entity.HiringDecisionEvent;
import com.aiinterview.entity.HiringDecisionValue;
import com.aiinterview.entity.InterviewSession;
import com.aiinterview.entity.JobApplication;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.PublicationStatus;
import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import com.aiinterview.exception.ConflictException;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.HiringDecisionEventRepository;
import com.aiinterview.repository.HiringDecisionRepository;
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.repository.JobApplicationRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.impl.HiringDecisionServiceImpl;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests for the recruiter's final hiring decision and what the
 * candidate is allowed to see of it.
 *
 * <p>Three properties carry most of the weight here. A decision is only
 * ever made by a person - nothing derives one from a score. A draft is
 * invisible to the candidate, and not merely hidden: the query that
 * would load it matches published rows only. And publishing is
 * idempotent, so a double-clicked button cannot announce twice or
 * notify twice.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class HiringDecisionServiceTest {

    private static final String RITA = "rita@example.com";
    private static final String OTHER_RECRUITER = "ron@example.com";
    private static final String CARA = "cara@example.com";
    private static final String EVE = "eve@example.com";

    @Mock
    private HiringDecisionRepository hiringDecisionRepository;

    @Mock
    private HiringDecisionEventRepository hiringDecisionEventRepository;

    @Mock
    private JobApplicationRepository jobApplicationRepository;

    @Mock
    private InterviewSessionRepository interviewSessionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private HiringDecisionServiceImpl service;

    private User rita;
    private User ron;
    private User cara;
    private User eve;
    private JobPosting job;
    private JobApplication application;
    private InterviewSession completedInterview;

    @BeforeEach
    void setUp() {

        rita = User.builder().id(10L).name("Rita").email(RITA).role(Role.RECRUITER).build();
        ron = User.builder().id(11L).name("Ron").email(OTHER_RECRUITER).role(Role.RECRUITER).build();
        cara = User.builder().id(20L).name("Cara").email(CARA).role(Role.CANDIDATE).build();
        eve = User.builder().id(21L).name("Eve").email(EVE).role(Role.CANDIDATE).build();

        job = JobPosting.builder()
                .id(5L)
                .recruiter(rita)
                .title("Backend Developer")
                .company("Example Company")
                .open(true)
                .build();

        application = JobApplication.builder()
                .id(77L)
                .jobPosting(job)
                .candidate(cara)
                .status(ApplicationStatus.INTERVIEWED)
                .interviewCompletedAt(LocalDateTime.now().minusDays(1))
                .build();

        completedInterview = InterviewSession.builder()
                .sessionId("s-done")
                .jobApplication(application)
                .status(InterviewSession.STATUS_COMPLETED)
                .score(72)
                .build();

        when(userRepository.findByEmail(RITA)).thenReturn(Optional.of(rita));
        when(userRepository.findByEmail(OTHER_RECRUITER)).thenReturn(Optional.of(ron));
        when(userRepository.findByEmail(CARA)).thenReturn(Optional.of(cara));
        when(userRepository.findByEmail(EVE)).thenReturn(Optional.of(eve));

        when(jobApplicationRepository.findByIdForRecruiter(77L, 10L))
                .thenReturn(Optional.of(application));
        when(jobApplicationRepository.findByIdForRecruiter(77L, 11L))
                .thenReturn(Optional.empty());
        when(jobApplicationRepository.findById(77L)).thenReturn(Optional.of(application));

        when(interviewSessionRepository.findByJobApplicationId(77L))
                .thenReturn(Optional.of(completedInterview));

        when(hiringDecisionRepository.findByJobApplicationId(77L)).thenReturn(Optional.empty());
        when(hiringDecisionRepository.findForRecruiter(any(), any())).thenReturn(Optional.empty());
        when(hiringDecisionRepository.findPublishedForCandidate(any(), any()))
                .thenReturn(Optional.empty());

        when(hiringDecisionRepository.save(any(HiringDecision.class)))
                .thenAnswer(inv -> {
                    HiringDecision saved = inv.getArgument(0);
                    if (saved.getId() == null) saved.setId(900L);
                    return saved;
                });
    }

    private HiringDecisionRequestDto request(HiringDecisionValue decision) {
        return HiringDecisionRequestDto.builder()
                .decision(decision)
                .candidateFeedback("Thank you for attending the interview.")
                .internalNotes("Strong on Spring, weaker on SQL.")
                .build();
    }

    private HiringDecision draft(HiringDecisionValue decision) {
        return HiringDecision.builder()
                .id(900L)
                .jobApplication(application)
                .decision(decision)
                .publicationStatus(PublicationStatus.DRAFT)
                .candidateFeedback("Thank you for attending the interview.")
                .internalNotes("Strong on Spring, weaker on SQL.")
                .decidedBy(rita)
                .decidedAt(LocalDateTime.now())
                .build();
    }

    private HiringDecision published(HiringDecisionValue decision) {
        HiringDecision d = draft(decision);
        d.setPublicationStatus(PublicationStatus.PUBLISHED);
        d.setPublishedAt(LocalDateTime.now());
        return d;
    }

    // ---- Eligibility -------------------------------------------------

    @Test
    @DisplayName("a candidate who has not been interviewed cannot be decided on")
    void cannotDecideBeforeTheInterview() {
        application.setStatus(ApplicationStatus.SHORTLISTED);

        ConflictException thrown = assertThrows(ConflictException.class,
                () -> service.saveDraft(RITA, 77L, request(HiringDecisionValue.SELECTED)));

        assertTrue(thrown.getMessage().contains("not completed the interview"));
        verify(hiringDecisionRepository, never()).save(any());
    }

    @Test
    @DisplayName("an application marked interviewed with no completed attempt is still refused")
    void cannotDecideWithoutAStoredResult() {
        // The status alone is not taken on trust: there must be a
        // completed attempt behind it.
        when(interviewSessionRepository.findByJobApplicationId(77L))
                .thenReturn(Optional.empty());

        assertThrows(ConflictException.class,
                () -> service.saveDraft(RITA, 77L, request(HiringDecisionValue.SELECTED)));
    }

    @Test
    @DisplayName("an unfinished attempt is not a result to decide on")
    void cannotDecideOnARunningInterview() {
        completedInterview.setStatus(InterviewSession.STATUS_ACTIVE);

        assertThrows(ConflictException.class,
                () -> service.saveDraft(RITA, 77L, request(HiringDecisionValue.SELECTED)));
    }

    // ---- Drafting ----------------------------------------------------

    @Test
    @DisplayName("the owning recruiter can draft a SELECTED decision")
    void drafSelected() {
        HiringDecisionDto saved = service.saveDraft(RITA, 77L, request(HiringDecisionValue.SELECTED));

        assertEquals("SELECTED", saved.getDecision());
        assertEquals("DRAFT", saved.getPublicationStatus());
        assertFalse(saved.isPublished());
        assertTrue(saved.isReadyToPublish());
        assertEquals("Rita", saved.getDecidedByName());
    }

    @Test
    @DisplayName("the owning recruiter can draft a NOT_SELECTED decision")
    void draftNotSelected() {
        HiringDecisionDto saved = service.saveDraft(RITA, 77L, request(HiringDecisionValue.NOT_SELECTED));

        assertEquals("NOT_SELECTED", saved.getDecision());
        assertFalse(saved.isPublished());
    }

    @Test
    @DisplayName("drafting tells the candidate nothing")
    void draftingDoesNotNotify() {
        service.saveDraft(RITA, 77L, request(HiringDecisionValue.SELECTED));

        verify(notificationService, never()).notifyHiringDecisionPublished(any());
    }

    @Test
    @DisplayName("drafting is recorded in the audit trail")
    void draftingIsAudited() {
        service.saveDraft(RITA, 77L, request(HiringDecisionValue.SELECTED));

        ArgumentCaptor<HiringDecisionEvent> captor =
                ArgumentCaptor.forClass(HiringDecisionEvent.class);
        verify(hiringDecisionEventRepository).save(captor.capture());

        assertEquals(HiringDecisionEvent.ACTION_DRAFTED, captor.getValue().getAction());
        assertEquals(rita, captor.getValue().getActor());
    }

    @Test
    @DisplayName("a recruiter cannot draft a decision on another recruiter's applicant")
    void cannotDraftForAnotherRecruiter() {
        assertThrows(ResourceNotFoundException.class,
                () -> service.saveDraft(OTHER_RECRUITER, 77L, request(HiringDecisionValue.SELECTED)));

        verify(hiringDecisionRepository, never()).save(any());
    }

    @Test
    @DisplayName("a recruiter cannot read another recruiter's decision")
    void cannotReadAnotherRecruitersDecision() {
        assertThrows(ResourceNotFoundException.class,
                () -> service.getForRecruiter(OTHER_RECRUITER, 77L));
    }

    @Test
    @DisplayName("an application nobody has decided on reads as awaiting a decision")
    void undecidedReadsAsPending() {
        HiringDecisionDto dto = service.getForRecruiter(RITA, 77L);

        assertEquals("PENDING", dto.getDecision());
        assertFalse(dto.isPublished());
        assertFalse(dto.isReadyToPublish());
    }

    // ---- Publishing --------------------------------------------------

    @Test
    @DisplayName("publishing announces the decision and notifies the candidate")
    void publishNotifies() {
        when(hiringDecisionRepository.findByJobApplicationId(77L))
                .thenReturn(Optional.of(draft(HiringDecisionValue.SELECTED)));

        HiringDecisionDto result = service.publish(RITA, 77L);

        assertEquals("PUBLISHED", result.getPublicationStatus());
        assertTrue(result.isPublished());
        assertNotNull(result.getPublishedAt());
        verify(notificationService).notifyHiringDecisionPublished(any());
    }

    @Test
    @DisplayName("publishing is recorded in the audit trail")
    void publishingIsAudited() {
        when(hiringDecisionRepository.findByJobApplicationId(77L))
                .thenReturn(Optional.of(draft(HiringDecisionValue.SELECTED)));

        service.publish(RITA, 77L);

        ArgumentCaptor<HiringDecisionEvent> captor =
                ArgumentCaptor.forClass(HiringDecisionEvent.class);
        verify(hiringDecisionEventRepository).save(captor.capture());

        assertEquals(HiringDecisionEvent.ACTION_PUBLISHED, captor.getValue().getAction());
    }

    @Test
    @DisplayName("there must be a decision before it can be announced")
    void cannotPublishNothing() {
        assertThrows(ConflictException.class, () -> service.publish(RITA, 77L));

        verify(notificationService, never()).notifyHiringDecisionPublished(any());
    }

    @Test
    @DisplayName("an undecided draft cannot be announced")
    void cannotPublishPending() {
        when(hiringDecisionRepository.findByJobApplicationId(77L))
                .thenReturn(Optional.of(draft(HiringDecisionValue.PENDING)));

        ConflictException thrown = assertThrows(ConflictException.class,
                () -> service.publish(RITA, 77L));

        assertTrue(thrown.getMessage().contains("Choose whether"));
        verify(notificationService, never()).notifyHiringDecisionPublished(any());
    }

    @Test
    @DisplayName("publishing twice announces once and notifies once")
    void publishIsIdempotent() {
        HiringDecision alreadyOut = published(HiringDecisionValue.SELECTED);

        when(hiringDecisionRepository.findByJobApplicationId(77L))
                .thenReturn(Optional.of(alreadyOut));

        HiringDecisionDto result = service.publish(RITA, 77L);

        assertTrue(result.isPublished());
        // No second announcement, no second notification, no second
        // audit entry: a double-clicked Publish is harmless.
        verify(notificationService, never()).notifyHiringDecisionPublished(any());
        verify(hiringDecisionEventRepository, never()).save(any());
        verify(hiringDecisionRepository, never()).save(any());
    }

    @Test
    @DisplayName("a recruiter cannot publish another recruiter's decision")
    void cannotPublishForAnotherRecruiter() {
        assertThrows(ResourceNotFoundException.class,
                () -> service.publish(OTHER_RECRUITER, 77L));
    }

    @Test
    @DisplayName("an announced decision cannot be silently overwritten by a save")
    void publishedCannotBeRedrafted() {
        when(hiringDecisionRepository.findByJobApplicationId(77L))
                .thenReturn(Optional.of(published(HiringDecisionValue.SELECTED)));

        ConflictException thrown = assertThrows(ConflictException.class,
                () -> service.saveDraft(RITA, 77L, request(HiringDecisionValue.NOT_SELECTED)));

        assertTrue(thrown.getMessage().contains("already been announced"));
        verify(hiringDecisionRepository, never()).save(any());
    }

    @Test
    @DisplayName("the application status is left alone by a decision")
    void applicationStatusIsUntouched() {
        when(hiringDecisionRepository.findByJobApplicationId(77L))
                .thenReturn(Optional.of(draft(HiringDecisionValue.NOT_SELECTED)));

        service.publish(RITA, 77L);

        // Not rewritten to REJECTED: INTERVIEWED is how far the
        // candidate got, and the hiring outcome is tracked separately.
        assertEquals(ApplicationStatus.INTERVIEWED, application.getStatus());
        verify(jobApplicationRepository, never()).save(any());
    }

    // ---- What the candidate sees -------------------------------------

    @Test
    @DisplayName("a draft decision is invisible to the candidate")
    void draftIsInvisibleToTheCandidate() {
        // The repository is asked only for published rows, so a draft
        // is never loaded - not loaded and then filtered out.
        when(hiringDecisionRepository.findPublishedForCandidate(77L, 20L))
                .thenReturn(Optional.empty());

        CandidateFinalResultDto result = service.getFinalResult(CARA, 77L);

        assertFalse(result.isAnnounced());
        assertEquals("PENDING", result.getDecision());
        assertNull(result.getFeedback());
        assertTrue(result.getMessage().contains("reviewing your application"));
    }

    @Test
    @DisplayName("a published decision reaches the right candidate with its feedback")
    void publishedReachesTheCandidate() {
        when(hiringDecisionRepository.findPublishedForCandidate(77L, 20L))
                .thenReturn(Optional.of(published(HiringDecisionValue.SELECTED)));

        CandidateFinalResultDto result = service.getFinalResult(CARA, 77L);

        assertTrue(result.isAnnounced());
        assertTrue(result.isSelected());
        assertEquals("SELECTED", result.getDecision());
        assertEquals("Backend Developer", result.getJobTitle());
        assertEquals("Example Company", result.getCompany());
        assertNotNull(result.getAnnouncedAt());
        assertEquals("Thank you for attending the interview.", result.getFeedback());
    }

    @Test
    @DisplayName("a not-selected result is announced without being called a rejection")
    void notSelectedReachesTheCandidate() {
        when(hiringDecisionRepository.findPublishedForCandidate(77L, 20L))
                .thenReturn(Optional.of(published(HiringDecisionValue.NOT_SELECTED)));

        CandidateFinalResultDto result = service.getFinalResult(CARA, 77L);

        assertTrue(result.isAnnounced());
        assertFalse(result.isSelected());
        assertEquals("Not selected", result.getDecisionLabel());
    }

    @Test
    @DisplayName("the candidate's result never carries the recruiter's private notes")
    void internalNotesAreNotExposed() {
        when(hiringDecisionRepository.findPublishedForCandidate(77L, 20L))
                .thenReturn(Optional.of(published(HiringDecisionValue.NOT_SELECTED)));

        CandidateFinalResultDto result = service.getFinalResult(CARA, 77L);

        // The DTO has no field for them at all, so this checks the
        // shape as much as the value.
        assertFalse(
                java.util.Arrays.stream(CandidateFinalResultDto.class.getDeclaredFields())
                        .anyMatch(f -> f.getName().toLowerCase().contains("internal")
                                || f.getName().toLowerCase().contains("note")),
                "the candidate result must have no field for internal recruiter notes"
        );
        assertFalse(String.valueOf(result).contains("weaker on SQL"));
    }

    @Test
    @DisplayName("a candidate cannot read another candidate's result")
    void cannotReadAnotherCandidatesResult() {
        // Eve asking for Cara's application: the ownership filter makes
        // it "not found" rather than readable.
        assertThrows(ResourceNotFoundException.class,
                () -> service.getFinalResult(EVE, 77L));
    }

    @Test
    @DisplayName("a candidate who has not interviewed is told the result comes later")
    void beforeInterviewTheCandidateIsToldToWait() {
        application.setStatus(ApplicationStatus.SHORTLISTED);

        CandidateFinalResultDto result = service.getFinalResult(CARA, 77L);

        assertFalse(result.isAnnounced());
        assertTrue(result.getMessage().contains("completed the interview"));
    }

    @Test
    @DisplayName("the application status is reported unchanged alongside the result")
    void resultCarriesTheApplicationStatus() {
        when(hiringDecisionRepository.findPublishedForCandidate(77L, 20L))
                .thenReturn(Optional.of(published(HiringDecisionValue.SELECTED)));

        CandidateFinalResultDto result = service.getFinalResult(CARA, 77L);

        assertEquals("INTERVIEWED", result.getApplicationStatus());
        assertEquals("Interview completed", result.getApplicationStatusLabel());
    }

    // ---- Nothing decides on its own ----------------------------------

    @Test
    @DisplayName("a high interview score does not select anybody")
    void scoreDoesNotDecide() {
        completedInterview.setScore(98);

        HiringDecisionDto dto = service.getForRecruiter(RITA, 77L);

        assertEquals("PENDING", dto.getDecision());
        verify(hiringDecisionRepository, never()).save(any());
    }

    @Test
    @DisplayName("a low interview score does not reject anybody")
    void lowScoreDoesNotDecide() {
        completedInterview.setScore(3);

        HiringDecisionDto dto = service.getForRecruiter(RITA, 77L);

        assertEquals("PENDING", dto.getDecision());
        assertFalse(dto.isPublished());
    }

    @Test
    @DisplayName("the recruiter's chosen value is stored exactly, whatever the score")
    void theRecruitersChoiceIsWhatIsStored() {
        completedInterview.setScore(95);

        service.saveDraft(RITA, 77L, request(HiringDecisionValue.NOT_SELECTED));

        ArgumentCaptor<HiringDecision> captor = ArgumentCaptor.forClass(HiringDecision.class);
        verify(hiringDecisionRepository, times(1)).save(captor.capture());

        assertEquals(HiringDecisionValue.NOT_SELECTED, captor.getValue().getDecision());
    }

    @Test
    @DisplayName("blank feedback and notes are stored as nothing rather than empty text")
    void blankTextIsNormalised() {
        service.saveDraft(RITA, 77L, HiringDecisionRequestDto.builder()
                .decision(HiringDecisionValue.SELECTED)
                .candidateFeedback("   ")
                .internalNotes("")
                .build());

        ArgumentCaptor<HiringDecision> captor = ArgumentCaptor.forClass(HiringDecision.class);
        verify(hiringDecisionRepository).save(captor.capture());

        assertNull(captor.getValue().getCandidateFeedback());
        assertNull(captor.getValue().getInternalNotes());
    }

    @Test
    @DisplayName("an unknown application is not found rather than decided on")
    void unknownApplication() {
        when(jobApplicationRepository.findByIdForRecruiter(404L, 10L))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.saveDraft(RITA, 404L, request(HiringDecisionValue.SELECTED)));
    }

    @Test
    @DisplayName("the audit trail is append-only: nothing deletes an event")
    void auditTrailIsAppendOnly() {
        when(hiringDecisionRepository.findByJobApplicationId(77L))
                .thenReturn(Optional.of(draft(HiringDecisionValue.SELECTED)));

        service.publish(RITA, 77L);

        verify(hiringDecisionEventRepository, never()).delete(any());
        verify(hiringDecisionEventRepository, never()).deleteAll();
        verify(hiringDecisionEventRepository, never()).deleteAll(List.of());
    }
}
