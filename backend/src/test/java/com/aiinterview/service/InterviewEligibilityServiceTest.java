package com.aiinterview.service;

import com.aiinterview.entity.ApplicationStatus;
import com.aiinterview.entity.InterviewSession;
import com.aiinterview.entity.JobApplication;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import com.aiinterview.exception.BadRequestException;
import com.aiinterview.exception.ConflictException;
import com.aiinterview.exception.UnauthorizedAccessException;
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.repository.JobApplicationRepository;
import com.aiinterview.service.impl.InterviewEligibilityServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

/**
 * Tests for the one gate between a candidate and a job's interview.
 *
 * <p>This is the security-critical class of the application workflow:
 * every refusal here is a refusal that the frontend hiding a button
 * does not provide. Each check gets a test for the refusal and the
 * suite as a whole pins down that only a shortlisted candidate, on an
 * open and approved job, with an unused attempt, gets through.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class InterviewEligibilityServiceTest {

    @Mock
    private JobApplicationRepository jobApplicationRepository;

    @Mock
    private InterviewSessionRepository interviewSessionRepository;

    @InjectMocks
    private InterviewEligibilityServiceImpl service;

    private User candidate;
    private User recruiter;
    private JobPosting job;
    private JobApplication application;

    @BeforeEach
    void setUp() {

        candidate = User.builder().id(20L).email("cara@example.com").role(Role.CANDIDATE).build();
        recruiter = User.builder().id(10L).email("rita@example.com").role(Role.RECRUITER).build();

        job = JobPosting.builder()
                .id(5L)
                .recruiter(recruiter)
                .title("Java Backend Intern")
                .open(true)
                .questionsApprovedAt(LocalDateTime.now())
                .build();

        application = JobApplication.builder()
                .id(77L)
                .jobPosting(job)
                .candidate(candidate)
                .status(ApplicationStatus.SHORTLISTED)
                .build();

        when(jobApplicationRepository.findByJobPostingIdAndCandidateId(5L, 20L))
                .thenReturn(Optional.of(application));

        // No attempt made yet, unless a test says otherwise.
        when(interviewSessionRepository.findByJobApplicationId(77L))
                .thenReturn(Optional.empty());
    }

    // ---- The one path that is allowed --------------------------------

    @Test
    @DisplayName("a shortlisted candidate on an approved, open job may start")
    void shortlistedCandidateIsEligible() {
        JobApplication eligible = service.requireEligibleApplication(candidate, job);

        assertSame(application, eligible);
    }

    // ---- Account type ------------------------------------------------

    @Test
    @DisplayName("a recruiter account cannot sit a job interview")
    void recruiterRefused() {
        assertThrows(BadRequestException.class,
                () -> service.requireEligibleApplication(recruiter, job));
    }

    @Test
    @DisplayName("an administrator account cannot sit a job interview")
    void adminRefused() {
        User admin = User.builder().id(1L).email("a@example.com").role(Role.ADMIN).build();

        assertThrows(BadRequestException.class,
                () -> service.requireEligibleApplication(admin, job));
    }

    // ---- An application of their own ---------------------------------

    @Test
    @DisplayName("a candidate who never applied cannot start the interview")
    void withoutApplicationRefused() {
        when(jobApplicationRepository.findByJobPostingIdAndCandidateId(5L, 20L))
                .thenReturn(Optional.empty());

        assertThrows(UnauthorizedAccessException.class,
                () -> service.requireEligibleApplication(candidate, job));
    }

    @Test
    @DisplayName("the application is looked up by the candidate from the token, not from a request")
    void applicationIsScopedToTheCandidate() {
        User other = User.builder().id(99L).email("eve@example.com").role(Role.CANDIDATE).build();

        // Eve has no application for this job; Cara's must not serve.
        when(jobApplicationRepository.findByJobPostingIdAndCandidateId(5L, 99L))
                .thenReturn(Optional.empty());

        assertThrows(UnauthorizedAccessException.class,
                () -> service.requireEligibleApplication(other, job));
    }

    // ---- Status ------------------------------------------------------

    @Test
    @DisplayName("an application still under review does not open the interview")
    void appliedRefused() {
        application.setStatus(ApplicationStatus.APPLIED);

        ConflictException thrown = assertThrows(ConflictException.class,
                () -> service.requireEligibleApplication(candidate, job));

        assertTrue(thrown.getMessage().contains("under review"));
    }

    @Test
    @DisplayName("a rejected candidate cannot start the interview")
    void rejectedRefused() {
        application.setStatus(ApplicationStatus.REJECTED);

        ConflictException thrown = assertThrows(ConflictException.class,
                () -> service.requireEligibleApplication(candidate, job));

        assertTrue(thrown.getMessage().contains("not selected"));
    }

    @Test
    @DisplayName("an interviewed candidate cannot start again")
    void interviewedRefused() {
        application.setStatus(ApplicationStatus.INTERVIEWED);

        assertThrows(ConflictException.class,
                () -> service.requireEligibleApplication(candidate, job));
    }

    // ---- The job -----------------------------------------------------

    @Test
    @DisplayName("a closed job takes no interviews even from a shortlisted candidate")
    void closedJobRefused() {
        job.setOpen(false);

        assertThrows(ConflictException.class,
                () -> service.requireEligibleApplication(candidate, job));
    }

    @Test
    @DisplayName("a job whose questions are not approved is not ready")
    void unapprovedQuestionsRefused() {
        job.setQuestionsApprovedAt(null);

        ConflictException thrown = assertThrows(ConflictException.class,
                () -> service.requireEligibleApplication(candidate, job));

        // Says the interview is not ready, not what state the draft is in.
        assertTrue(thrown.getMessage().contains("not ready"));
    }

    // ---- The one attempt ---------------------------------------------

    @Test
    @DisplayName("a completed attempt cannot be restarted")
    void completedAttemptRefused() {
        when(interviewSessionRepository.findByJobApplicationId(77L))
                .thenReturn(Optional.of(InterviewSession.builder()
                        .sessionId("s-done")
                        .status(InterviewSession.STATUS_COMPLETED)
                        .build()));

        ConflictException thrown = assertThrows(ConflictException.class,
                () -> service.requireEligibleApplication(candidate, job));

        assertTrue(thrown.getMessage().contains("already completed"));
    }

    @Test
    @DisplayName("a second start while one is running is refused, not given a new attempt")
    void runningAttemptRefused() {
        when(interviewSessionRepository.findByJobApplicationId(77L))
                .thenReturn(Optional.of(InterviewSession.builder()
                        .sessionId("s-live")
                        .status(InterviewSession.STATUS_ACTIVE)
                        .build()));

        ConflictException thrown = assertThrows(ConflictException.class,
                () -> service.requireEligibleApplication(candidate, job));

        assertTrue(thrown.getMessage().contains("already under way"));
    }

    // ---- The same rules, read for the candidate's status page --------

    @Test
    @DisplayName("the status page offers the interview to a shortlisted candidate")
    void accessAvailableWhenShortlisted() {
        InterviewEligibilityService.InterviewAccess access = service.describeAccess(application);

        assertTrue(access.available());
        assertFalse(access.resumable());
        assertNull(access.message());
    }

    @Test
    @DisplayName("the status page does not offer the interview while under review")
    void accessWithheldWhileUnderReview() {
        application.setStatus(ApplicationStatus.APPLIED);

        InterviewEligibilityService.InterviewAccess access = service.describeAccess(application);

        assertFalse(access.available());
        assertNotNull(access.message());
    }

    @Test
    @DisplayName("the status page does not offer the interview to a rejected candidate")
    void accessWithheldWhenRejected() {
        application.setStatus(ApplicationStatus.REJECTED);

        assertFalse(service.describeAccess(application).available());
    }

    @Test
    @DisplayName("a running attempt is offered as a resume, with its session")
    void accessResumesRunningAttempt() {
        when(interviewSessionRepository.findByJobApplicationId(77L))
                .thenReturn(Optional.of(InterviewSession.builder()
                        .sessionId("s-live")
                        .status(InterviewSession.STATUS_ACTIVE)
                        .build()));

        InterviewEligibilityService.InterviewAccess access = service.describeAccess(application);

        assertTrue(access.available());
        assertTrue(access.resumable());
        assertEquals("s-live", access.sessionId());
    }

    @Test
    @DisplayName("a finished attempt is not offered again")
    void accessWithheldAfterCompletion() {
        when(interviewSessionRepository.findByJobApplicationId(77L))
                .thenReturn(Optional.of(InterviewSession.builder()
                        .sessionId("s-done")
                        .status(InterviewSession.STATUS_COMPLETED)
                        .build()));

        InterviewEligibilityService.InterviewAccess access = service.describeAccess(application);

        assertFalse(access.available());
        assertNull(access.sessionId());
    }
}
