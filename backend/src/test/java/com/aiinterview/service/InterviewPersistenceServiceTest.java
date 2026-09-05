package com.aiinterview.service;

import com.aiinterview.entity.InterviewSession;
import com.aiinterview.entity.InterviewTurn;
import com.aiinterview.entity.Resume;
import com.aiinterview.entity.User;
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.repository.ResumeRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.impl.InterviewPersistenceServiceImpl;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers interview persistence: Tests 1 to 3 and the isolation half of
 * Test 9 of the module spec.
 *
 * <p>Bodies are written as real JSON in the shape the Python AI service
 * actually returns, so a change to that contract shows up here.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class InterviewPersistenceServiceTest {

    private static final String EMAIL = "candidate@example.com";

    private static final String SESSION_ID = "sess-abc123";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private InterviewSessionRepository interviewSessionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ResumeRepository resumeRepository;

    private InterviewPersistenceServiceImpl persistenceService;

    private User user;

    @BeforeEach
    void setUp() {

        user = User.builder().id(7L).email(EMAIL).build();

        persistenceService = new InterviewPersistenceServiceImpl(
                interviewSessionRepository,
                userRepository,
                resumeRepository,
                objectMapper
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
    }

    private JsonNode json(String raw) {
        try {
            return objectMapper.readTree(raw);
        } catch (Exception e) {
            throw new IllegalArgumentException(e);
        }
    }

    private InterviewSession captureSaved() {

        ArgumentCaptor<InterviewSession> captor =
                ArgumentCaptor.forClass(InterviewSession.class);

        verify(interviewSessionRepository).save(captor.capture());

        return captor.getValue();
    }

    // ========================================================
    // Test 1 - start
    // ========================================================

    @Test
    @DisplayName("Start stores the session, the user and the first question")
    void recordStart() {

        when(interviewSessionRepository.findBySessionId(SESSION_ID))
                .thenReturn(Optional.empty());

        JsonNode request = json("""
                {
                  "job_description": "Backend engineer working on Spring Boot services",
                  "candidate_resume": "Java, Spring, PostgreSQL"
                }
                """);

        JsonNode response = json("""
                {
                  "session_id": "sess-abc123",
                  "question": {
                    "session_id": "sess-abc123",
                    "question": "Explain the JVM memory model.",
                    "category": "technical_knowledge",
                    "difficulty": "medium",
                    "is_follow_up": false,
                    "reason": "Opening question for a backend role."
                  }
                }
                """);

        persistenceService.recordStart(EMAIL, request, response);

        InterviewSession saved = captureSaved();

        assertEquals(SESSION_ID, saved.getSessionId());
        assertEquals(user, saved.getUser());
        assertEquals(
                "Backend engineer working on Spring Boot services",
                saved.getJobDescription()
        );
        assertEquals(InterviewSession.STATUS_ACTIVE, saved.getStatus());
        assertNotNull(saved.getStartedAt());
        assertEquals(1, saved.getQuestionCount());
        assertEquals(1, saved.getCurrentQuestionNumber());

        assertEquals(1, saved.getTurns().size());

        InterviewTurn first = saved.getTurns().get(0);

        assertEquals(1, first.getTurnNumber());
        assertEquals("Explain the JVM memory model.", first.getQuestion());
        assertEquals("technical_knowledge", first.getCategory());
        assertEquals("medium", first.getDifficulty());
        assertEquals(Boolean.FALSE, first.getFollowUp());
        assertEquals("Opening question for a backend role.", first.getReason());

        // Not answered yet.
        assertNull(first.getAnswer());
        assertNull(first.getAnsweredAt());
    }

    @Test
    @DisplayName("Start links a resume the candidate owns")
    void recordStartLinksOwnedResume() {

        Resume resume = Resume.builder().id(42L).build();

        when(interviewSessionRepository.findBySessionId(SESSION_ID))
                .thenReturn(Optional.empty());

        when(resumeRepository.findByIdAndUserId(42L, 7L))
                .thenReturn(Optional.of(resume));

        persistenceService.recordStart(
                EMAIL,
                json("""
                        {"job_description": "Backend engineer", "resume_id": 42}
                        """),
                json("""
                        {"session_id": "sess-abc123", "question": {"question": "Q1"}}
                        """)
        );

        assertEquals(resume, captureSaved().getResume());
    }

    @Test
    @DisplayName("A resume id the candidate does not own is stored as no resume")
    void recordStartIgnoresForeignResume() {

        when(interviewSessionRepository.findBySessionId(SESSION_ID))
                .thenReturn(Optional.empty());

        // CVUpload falls back to Date.now() when an upload returns no
        // id, so ids arriving here are not trustworthy.
        when(resumeRepository.findByIdAndUserId(999L, 7L))
                .thenReturn(Optional.empty());

        persistenceService.recordStart(
                EMAIL,
                json("""
                        {"job_description": "Backend engineer", "resume_id": 999}
                        """),
                json("""
                        {"session_id": "sess-abc123", "question": {"question": "Q1"}}
                        """)
        );

        // Stored without a resume rather than failing the interview.
        assertNull(captureSaved().getResume());
    }

    @Test
    @DisplayName("A replayed start does not create a second session")
    void recordStartIsIdempotent() {

        when(interviewSessionRepository.findBySessionId(SESSION_ID))
                .thenReturn(Optional.of(new InterviewSession()));

        persistenceService.recordStart(
                EMAIL,
                json("{}"),
                json("""
                        {"session_id": "sess-abc123", "question": {"question": "Q1"}}
                        """)
        );

        verify(interviewSessionRepository, never()).save(any());
    }

    // ========================================================
    // Test 2 - answer
    // ========================================================

    @Test
    @DisplayName("Answer fills in the open question and appends the next one")
    void recordAnswer() {

        InterviewSession session = activeSessionWithOpenQuestion();

        when(interviewSessionRepository.findBySessionId(SESSION_ID))
                .thenReturn(Optional.of(session));

        persistenceService.recordAnswer(
                EMAIL,
                json("""
                        {
                          "session_id": "sess-abc123",
                          "answer": "The heap holds objects; the stack holds frames.",
                          "answer_mode": "voice"
                        }
                        """),
                json("""
                        {
                          "session_id": "sess-abc123",
                          "question": {
                            "question": "How does garbage collection decide what to free?",
                            "category": "depth",
                            "difficulty": "hard",
                            "is_follow_up": true,
                            "reason": "Following up on the memory answer."
                          }
                        }
                        """)
        );

        InterviewSession saved = captureSaved();

        assertEquals(2, saved.getTurns().size());

        InterviewTurn answered = saved.getTurns().get(0);

        assertEquals(
                "The heap holds objects; the stack holds frames.",
                answered.getAnswer()
        );
        assertNotNull(answered.getAnsweredAt());
        assertEquals("voice", answered.getAnswerMode());

        // The question it belongs to is preserved, not overwritten.
        assertEquals("Explain the JVM memory model.", answered.getQuestion());

        InterviewTurn next = saved.getTurns().get(1);

        assertEquals(2, next.getTurnNumber());
        assertEquals(
                "How does garbage collection decide what to free?",
                next.getQuestion()
        );
        assertEquals("hard", next.getDifficulty());
        assertEquals(Boolean.TRUE, next.getFollowUp());
        assertNull(next.getAnswer());

        assertEquals(2, saved.getQuestionCount());
        assertEquals(2, saved.getCurrentQuestionNumber());
        assertNotNull(saved.getUpdatedAt());
    }

    // ========================================================
    // Test 3 - finish
    // ========================================================

    @Test
    @DisplayName("Finish completes the session and stores the scorecard")
    void recordFinish() {

        InterviewSession session = activeSessionWithOpenQuestion();

        when(interviewSessionRepository.findBySessionId(SESSION_ID))
                .thenReturn(Optional.of(session));

        persistenceService.recordFinish(
                EMAIL,
                json("""
                        {"session_id": "sess-abc123"}
                        """),
                json("""
                        {
                          "session_id": "sess-abc123",
                          "status": "completed",
                          "total_questions": 5,
                          "overall_score": 84,
                          "evaluated": true,
                          "strengths": ["Clear explanation of trade-offs."],
                          "improvements": ["Give concrete examples."],
                          "category_scores": [{"key": "depth", "label": "Depth", "score": 80}]
                        }
                        """)
        );

        InterviewSession saved = captureSaved();

        assertEquals(InterviewSession.STATUS_COMPLETED, saved.getStatus());
        assertNotNull(saved.getCompletedAt());
        assertEquals(84, saved.getScore());
        assertEquals(5, saved.getQuestionCount());
        assertEquals("Clear explanation of trade-offs.", saved.getFeedbackSummary());

        // The whole scorecard is kept verbatim.
        assertNotNull(saved.getFeedbackJson());
        assertTrue(saved.getFeedbackJson().contains("category_scores"));

        // The transcript is untouched by finishing.
        assertEquals(1, saved.getTurns().size());
    }

    @Test
    @DisplayName("An ungraded interview stores no score rather than a zero")
    void recordFinishStoresNoScoreWhenGradingFailed() {

        InterviewSession session = activeSessionWithOpenQuestion();

        when(interviewSessionRepository.findBySessionId(SESSION_ID))
                .thenReturn(Optional.of(session));

        // What the AI service returns when grading could not run: a
        // zero that does not mean the candidate scored zero.
        persistenceService.recordFinish(
                EMAIL,
                json("""
                        {"session_id": "sess-abc123"}
                        """),
                json("""
                        {
                          "session_id": "sess-abc123",
                          "status": "completed",
                          "total_questions": 5,
                          "overall_score": 0,
                          "evaluated": false,
                          "evaluation_error": "Gemini rate limit reached."
                        }
                        """)
        );

        InterviewSession saved = captureSaved();

        assertEquals(InterviewSession.STATUS_COMPLETED, saved.getStatus());
        assertNull(saved.getScore());
        assertEquals("Gemini rate limit reached.", saved.getFeedbackSummary());
    }

    @Test
    @DisplayName("Finishing an already completed session changes nothing")
    void recordFinishIsIdempotent() {

        InterviewSession session = activeSessionWithOpenQuestion();
        session.setStatus(InterviewSession.STATUS_COMPLETED);

        when(interviewSessionRepository.findBySessionId(SESSION_ID))
                .thenReturn(Optional.of(session));

        persistenceService.recordFinish(
                EMAIL,
                json("""
                        {"session_id": "sess-abc123"}
                        """),
                json("""
                        {"overall_score": 10, "evaluated": true}
                        """)
        );

        verify(interviewSessionRepository, never()).save(any());
    }

    // ========================================================
    // Test 9 - user isolation
    // ========================================================

    @Test
    @DisplayName("A candidate cannot write into another candidate's interview")
    void refusesToModifyAnotherUsersSession() {

        User otherCandidate = User.builder().id(99L).email("other@example.com").build();

        InterviewSession session = activeSessionWithOpenQuestion();
        session.setUser(otherCandidate);

        when(interviewSessionRepository.findBySessionId(SESSION_ID))
                .thenReturn(Optional.of(session));

        // The session id travels through the browser, so knowing one
        // must not be enough to write into it.
        persistenceService.recordAnswer(
                EMAIL,
                json("""
                        {"session_id": "sess-abc123", "answer": "injected"}
                        """),
                json("""
                        {"question": {"question": "Q2"}}
                        """)
        );

        persistenceService.recordFinish(
                EMAIL,
                json("""
                        {"session_id": "sess-abc123"}
                        """),
                json("""
                        {"overall_score": 100, "evaluated": true}
                        """)
        );

        verify(interviewSessionRepository, never()).save(any());

        assertNull(session.getTurns().get(0).getAnswer());
        assertEquals(InterviewSession.STATUS_ACTIVE, session.getStatus());
    }

    // ========================================================
    // Malformed input
    // ========================================================

    @Test
    @DisplayName("A response with no session id is skipped rather than stored blank")
    void startWithoutSessionIdIsSkipped() {

        persistenceService.recordStart(
                EMAIL,
                json("{}"),
                json("""
                        {"question": {"question": "Q1"}}
                        """)
        );

        verify(interviewSessionRepository, never()).save(any());
    }

    @Test
    @DisplayName("An interview that was never stored is skipped, not created mid-flight")
    void answerForUnknownSessionIsSkipped() {

        when(interviewSessionRepository.findBySessionId(SESSION_ID))
                .thenReturn(Optional.empty());

        persistenceService.recordAnswer(
                EMAIL,
                json("""
                        {"session_id": "sess-abc123", "answer": "hello"}
                        """),
                json("""
                        {"question": {"question": "Q2"}}
                        """)
        );

        verify(interviewSessionRepository, never()).save(any());
    }

    // ========================================================
    // Fixtures
    // ========================================================

    private InterviewSession activeSessionWithOpenQuestion() {

        InterviewSession session = InterviewSession.builder()
                .id(1L)
                .sessionId(SESSION_ID)
                .user(user)
                .status(InterviewSession.STATUS_ACTIVE)
                .startedAt(LocalDateTime.now())
                .build();

        session.addTurn(InterviewTurn.builder()
                .question("Explain the JVM memory model.")
                .category("technical_knowledge")
                .difficulty("medium")
                .build());

        return session;
    }
}
