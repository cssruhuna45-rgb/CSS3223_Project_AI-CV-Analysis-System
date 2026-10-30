package com.aiinterview.service;

import com.aiinterview.dto.CandidateApplicationDto;
import com.aiinterview.dto.JobApplicationRequestDto;
import com.aiinterview.entity.ApplicationStatus;
import com.aiinterview.entity.JobApplication;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.Resume;
import com.aiinterview.entity.ResumeAnalysis;
import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import com.aiinterview.exception.BadRequestException;
import com.aiinterview.exception.ConflictException;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.HiringDecisionRepository;
import com.aiinterview.repository.JobApplicationRepository;
import com.aiinterview.repository.JobPostingRepository;
import com.aiinterview.repository.ResumeAnalysisRepository;
import com.aiinterview.repository.ResumeRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.impl.JobApplicationServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests for submitting a job application.
 *
 * <p>Most of these are refusals. An application carries a CV to a
 * stranger on the strength of a consent tick, so every way of getting
 * one created that should not be allowed - no consent, someone else's
 * CV, a second application, a job that is not ready - has a test.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class JobApplicationServiceTest {

    private static final String CANDIDATE = "cara@example.com";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private JobApplicationRepository jobApplicationRepository;

    @Mock
    private HiringDecisionRepository hiringDecisionRepository;

    @Mock
    private JobPostingRepository jobPostingRepository;

    @Mock
    private ResumeRepository resumeRepository;

    @Mock
    private ResumeAnalysisRepository resumeAnalysisRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SkillMatchService skillMatchService;

    @Mock
    private InterviewEligibilityService interviewEligibilityService;

    private JobApplicationServiceImpl service;

    private User candidate;
    private User recruiter;
    private JobPosting job;
    private Resume resume;

    @BeforeEach
    void setUp() {

        service = new JobApplicationServiceImpl(
                jobApplicationRepository,
                hiringDecisionRepository,
                jobPostingRepository,
                resumeRepository,
                resumeAnalysisRepository,
                userRepository,
                skillMatchService,
                interviewEligibilityService,
                objectMapper
        );

        candidate = User.builder().id(20L).name("Cara").email(CANDIDATE).role(Role.CANDIDATE).build();
        recruiter = User.builder().id(10L).name("Rita").email("rita@example.com").role(Role.RECRUITER).build();

        job = JobPosting.builder()
                .id(5L)
                .recruiter(recruiter)
                .title("Java Backend Intern")
                .company("Example Co")
                .inviteCode("ABCD-EF23")
                .open(true)
                .requiredSkills(new java.util.ArrayList<>(List.of("java", "docker")))
                .build();

        resume = Resume.builder()
                .id(31L)
                .user(candidate)
                .originalFileName("cara-cv.pdf")
                .build();

        when(userRepository.findByEmail(CANDIDATE)).thenReturn(Optional.of(candidate));
        when(userRepository.findByEmail("rita@example.com")).thenReturn(Optional.of(recruiter));
        when(jobPostingRepository.findById(5L)).thenReturn(Optional.of(job));
        when(resumeRepository.findByIdAndUserId(31L, 20L)).thenReturn(Optional.of(resume));
        when(jobApplicationRepository.existsByJobPostingIdAndCandidateId(5L, 20L)).thenReturn(false);
        when(resumeAnalysisRepository.findByResumeId(31L)).thenReturn(Optional.empty());

        when(skillMatchService.match(any(), any())).thenReturn(
                new SkillMatchService.SkillMatchResult(
                        50, 2, List.of("java"), List.of(), List.of("docker")
                )
        );

        when(jobApplicationRepository.saveAndFlush(any(JobApplication.class)))
                .thenAnswer(inv -> {
                    JobApplication saved = inv.getArgument(0);
                    saved.setId(77L);
                    return saved;
                });

        when(interviewEligibilityService.describeAccess(any())).thenReturn(
                new InterviewEligibilityService.InterviewAccess(
                        false, false, null, "Your application is still under review."
                )
        );
    }

    private JobApplicationRequestDto request(Long resumeId, boolean consent) {
        return JobApplicationRequestDto.builder()
                .resumeId(resumeId)
                .consentGranted(consent)
                .build();
    }

    // ---- The happy path ----------------------------------------------

    @Test
    @DisplayName("a new application starts under review, never shortlisted")
    void newApplicationIsUnderReview() {
        CandidateApplicationDto dto = service.apply(CANDIDATE, 5L, request(31L, true));

        assertEquals(ApplicationStatus.APPLIED.name(), dto.getStatus());
        assertEquals("Under review", dto.getStatusLabel());
        assertEquals("cara-cv.pdf", dto.getSubmittedCvFileName());
        assertEquals("Example Co", dto.getCompany());
    }

    @Test
    @DisplayName("a high match percentage still does not shortlist anybody")
    void aPerfectMatchDoesNotShortlist() {
        when(skillMatchService.match(any(), any())).thenReturn(
                new SkillMatchService.SkillMatchResult(
                        100, 2, List.of("java", "docker"), List.of(), List.of()
                )
        );

        service.apply(CANDIDATE, 5L, request(31L, true));

        assertEquals(ApplicationStatus.APPLIED, captureSaved().getStatus());
    }

    @Test
    @DisplayName("consent is recorded with its time and wording version")
    void consentIsRecorded() {
        service.apply(CANDIDATE, 5L, request(31L, true));

        JobApplication saved = captureSaved();

        assertTrue(saved.isConsentGranted());
        assertNotNull(saved.getConsentAt());
        assertEquals(JobApplication.CURRENT_CONSENT_VERSION, saved.getConsentVersion());
    }

    @Test
    @DisplayName("the match is computed once at submission and stored")
    void matchIsStored() {
        service.apply(CANDIDATE, 5L, request(31L, true));

        JobApplication saved = captureSaved();

        assertEquals(50, saved.getMatchPercentage());
        assertEquals(2, saved.getRequiredSkillCount());
        assertEquals(List.of("java"), saved.getMatchedSkills());
        assertEquals(List.of("docker"), saved.getMissingSkills());
    }

    @Test
    @DisplayName("the job's own required skills are what the CV is matched against")
    void matchUsesTheJobsRequiredSkills() {
        service.apply(CANDIDATE, 5L, request(31L, true));

        verify(skillMatchService).match(List.of("java", "docker"), List.of());
    }

    @Test
    @DisplayName("an unavailable match is stored as null, not as nought percent")
    void unavailableMatchIsNull() {
        when(skillMatchService.match(any(), any()))
                .thenReturn(SkillMatchService.SkillMatchResult.unavailable());

        service.apply(CANDIDATE, 5L, request(31L, true));

        assertNull(captureSaved().getMatchPercentage());
    }

    @Test
    @DisplayName("the CV analysis is copied onto the application as evidence")
    void analysisIsSnapshotted() {
        when(resumeAnalysisRepository.findByResumeId(31L)).thenReturn(Optional.of(
                ResumeAnalysis.builder()
                        .summary("Backend developer")
                        .skills(new java.util.ArrayList<>(List.of("Java", "Docker")))
                        .build()
        ));

        service.apply(CANDIDATE, 5L, request(31L, true));

        String snapshot = captureSaved().getAnalysisSnapshot();

        assertNotNull(snapshot);
        assertTrue(snapshot.contains("Backend developer"));
        assertTrue(snapshot.contains("Java"));
    }

    @Test
    @DisplayName("the snapshot's own skills are what the match is taken over")
    void matchUsesTheSnapshotSkills() {
        when(resumeAnalysisRepository.findByResumeId(31L)).thenReturn(Optional.of(
                ResumeAnalysis.builder()
                        .skills(new java.util.ArrayList<>(List.of("Java")))
                        .build()
        ));

        service.apply(CANDIDATE, 5L, request(31L, true));

        verify(skillMatchService).match(List.of("java", "docker"), List.of("Java"));
    }

    // ---- Consent -----------------------------------------------------

    @Test
    @DisplayName("an application without consent is refused")
    void missingConsentRefused() {
        assertThrows(BadRequestException.class,
                () -> service.apply(CANDIDATE, 5L, request(31L, false)));

        verify(jobApplicationRepository, never()).saveAndFlush(any());
    }

    // ---- The CV ------------------------------------------------------

    @Test
    @DisplayName("a candidate cannot apply with somebody else's CV")
    void foreignCvRefused() {
        // The lookup is scoped to the owner, so another candidate's
        // resume id simply is not found.
        when(resumeRepository.findByIdAndUserId(99L, 20L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.apply(CANDIDATE, 5L, request(99L, true)));

        verify(jobApplicationRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("an unknown CV is refused")
    void unknownCvRefused() {
        when(resumeRepository.findByIdAndUserId(404L, 20L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.apply(CANDIDATE, 5L, request(404L, true)));
    }

    // ---- Duplicates --------------------------------------------------

    @Test
    @DisplayName("a second application for the same job is refused")
    void duplicateRefused() {
        when(jobApplicationRepository.existsByJobPostingIdAndCandidateId(5L, 20L)).thenReturn(true);

        assertThrows(ConflictException.class,
                () -> service.apply(CANDIDATE, 5L, request(31L, true)));

        verify(jobApplicationRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("two submissions racing each other leave only one application")
    void concurrentDuplicateIsRefusedByTheConstraint() {
        // Both requests passed the exists check; the unique constraint
        // on (job, candidate) is what stops the second one.
        when(jobApplicationRepository.saveAndFlush(any(JobApplication.class)))
                .thenThrow(new DataIntegrityViolationException("uk_job_applications_job_candidate"));

        assertThrows(ConflictException.class,
                () -> service.apply(CANDIDATE, 5L, request(31L, true)));
    }

    // ---- The job -----------------------------------------------------

    @Test
    @DisplayName("a closed job takes no applications")
    void closedJobRefused() {
        job.setOpen(false);

        assertThrows(ResourceNotFoundException.class,
                () -> service.apply(CANDIDATE, 5L, request(31L, true)));
    }

    @Test
    @DisplayName("an unknown job is refused")
    void unknownJobRefused() {
        when(jobPostingRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.apply(CANDIDATE, 404L, request(31L, true)));
    }

    @Test
    @DisplayName("a job with no required skills is not ready for applications")
    void jobWithoutRequiredSkillsRefused() {
        job.setRequiredSkills(new java.util.ArrayList<>());

        BadRequestException thrown = assertThrows(BadRequestException.class,
                () -> service.apply(CANDIDATE, 5L, request(31L, true)));

        assertTrue(thrown.getMessage().contains("not ready"));
        verify(skillMatchService, never()).match(any(), any());
    }

    // ---- Who may apply -----------------------------------------------

    @Test
    @DisplayName("a recruiter account cannot apply for a job")
    void recruiterCannotApply() {
        assertThrows(BadRequestException.class,
                () -> service.apply("rita@example.com", 5L, request(31L, true)));
    }

    // ---- Reading one's own applications ------------------------------

    @Test
    @DisplayName("a candidate cannot read another candidate's application")
    void cannotReadAnotherCandidatesApplication() {
        User other = User.builder().id(99L).email("eve@example.com").role(Role.CANDIDATE).build();

        JobApplication theirs = JobApplication.builder()
                .id(88L)
                .jobPosting(job)
                .candidate(other)
                .submittedResume(resume)
                .status(ApplicationStatus.SHORTLISTED)
                .build();

        when(jobApplicationRepository.findById(88L)).thenReturn(Optional.of(theirs));

        assertThrows(ResourceNotFoundException.class,
                () -> service.getMine(CANDIDATE, 88L));
    }

    private JobApplication captureSaved() {
        ArgumentCaptor<JobApplication> captor = ArgumentCaptor.forClass(JobApplication.class);
        verify(jobApplicationRepository).saveAndFlush(captor.capture());
        return captor.getValue();
    }
}
