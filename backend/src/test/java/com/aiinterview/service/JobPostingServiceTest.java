package com.aiinterview.service;

import com.aiinterview.dto.JobPostingDto;
import com.aiinterview.dto.JobPostingRequestDto;
import com.aiinterview.entity.InterviewSession;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import com.aiinterview.exception.BadRequestException;
import com.aiinterview.exception.ConflictException;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.exception.UnauthorizedAccessException;
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.repository.JobPostingRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.impl.JobPostingServiceImpl;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class JobPostingServiceTest {

    private static final String CODE = "ABCD-EF23";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private JobPostingRepository jobPostingRepository;

    @Mock
    private InterviewSessionRepository interviewSessionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JobQuestionService jobQuestionService;

    @InjectMocks
    private JobPostingServiceImpl service;

    private User recruiter;
    private User candidate;
    private JobPosting job;

    @BeforeEach
    void setUp() {
        recruiter = User.builder().id(10L).name("Rita").email("rita@example.com").role(Role.RECRUITER).build();
        candidate = User.builder().id(20L).name("Cara").email("cara@example.com").role(Role.CANDIDATE).build();

        job = JobPosting.builder()
                .id(5L)
                .recruiter(recruiter)
                .title("Java Backend Intern")
                .jobField("backend_development")
                .jobDescription("Build REST APIs in Spring Boot with PostgreSQL.")
                .inviteCode(CODE)
                .open(true)
                .build();

        when(userRepository.findByEmail("rita@example.com")).thenReturn(Optional.of(recruiter));
        when(userRepository.findByEmail("cara@example.com")).thenReturn(Optional.of(candidate));
        when(jobPostingRepository.findByInviteCode(CODE)).thenReturn(Optional.of(job));

        // The approved set as JobQuestionService hands it over.
        ArrayNode approved = objectMapper.createArrayNode();
        approved.addObject().put("position", 1).put("question", "How does an index speed up a query?");
        when(jobQuestionService.fixedQuestionsPayload(job)).thenReturn(approved);
    }

    private JsonNode json(String raw) throws Exception {
        return objectMapper.readTree(raw);
    }

    // ---- Creating jobs ----------------------------------------------

    @Test
    @DisplayName("a new job is open and gets a readable invite code")
    void createsJobWithCode() {
        when(jobPostingRepository.existsByInviteCode(anyString())).thenReturn(false);
        when(jobPostingRepository.save(any(JobPosting.class))).thenAnswer(inv -> inv.getArgument(0));

        JobPostingDto created = service.create("rita@example.com", JobPostingRequestDto.builder()
                .title("  React Intern ")
                .company("")
                .jobField("frontend_development")
                .jobDescription("Build accessible React components with tests.")
                .requiredSkills(List.of(" React ", "react", "TypeScript", ""))
                .questionCount(7)
                .build());

        assertTrue(created.isOpen());
        // Normalised once, here, so matching never sees two spellings.
        assertEquals(List.of("react", "typescript"), created.getRequiredSkills());
        assertEquals(7, created.getQuestionCount());
        // A new job has no approved questions: not ready yet.
        assertFalse(created.isQuestionsApproved());
        assertEquals("React Intern", created.getTitle());
        // No 0/O or 1/I/L: the code has to survive being read aloud.
        assertTrue(created.getInviteCode().matches("[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}"),
                created.getInviteCode());
    }

    @Test
    @DisplayName("a job field the AI service does not know is refused")
    void rejectsUnknownField() {
        assertThrows(BadRequestException.class, () -> service.create("rita@example.com",
                JobPostingRequestDto.builder()
                        .title("Chef")
                        .jobField("cooking")
                        .jobDescription("Make very good soup for the whole office.")
                        .build()));

        verify(jobPostingRepository, never()).save(any());
    }

    @Test
    @DisplayName("a job needs at least one real required skill")
    void requiresSkills() {
        assertThrows(BadRequestException.class, () -> service.create("rita@example.com",
                JobPostingRequestDto.builder()
                        .title("React Intern")
                        .jobField("frontend_development")
                        .jobDescription("Build accessible React components with tests.")
                        .requiredSkills(List.of("  ", ""))
                        .build()));

        verify(jobPostingRepository, never()).save(any());
    }

    @Test
    @DisplayName("question count outside 5-10 is refused")
    void questionCountBounds() {
        assertThrows(BadRequestException.class, () -> service.create("rita@example.com",
                JobPostingRequestDto.builder()
                        .title("React Intern")
                        .jobField("frontend_development")
                        .jobDescription("Build accessible React components with tests.")
                        .requiredSkills(List.of("react"))
                        .questionCount(11)
                        .build()));
    }

    @Test
    @DisplayName("a recruiter cannot close another recruiter's job")
    void cannotCloseOthersJob() {
        when(jobPostingRepository.findByIdAndRecruiterId(5L, 10L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.setOpen("rita@example.com", 5L, false));
    }

    // ---- Codes ------------------------------------------------------

    @Test
    @DisplayName("codes typed in lower case, with spaces or no dash still match")
    void normalizesCodes() {
        assertEquals(Optional.of(CODE), service.normalizeCode("abcd ef23"));
        assertEquals(Optional.of(CODE), service.normalizeCode(" ABCDEF23 "));
        assertEquals(Optional.empty(), service.normalizeCode("ABC"));
        assertEquals(Optional.empty(), service.normalizeCode(null));
    }

    // ---- Starting an interview with a code --------------------------

    @Test
    @DisplayName("without a code the start request is left untouched")
    void noCodeNoChange() throws Exception {
        JsonNode request = json("{\"job_description\": \"anything at all goes here\", \"mode\": \"practice\"}");

        assertSame(request, service.applyInvite("cara@example.com", request));
    }

    @Test
    @DisplayName("the browser cannot pick its own fixed question set")
    void browserFixedQuestionsDropped() throws Exception {
        JsonNode request = json("""
                {"job_description": "anything at all goes here",
                 "fixed_questions": [{"position": 1, "question": "an easy one I chose"}]}""");

        JsonNode forwarded = service.applyInvite("cara@example.com", request);

        assertFalse(forwarded.has("fixed_questions"));
        assertEquals("anything at all goes here", forwarded.get("job_description").asText());
    }

    @Test
    @DisplayName("a job interview carries the approved questions and none of the CV")
    void codeAddsApprovedQuestions() throws Exception {
        JsonNode request = json("""
                {"invite_code": "ABCD-EF23",
                 "job_description": "x",
                 "candidate_resume": "my cv",
                 "matched_skills": ["kafka"],
                 "fixed_questions": [{"position": 1, "question": "an easy one I chose"}]}""");

        JsonNode forwarded = service.applyInvite("cara@example.com", request);

        assertEquals("How does an index speed up a query?",
                forwarded.get("fixed_questions").get(0).get("question").asText());
        assertEquals(1, forwarded.get("fixed_questions").size());
        assertEquals("", forwarded.get("candidate_resume").asText());
        assertEquals(0, forwarded.get("matched_skills").size());
    }

    @Test
    @DisplayName("a job without approved questions is not ready")
    void notReadyJobRefused() throws Exception {
        when(jobQuestionService.fixedQuestionsPayload(job))
                .thenThrow(new ConflictException("not ready"));

        assertThrows(ConflictException.class,
                () -> service.applyInvite("cara@example.com", json("{\"invite_code\": \"" + CODE + "\"}")));
    }

    @Test
    @DisplayName("the invite preview says whether the interview is ready")
    void previewShowsReadiness() {
        assertFalse(service.previewInvite("cara@example.com", CODE).isInterviewReady());

        job.setQuestionsApprovedAt(LocalDateTime.now());

        assertTrue(service.previewInvite("cara@example.com", CODE).isInterviewReady());
    }

    // ---- Expected answers during a job interview ---------------------

    @Test
    @DisplayName("no expected answer for a running job interview's session")
    void modelAnswerRefusedForJobSession() throws Exception {
        InterviewSession running = InterviewSession.builder()
                .sessionId("s-1").jobPosting(job).status(InterviewSession.STATUS_ACTIVE).build();
        when(interviewSessionRepository.findBySessionId("s-1")).thenReturn(Optional.of(running));

        assertThrows(UnauthorizedAccessException.class,
                () -> service.requireNoJobInterviewInProgress("cara@example.com", json("{\"session_id\": \"s-1\"}")));
    }

    @Test
    @DisplayName("no expected answer without a session id while a job interview runs")
    void modelAnswerRefusedWhileJobInterviewRuns() throws Exception {
        when(interviewSessionRepository.existsByUserIdAndJobPostingIsNotNullAndStatusAndUpdatedAtAfter(
                eq(20L), eq(InterviewSession.STATUS_ACTIVE), any())).thenReturn(true);

        assertThrows(UnauthorizedAccessException.class,
                () -> service.requireNoJobInterviewInProgress("cara@example.com", json("{\"question\": \"q\"}")));
    }

    @Test
    @DisplayName("practice keeps its expected answers")
    void modelAnswerAllowedInPractice() throws Exception {
        InterviewSession practice = InterviewSession.builder()
                .sessionId("p-1").status(InterviewSession.STATUS_ACTIVE).build();
        when(interviewSessionRepository.findBySessionId("p-1")).thenReturn(Optional.of(practice));

        assertDoesNotThrow(
                () -> service.requireNoJobInterviewInProgress("cara@example.com", json("{\"session_id\": \"p-1\"}")));
    }

    @Test
    @DisplayName("a code replaces the job text, forces exam mode and drops the CV")
    void codeRewritesRequest() throws Exception {
        JsonNode request = json("""
                {"invite_code": "abcd-ef23",
                 "job_description": "an easier job the candidate typed",
                 "job_field": "qa_testing",
                 "mode": "practice",
                 "candidate_resume": "my cv"}""");

        JsonNode forwarded = service.applyInvite("cara@example.com", request);

        assertEquals(job.getJobDescription(), forwarded.get("job_description").asText());
        assertEquals("backend_development", forwarded.get("job_field").asText());
        assertEquals("exam", forwarded.get("mode").asText());
        assertEquals(CODE, forwarded.get("invite_code").asText());
        // Job questions are the same for everyone; the CV must not reach them.
        assertEquals("", forwarded.get("candidate_resume").asText());
    }

    @Test
    @DisplayName("a closed job takes no new candidates")
    void closedJobRefused() throws Exception {
        job.setOpen(false);

        assertThrows(ResourceNotFoundException.class,
                () -> service.applyInvite("cara@example.com", json("{\"invite_code\": \"" + CODE + "\"}")));
    }

    @Test
    @DisplayName("only candidates can take a job interview")
    void recruiterCannotJoin() throws Exception {
        assertThrows(BadRequestException.class,
                () -> service.applyInvite("rita@example.com", json("{\"invite_code\": \"" + CODE + "\"}")));
    }

    @Test
    @DisplayName("one completed attempt per job")
    void secondAttemptRefused() throws Exception {
        when(interviewSessionRepository.existsByUserIdAndJobPostingIdAndStatus(
                20L, 5L, InterviewSession.STATUS_COMPLETED)).thenReturn(true);

        assertThrows(ConflictException.class,
                () -> service.applyInvite("cara@example.com", json("{\"invite_code\": \"" + CODE + "\"}")));
    }
}
