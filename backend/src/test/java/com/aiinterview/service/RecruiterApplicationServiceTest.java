package com.aiinterview.service;

import com.aiinterview.dto.ApplicantDetailDto;
import com.aiinterview.dto.ApplicantSummaryDto;
import com.aiinterview.dto.ApplicationDecisionRequestDto;
import com.aiinterview.dto.JobComparisonDto;
import com.aiinterview.entity.ApplicationStatus;
import com.aiinterview.entity.InterviewSession;
import com.aiinterview.entity.JobApplication;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.JobQuestion;
import com.aiinterview.entity.Resume;
import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import com.aiinterview.exception.BadRequestException;
import com.aiinterview.exception.ConflictException;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.HiringDecisionRepository;
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.repository.JobApplicationRepository;
import com.aiinterview.repository.JobPostingRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.impl.RecruiterApplicationServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests for the recruiter's side: reading applicants, deciding on them,
 * and comparing the ones who interviewed.
 *
 * <p>The isolation tests are the important ones. Every lookup is scoped
 * by the recruiter inside its query, so one recruiter asking for
 * another's job, applicant or comparison gets "not found" - which is
 * what stops an id guessed from a URL turning into somebody else's
 * candidate list.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RecruiterApplicationServiceTest {

    private static final String RITA = "rita@example.com";
    private static final String OTHER_RECRUITER = "ron@example.com";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private JobApplicationRepository jobApplicationRepository;

    @Mock
    private HiringDecisionRepository hiringDecisionRepository;

    @Mock
    private JobPostingRepository jobPostingRepository;

    @Mock
    private InterviewSessionRepository interviewSessionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JobQuestionService jobQuestionService;

    private RecruiterApplicationServiceImpl service;

    private User rita;
    private User ron;
    private User candidate;
    private JobPosting job;
    private JobApplication application;

    @BeforeEach
    void setUp() {

        service = new RecruiterApplicationServiceImpl(
                jobApplicationRepository,
                hiringDecisionRepository,
                jobPostingRepository,
                interviewSessionRepository,
                userRepository,
                jobQuestionService,
                objectMapper
        );

        rita = User.builder().id(10L).name("Rita").email(RITA).role(Role.RECRUITER).build();
        ron = User.builder().id(11L).name("Ron").email(OTHER_RECRUITER).role(Role.RECRUITER).build();
        candidate = User.builder().id(20L).name("Cara").email("cara@example.com").role(Role.CANDIDATE).build();

        job = JobPosting.builder()
                .id(5L)
                .recruiter(rita)
                .title("Java Backend Intern")
                .open(true)
                .questionsApprovedAt(LocalDateTime.now())
                .requiredSkills(new java.util.ArrayList<>(List.of("java", "docker")))
                .build();

        application = JobApplication.builder()
                .id(77L)
                .jobPosting(job)
                .candidate(candidate)
                .submittedResume(Resume.builder().id(31L).originalFileName("cara-cv.pdf").build())
                .status(ApplicationStatus.APPLIED)
                .matchPercentage(75)
                .requiredSkillCount(4)
                .matchedSkills(new java.util.ArrayList<>(List.of("java")))
                .missingSkills(new java.util.ArrayList<>(List.of("docker")))
                .appliedAt(LocalDateTime.now())
                .consentGranted(true)
                .consentVersion("v1")
                .build();

        when(userRepository.findByEmail(RITA)).thenReturn(Optional.of(rita));
        when(userRepository.findByEmail(OTHER_RECRUITER)).thenReturn(Optional.of(ron));

        when(jobPostingRepository.findByIdAndRecruiterId(5L, 10L)).thenReturn(Optional.of(job));
        when(jobPostingRepository.findByIdAndRecruiterId(5L, 11L)).thenReturn(Optional.empty());

        when(jobApplicationRepository.findByIdForRecruiter(77L, 10L)).thenReturn(Optional.of(application));
        when(jobApplicationRepository.findByIdForRecruiter(77L, 11L)).thenReturn(Optional.empty());

        when(jobApplicationRepository.findForRecruiterJob(5L, 10L)).thenReturn(List.of(application));
        when(interviewSessionRepository.findCompletedForRecruiterJob(any(), any())).thenReturn(List.of());
        when(interviewSessionRepository.findByJobApplicationId(77L)).thenReturn(Optional.empty());
        when(jobApplicationRepository.save(any(JobApplication.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private ApplicationDecisionRequestDto decision(ApplicationStatus status) {
        return ApplicationDecisionRequestDto.builder().decision(status).build();
    }

    // ---- Reading -----------------------------------------------------

    @Test
    @DisplayName("the applicant list carries the stored match, not a fresh one")
    void listShowsStoredMatch() {
        List<ApplicantSummaryDto> applicants = service.listApplicants(RITA, 5L);

        assertEquals(1, applicants.size());
        assertEquals(75, applicants.get(0).getMatch().getMatchPercentage());
        assertEquals(4, applicants.get(0).getMatch().getRequiredSkillCount());
        assertEquals("Cara", applicants.get(0).getCandidateName());
        assertEquals("Under review", applicants.get(0).getStatusLabel());
    }

    @Test
    @DisplayName("a recruiter cannot list applicants for another recruiter's job")
    void cannotListAnotherRecruitersApplicants() {
        assertThrows(ResourceNotFoundException.class,
                () -> service.listApplicants(OTHER_RECRUITER, 5L));

        // Refused before any applicant was read, so an empty list never
        // reveals that the job exists.
        verify(jobApplicationRepository, never()).findForRecruiterJob(any(), any());
    }

    @Test
    @DisplayName("the applicant detail shows the job's requirements beside the CV snapshot")
    void detailShowsRequirementsAndSnapshot() {
        application.setAnalysisSnapshot(
                "{\"summary\":\"Backend developer\",\"skills\":[\"Java\"],"
                        + "\"experience\":[{\"company\":\"Acme\",\"role\":\"Intern\",\"duration\":\"2023\"}],"
                        + "\"education\":[],\"certifications\":[]}"
        );

        ApplicantDetailDto detail = service.getApplicant(RITA, 77L);

        assertEquals(List.of("java", "docker"), detail.getRequiredSkills());
        assertEquals("Backend developer", detail.getCvSnapshot().getSummary());
        assertEquals(List.of("Java"), detail.getCvSnapshot().getSkills());
        assertTrue(detail.isDecisionOpen());
        assertEquals("Intern · Acme · 2023", detail.getSummary().getExperienceSummary());
    }

    @Test
    @DisplayName("an unreadable CV snapshot leaves the applicant readable")
    void brokenSnapshotDoesNotBreakTheApplicant() {
        application.setAnalysisSnapshot("{not json at all");

        ApplicantDetailDto detail = service.getApplicant(RITA, 77L);

        assertNotNull(detail.getCvSnapshot());
        assertEquals(List.of(), detail.getCvSnapshot().getSkills());
    }

    @Test
    @DisplayName("a recruiter cannot open another recruiter's applicant")
    void cannotOpenAnotherRecruitersApplicant() {
        assertThrows(ResourceNotFoundException.class,
                () -> service.getApplicant(OTHER_RECRUITER, 77L));
    }

    // ---- Deciding ----------------------------------------------------

    @Test
    @DisplayName("shortlisting records the decision, the actor and the time")
    void shortlistRecordsDecision() {
        ApplicantSummaryDto updated = service.decide(RITA, 77L, decision(ApplicationStatus.SHORTLISTED));

        assertEquals("SHORTLISTED", updated.getStatus());
        assertEquals("Shortlisted", updated.getStatusLabel());
        assertEquals(ApplicationStatus.SHORTLISTED, application.getStatus());
        assertEquals(rita, application.getDecidedBy());
        assertNotNull(application.getDecidedAt());
    }

    @Test
    @DisplayName("rejecting records the decision too")
    void rejectRecordsDecision() {
        service.decide(RITA, 77L, decision(ApplicationStatus.REJECTED));

        assertEquals(ApplicationStatus.REJECTED, application.getStatus());
        assertNotNull(application.getDecidedAt());
    }

    @Test
    @DisplayName("a recruiter cannot decide on another recruiter's applicant")
    void cannotDecideForAnotherRecruiter() {
        assertThrows(ResourceNotFoundException.class,
                () -> service.decide(OTHER_RECRUITER, 77L, decision(ApplicationStatus.SHORTLISTED)));

        assertEquals(ApplicationStatus.APPLIED, application.getStatus());
    }

    @Test
    @DisplayName("a recruiter cannot mark an applicant interviewed by hand")
    void cannotSetInterviewed() {
        assertThrows(BadRequestException.class,
                () -> service.decide(RITA, 77L, decision(ApplicationStatus.INTERVIEWED)));
    }

    @Test
    @DisplayName("a recruiter cannot put an applicant back under review")
    void cannotSetApplied() {
        application.setStatus(ApplicationStatus.SHORTLISTED);

        assertThrows(BadRequestException.class,
                () -> service.decide(RITA, 77L, decision(ApplicationStatus.APPLIED)));
    }

    @Test
    @DisplayName("re-sending the same decision is harmless")
    void repeatedDecisionIsANoOp() {
        application.setStatus(ApplicationStatus.SHORTLISTED);
        LocalDateTime decidedAt = LocalDateTime.now().minusDays(1);
        application.setDecidedAt(decidedAt);

        ApplicantSummaryDto result = service.decide(RITA, 77L, decision(ApplicationStatus.SHORTLISTED));

        assertEquals("SHORTLISTED", result.getStatus());
        // The original decision time stands; it was not re-stamped.
        assertEquals(decidedAt, application.getDecidedAt());
        verify(jobApplicationRepository, never()).save(any());
    }

    @Test
    @DisplayName("a rejection cannot be quietly turned into a shortlisting")
    void cannotReverseARejection() {
        application.setStatus(ApplicationStatus.REJECTED);

        assertThrows(ConflictException.class,
                () -> service.decide(RITA, 77L, decision(ApplicationStatus.SHORTLISTED)));

        assertEquals(ApplicationStatus.REJECTED, application.getStatus());
    }

    @Test
    @DisplayName("a shortlisting cannot be quietly turned into a rejection")
    void cannotReverseAShortlisting() {
        application.setStatus(ApplicationStatus.SHORTLISTED);

        assertThrows(ConflictException.class,
                () -> service.decide(RITA, 77L, decision(ApplicationStatus.REJECTED)));
    }

    @Test
    @DisplayName("an applicant who has interviewed cannot be decided on again")
    void cannotDecideAfterInterview() {
        application.setStatus(ApplicationStatus.INTERVIEWED);

        assertThrows(ConflictException.class,
                () -> service.decide(RITA, 77L, decision(ApplicationStatus.REJECTED)));
    }

    // ---- Comparing ---------------------------------------------------

    @Test
    @DisplayName("the comparison lays out the approved questions as columns")
    void comparisonUsesApprovedQuestions() {
        when(jobQuestionService.getApprovedQuestions(job)).thenReturn(List.of(
                JobQuestion.builder()
                        .id(1L).position(1).questionText("How does an index speed up a query?")
                        .difficulty("easy").topic("Databases").build(),
                JobQuestion.builder()
                        .id(2L).position(2).questionText("When would you use a message queue?")
                        .difficulty("medium").topic("Architecture").build()
        ));

        JobComparisonDto comparison = service.compare(RITA, 5L);

        assertEquals(2, comparison.getQuestions().size());
        assertEquals(1L, comparison.getQuestions().get(0).getId());
        assertEquals("Databases", comparison.getQuestions().get(0).getTopic());
    }

    @Test
    @DisplayName("a candidate's per-question grading is read from the stored scorecard")
    void comparisonReadsStoredGrading() {
        application.setStatus(ApplicationStatus.INTERVIEWED);

        InterviewSession session = InterviewSession.builder()
                .sessionId("s-1")
                .jobPosting(job)
                .jobApplication(application)
                .status(InterviewSession.STATUS_COMPLETED)
                .score(68)
                .feedbackSummary("Solid on basics.")
                .completedAt(LocalDateTime.now())
                .feedbackJson("""
                        {"evaluated": true, "overall_score": 68,
                         "per_question": [
                           {"question_number": 1, "question_id": 1, "score": 80,
                            "verdict": "strong", "answer": "B-trees narrow the search.",
                            "what_was_good": "Named the structure.",
                            "what_was_missing": "No mention of cost."}
                         ]}""")
                .build();

        when(interviewSessionRepository.findCompletedForRecruiterJob(5L, 10L))
                .thenReturn(List.of(session));

        JobComparisonDto comparison = service.compare(RITA, 5L);

        assertEquals(1, comparison.getCandidates().size());

        var candidateColumn = comparison.getCandidates().get(0);

        assertEquals("Cara", candidateColumn.getCandidateName());
        // The two numbers stay distinct: CV match and interview score.
        assertEquals(75, candidateColumn.getMatchPercentage());
        assertEquals(68, candidateColumn.getInterviewScore());
        assertEquals(1, candidateColumn.getAnswers().size());
        assertEquals(1L, candidateColumn.getAnswers().get(0).getQuestionId());
        assertEquals(80, candidateColumn.getAnswers().get(0).getScore());
        assertEquals("strong", candidateColumn.getAnswers().get(0).getVerdict());
    }

    @Test
    @DisplayName("an ungraded interview shows no score rather than nought")
    void ungradedInterviewHasNoScore() {
        application.setStatus(ApplicationStatus.INTERVIEWED);

        InterviewSession session = InterviewSession.builder()
                .sessionId("s-2")
                .jobPosting(job)
                .jobApplication(application)
                .status(InterviewSession.STATUS_COMPLETED)
                .score(null)
                .feedbackJson("{\"evaluated\": false}")
                .build();

        when(interviewSessionRepository.findCompletedForRecruiterJob(5L, 10L))
                .thenReturn(List.of(session));

        assertNull(service.compare(RITA, 5L).getCandidates().get(0).getInterviewScore());
    }

    @Test
    @DisplayName("an unreadable scorecard still leaves the candidate in the comparison")
    void brokenScorecardLeavesTheCandidate() {
        application.setStatus(ApplicationStatus.INTERVIEWED);

        InterviewSession session = InterviewSession.builder()
                .sessionId("s-3")
                .jobPosting(job)
                .jobApplication(application)
                .status(InterviewSession.STATUS_COMPLETED)
                .score(50)
                .feedbackJson("{broken")
                .build();

        when(interviewSessionRepository.findCompletedForRecruiterJob(5L, 10L))
                .thenReturn(List.of(session));

        var column = service.compare(RITA, 5L).getCandidates().get(0);

        assertEquals(50, column.getInterviewScore());
        assertEquals(List.of(), column.getAnswers());
    }

    @Test
    @DisplayName("an unapproved job compares nothing rather than failing")
    void unapprovedJobHasNoQuestionColumns() {
        job.setQuestionsApprovedAt(null);

        JobComparisonDto comparison = service.compare(RITA, 5L);

        assertEquals(List.of(), comparison.getQuestions());
        verify(jobQuestionService, never()).getApprovedQuestions(any());
    }

    @Test
    @DisplayName("a job with nobody finished shows an empty comparison")
    void emptyComparison() {
        when(jobQuestionService.getApprovedQuestions(job)).thenReturn(List.of());

        JobComparisonDto comparison = service.compare(RITA, 5L);

        assertEquals(List.of(), comparison.getCandidates());
        assertEquals("Java Backend Intern", comparison.getJobTitle());
    }

    @Test
    @DisplayName("a recruiter cannot compare another recruiter's job")
    void cannotCompareAnotherRecruitersJob() {
        assertThrows(ResourceNotFoundException.class,
                () -> service.compare(OTHER_RECRUITER, 5L));

        verify(interviewSessionRepository, never())
                .findCompletedForRecruiterJob(any(), any());
    }

    @Test
    @DisplayName("the comparison offers no automatic winner")
    void comparisonDoesNotPickAWinner() {
        // A deliberate absence: the DTO has no "best candidate" field
        // for a caller to lean on, because selection is the recruiter's.
        when(jobQuestionService.getApprovedQuestions(job)).thenReturn(List.of());

        JobComparisonDto comparison = service.compare(RITA, 5L);

        assertFalse(
                java.util.Arrays.stream(JobComparisonDto.class.getDeclaredFields())
                        .anyMatch(f -> f.getName().toLowerCase().contains("best")
                                || f.getName().toLowerCase().contains("recommend")
                                || f.getName().toLowerCase().contains("winner")),
                "the comparison must not rank or recommend a candidate"
        );
        assertNotNull(comparison);
    }
}
