package com.aiinterview.service;

import com.aiinterview.dto.RecruiterOverviewResponse;
import com.aiinterview.entity.InterviewSession;
import com.aiinterview.entity.InterviewTurn;
import com.aiinterview.entity.User;
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.service.impl.RecruiterDashboardServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecruiterDashboardServiceTest {

    @Mock
    private InterviewSessionRepository interviewSessionRepository;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private RecruiterDashboardServiceImpl service;

    private User alice;
    private User bob;

    @BeforeEach
    void setUp() {
        alice = User.builder().id(1L).name("Alice").email("alice@example.com").build();
        bob = User.builder().id(2L).name("Bob").email("bob@example.com").build();
    }

    private InterviewSession session(
            Long id, User user, String status, Integer score, String jobDescription
    ) {
        InterviewSession s = new InterviewSession();
        s.setId(id);
        s.setSessionId("sess-" + id);
        s.setUser(user);
        s.setStatus(status);
        s.setScore(score);
        s.setJobDescription(jobDescription);
        s.setQuestionCount(5);
        s.setStartedAt(LocalDateTime.now());
        return s;
    }

    @Test
    @DisplayName("counts distinct candidates, not interviews")
    void countsDistinctCandidates() {
        // Alice sat two interviews; that is one candidate, two interviews.
        when(interviewSessionRepository.findAllWithUser()).thenReturn(List.of(
                session(1L, alice, "completed", 80, "Backend Developer"),
                session(2L, alice, "completed", 90, "Backend Developer"),
                session(3L, bob, "completed", 70, "Frontend Developer")
        ));

        RecruiterOverviewResponse r = service.getOverview();

        assertEquals(2, r.getTotalCandidates());
        assertEquals(3, r.getTotalInterviews());
        assertEquals(3, r.getCompletedInterviews());
    }

    @Test
    @DisplayName("averages only graded interviews, so an unfinished one is not a zero")
    void averageIgnoresUngraded() {
        when(interviewSessionRepository.findAllWithUser()).thenReturn(List.of(
                session(1L, alice, "completed", 80, "Backend Developer"),
                session(2L, bob, "completed", 90, "Backend Developer"),
                session(3L, bob, "active", null, "Backend Developer")
        ));

        RecruiterOverviewResponse r = service.getOverview();

        // (80 + 90) / 2, not (80 + 90 + 0) / 3
        assertEquals(85, r.getAverageScore());
        assertEquals(1, r.getInProgressInterviews());
    }

    @Test
    @DisplayName("average is null, never zero, when nothing has been graded")
    void averageNullWhenNothingScored() {
        when(interviewSessionRepository.findAllWithUser()).thenReturn(List.of(
                session(1L, alice, "active", null, "Backend Developer")
        ));

        assertNull(service.getOverview().getAverageScore());
    }

    @Test
    @DisplayName("empty database gives zeros and an empty list, not an error")
    void handlesEmptyDatabase() {
        when(interviewSessionRepository.findAllWithUser()).thenReturn(List.of());

        RecruiterOverviewResponse r = service.getOverview();

        assertEquals(0, r.getTotalCandidates());
        assertEquals(0, r.getTotalInterviews());
        assertNull(r.getAverageScore());
        assertTrue(r.getCandidates().isEmpty());
    }

    @Test
    @DisplayName("role is the first line of the job description, trimmed")
    void derivesRole() {
        when(interviewSessionRepository.findAllWithUser()).thenReturn(List.of(
                session(1L, alice, "completed", 80,
                        "Junior Java backend developer. Must know Spring Boot.\nAlso PostgreSQL.")
        ));

        assertEquals(
                "Junior Java backend developer",
                service.getOverview().getCandidates().get(0).getRole()
        );
    }

    @Test
    @DisplayName("a blank job description still yields a usable label")
    void blankJobDescription() {
        when(interviewSessionRepository.findAllWithUser()).thenReturn(List.of(
                session(1L, alice, "completed", 80, "  ")
        ));

        assertEquals("Interview", service.getOverview().getCandidates().get(0).getRole());
    }

    @Test
    @DisplayName("counts answered turns, not questions asked")
    void countsAnsweredTurns() {
        InterviewSession s = session(1L, alice, "completed", 80, "Backend Developer");
        s.addTurn(InterviewTurn.builder().question("Q1").answer("A1").build());
        s.addTurn(InterviewTurn.builder().question("Q2").answer("  ").build());
        s.addTurn(InterviewTurn.builder().question("Q3").answer(null).build());

        when(interviewSessionRepository.findAllWithUser()).thenReturn(List.of(s));

        assertEquals(1, service.getOverview().getCandidates().get(0).getAnsweredCount());
    }

    @Test
    @DisplayName("reads category scores out of the stored scorecard")
    void readsCategoryScores() {
        InterviewSession s = session(1L, alice, "completed", 80, "Backend Developer");
        s.setFeedbackJson("""
                {"overall_score": 80, "category_scores": [
                  {"key": "technical_knowledge", "label": "Technical Knowledge", "score": 75},
                  {"key": "communication", "label": "Communication", "score": 85}
                ]}""");

        when(interviewSessionRepository.findAllWithUser()).thenReturn(List.of(s));

        var scores = service.getOverview().getCandidates().get(0).getCategoryScores();

        assertEquals(2, scores.size());
        assertEquals("technical_knowledge", scores.get(0).getKey());
        assertEquals(75, scores.get(0).getScore());
    }

    @Test
    @DisplayName("a malformed scorecard is skipped, not fatal")
    void malformedScorecardIsSkipped() {
        InterviewSession s = session(1L, alice, "completed", 80, "Backend Developer");
        s.setFeedbackJson("{ this is not json");

        when(interviewSessionRepository.findAllWithUser()).thenReturn(List.of(s));

        RecruiterOverviewResponse r = service.getOverview();

        assertEquals(1, r.getCandidates().size());
        assertTrue(r.getCandidates().get(0).getCategoryScores().isEmpty());
    }

    @Test
    @DisplayName("a session whose user vanished still lists")
    void toleratesMissingUser() {
        when(interviewSessionRepository.findAllWithUser()).thenReturn(List.of(
                session(1L, null, "completed", 80, "Backend Developer")
        ));

        var candidate = service.getOverview().getCandidates().get(0);

        assertEquals("Unknown candidate", candidate.getCandidateName());
        assertNull(candidate.getCandidateEmail());
    }
}
