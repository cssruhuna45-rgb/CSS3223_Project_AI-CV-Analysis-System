package com.aiinterview.service;

import com.aiinterview.entity.ApplicationStatus;
import com.aiinterview.entity.InterviewSession;
import com.aiinterview.entity.InterviewTurn;
import com.aiinterview.entity.JobApplication;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import com.aiinterview.exception.BadRequestException;
import com.aiinterview.exception.ConflictException;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.exception.UnauthorizedAccessException;
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.InterviewEligibilityService.InterviewAccess;
import com.aiinterview.service.impl.InterviewResumeServiceImpl;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests for continuing a job interview after a reload.
 *
 * <p>The session id comes from the browser, so most of these are
 * refusals: somebody else's interview, a practice interview, and one
 * the candidate may no longer continue never reach the AI service.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class InterviewResumeServiceTest {

    private static final String SESSION_ID = "6f1c2d3e-session";

    @Mock
    private UserRepository userRepository;

    @Mock
    private InterviewSessionRepository interviewSessionRepository;

    @Mock
    private InterviewEligibilityService interviewEligibilityService;

    @Mock
    private JobQuestionService jobQuestionService;

    @Mock
    private AiServiceClient aiServiceClient;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private InterviewResumeServiceImpl service;

    private User candidate;
    private JobPosting job;
    private JobApplication application;
    private InterviewSession session;
    private ArrayNode fixedQuestions;

    @BeforeEach
    void setUp() {

        service = new InterviewResumeServiceImpl(
                userRepository,
                interviewSessionRepository,
                interviewEligibilityService,
                jobQuestionService,
                aiServiceClient,
                objectMapper
        );

        candidate = User.builder().id(20L).email("cara@example.com").role(Role.CANDIDATE).build();

        job = JobPosting.builder()
                .id(5L)
                .title("Java Backend Intern")
                .company("Example Company")
                .jobField("backend_development")
                .jobDescription("Build REST APIs in Spring Boot with PostgreSQL.")
                .build();

        application = JobApplication.builder()
                .id(77L)
                .jobPosting(job)
                .candidate(candidate)
                .status(ApplicationStatus.SHORTLISTED)
                .build();

        session = InterviewSession.builder()
                .sessionId(SESSION_ID)
                .user(candidate)
                .jobPosting(job)
                .jobApplication(application)
                .status(InterviewSession.STATUS_ACTIVE)
                .build();

        // Two answered, the third on screen.
        session.addTurn(InterviewTurn.builder().question("Q1").answer("A1").build());
        session.addTurn(InterviewTurn.builder().question("Q2").answer("A2").build());
        session.addTurn(InterviewTurn.builder().question("Q3").build());

        fixedQuestions = objectMapper.createArrayNode();
        fixedQuestions.addObject().put("position", 1).put("question", "Q1");

        when(userRepository.findByEmail("cara@example.com")).thenReturn(Optional.of(candidate));
        when(interviewSessionRepository.findBySessionId(SESSION_ID)).thenReturn(Optional.of(session));
        when(interviewEligibilityService.describeAccess(application))
                .thenReturn(new InterviewAccess(true, true, SESSION_ID, null));
        when(jobQuestionService.fixedQuestionsPayload(job)).thenReturn(fixedQuestions);

        ObjectNode aiResponse = objectMapper.createObjectNode();
        aiResponse.put("session_id", SESSION_ID);
        aiResponse.put("answered", 2);
        when(aiServiceClient.post(eq("/api/v1/interview/resume"), any())).thenReturn(aiResponse);
    }

    // ---- The allowed path --------------------------------------------

    @Test
    @DisplayName("sends the job's questions and the stored answers, in order")
    void sendsWhatTheAiServiceNeedsToRebuild() {

        service.resume("cara@example.com", SESSION_ID);

        ArgumentCaptor<JsonNode> sent = ArgumentCaptor.forClass(JsonNode.class);
        verify(aiServiceClient).post(eq("/api/v1/interview/resume"), sent.capture());

        JsonNode body = sent.getValue();
        assertEquals(SESSION_ID, body.get("session_id").asText());
        assertEquals(job.getJobDescription(), body.get("job_description").asText());
        assertEquals("backend_development", body.get("job_field").asText());
        assertEquals(fixedQuestions, body.get("fixed_questions"));
        assertEquals("[\"A1\",\"A2\"]", body.get("answers").toString());
    }

    @Test
    @DisplayName("adds the job's title and company for the page heading")
    void addsTheJobHeading() {

        JsonNode result = service.resume("cara@example.com", SESSION_ID);

        assertEquals("Java Backend Intern", result.get("job_title").asText());
        assertEquals("Example Company", result.get("company").asText());
        assertEquals(2, result.get("answered").asInt());
    }

    // ---- Refusals ----------------------------------------------------

    @Test
    @DisplayName("an unknown session is not found")
    void unknownSession() {
        when(interviewSessionRepository.findBySessionId("nope")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.resume("cara@example.com", "nope"));
    }

    @Test
    @DisplayName("somebody else's interview cannot be resumed")
    void otherCandidatesSession() {
        User other = User.builder().id(21L).email("olly@example.com").role(Role.CANDIDATE).build();
        when(userRepository.findByEmail("olly@example.com")).thenReturn(Optional.of(other));

        assertThrows(UnauthorizedAccessException.class,
                () -> service.resume("olly@example.com", SESSION_ID));
        verify(aiServiceClient, never()).post(anyString(), any());
    }

    @Test
    @DisplayName("a practice interview cannot be resumed")
    void practiceSession() {
        session.setJobPosting(null);
        session.setJobApplication(null);

        assertThrows(BadRequestException.class,
                () -> service.resume("cara@example.com", SESSION_ID));
        verify(aiServiceClient, never()).post(anyString(), any());
    }

    @Test
    @DisplayName("a finished or closed interview is refused with the page's message")
    void noLongerAllowed() {
        when(interviewEligibilityService.describeAccess(application))
                .thenReturn(new InterviewAccess(false, false, null,
                        "You have already completed the interview for this job."));

        ConflictException refused = assertThrows(ConflictException.class,
                () -> service.resume("cara@example.com", SESSION_ID));

        assertEquals("You have already completed the interview for this job.", refused.getMessage());
        verify(aiServiceClient, never()).post(anyString(), any());
    }

    @Test
    @DisplayName("only the application's own attempt can be resumed")
    void differentAttempt() {
        when(interviewEligibilityService.describeAccess(application))
                .thenReturn(new InterviewAccess(true, true, "another-session", null));

        assertThrows(ConflictException.class,
                () -> service.resume("cara@example.com", SESSION_ID));
        verify(aiServiceClient, never()).post(anyString(), any());
    }
}
