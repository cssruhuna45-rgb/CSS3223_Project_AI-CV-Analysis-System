package com.aiinterview.service;

import com.aiinterview.dto.RecruiterOverviewResponse;
import com.aiinterview.entity.InterviewSession;
import com.aiinterview.entity.InterviewTurn;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.repository.UserRepository;
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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecruiterDashboardServiceTest {

    private static final long RECRUITER_ID = 50L;

    private static final String RECRUITER_EMAIL = "recruiter@example.com";

    @Mock
    private InterviewSessionRepository interviewSessionRepository;

    @Mock
    private UserRepository userRepository;

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

        User recruiter = User.builder().id(RECRUITER_ID).email(RECRUITER_EMAIL).role(Role.RECRUITER).build();
        when(userRepository.findByEmail(RECRUITER_EMAIL)).thenReturn(Optional.of(recruiter));
    }

    private JobPosting job(long id, String title) {
        return JobPosting.builder().id(id).title(title).build();
    }

    @Test
    @DisplayName("integrity signals are summed over the answers that recorded them")
    void sumsIntegritySignals() {
        InterviewSession exam = session(1L, alice, "completed", 80, "Backend Developer");
        exam.addTurn(InterviewTurn.builder().question("Q1").answer("A1")
                .leftPageCount(1).awaySeconds(20).pasteCount(0).pastedChars(0).build());
        exam.addTurn(InterviewTurn.builder().question("Q2").answer("A2")
                .leftPageCount(2).awaySeconds(15).pasteCount(1).pastedChars(300).build());

        InterviewSession old = session(2L, bob, "completed", 70, "Backend Developer");
        old.addTurn(InterviewTurn.builder().question("Q1").answer("A1").build());

        when(interviewSessionRepository.findForRecruiter(RECRUITER_ID)).thenReturn(List.of(exam, old));

        var rows = service.getOverview(RECRUITER_EMAIL, null).getCandidates();

        assertEquals(3, rows.get(0).getLeftPageCount());
        assertEquals(35, rows.get(0).getAwaySeconds());
        assertEquals(1, rows.get(0).getPasteCount());
        assertEquals(300, rows.get(0).getPastedChars());
        // Nothing recorded is null, not 0: "not watched" is not "clean".
        assertNull(rows.get(1).getLeftPageCount());
    }

    @Test
    @DisplayName("asks only for the signed-in recruiter's interviews")
    void scopedToRecruiter() {
        when(interviewSessionRepository.findForRecruiter(RECRUITER_ID)).thenReturn(List.of());

        service.getOverview(RECRUITER_EMAIL, null);

        verify(interviewSessionRepository).findForRecruiter(RECRUITER_ID);
    }

    @Test
    @DisplayName("a job filter narrows to that job and labels rows with its title")
    void filtersByJob() {
        InterviewSession backend = session(1L, alice, "completed", 80, "long text");
        backend.setJobPosting(job(7L, "Java Backend Intern"));
        InterviewSession frontend = session(2L, bob, "completed", 70, "long text");
        frontend.setJobPosting(job(8L, "React Intern"));

        when(interviewSessionRepository.findForRecruiter(RECRUITER_ID))
                .thenReturn(List.of(backend, frontend));

        RecruiterOverviewResponse r = service.getOverview(RECRUITER_EMAIL, 7L);

        assertEquals(1, r.getTotalInterviews());
        assertEquals("Java Backend Intern", r.getCandidates().get(0).getRole());
        assertEquals(7L, r.getCandidates().get(0).getJobId());
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
        when(interviewSessionRepository.findForRecruiter(RECRUITER_ID)).thenReturn(List.of(
                session(1L, alice, "completed", 80, "Backend Developer"),
                session(2L, alice, "completed", 90, "Backend Developer"),
                session(3L, bob, "completed", 70, "Frontend Developer")
        ));

        RecruiterOverviewResponse r = service.getOverview(RECRUITER_EMAIL, null);

        assertEquals(2, r.getTotalCandidates());
        assertEquals(3, r.getTotalInterviews());
        assertEquals(3, r.getCompletedInterviews());
    }

    @Test
    @DisplayName("averages only graded interviews, so an unfinished one is not a zero")
    void averageIgnoresUngraded() {
        when(interviewSessionRepository.findForRecruiter(RECRUITER_ID)).thenReturn(List.of(
                session(1L, alice, "completed", 80, "Backend Developer"),
                session(2L, bob, "completed", 90, "Backend Developer"),
                session(3L, bob, "active", null, "Backend Developer")
        ));

        RecruiterOverviewResponse r = service.getOverview(RECRUITER_EMAIL, null);

        // (80 + 90) / 2, not (80 + 90 + 0) / 3
        assertEquals(85, r.getAverageScore());
        assertEquals(1, r.getInProgressInterviews());
    }

    @Test
    @DisplayName("average is null, never zero, when nothing has been graded")
    void averageNullWhenNothingScored() {
        when(interviewSessionRepository.findForRecruiter(RECRUITER_ID)).thenReturn(List.of(
                session(1L, alice, "active", null, "Backend Developer")
        ));

        assertNull(service.getOverview(RECRUITER_EMAIL, null).getAverageScore());
    }

    @Test
    @DisplayName("empty database gives zeros and an empty list, not an error")
    void handlesEmptyDatabase() {
        when(interviewSessionRepository.findForRecruiter(RECRUITER_ID)).thenReturn(List.of());

        RecruiterOverviewResponse r = service.getOverview(RECRUITER_EMAIL, null);

        assertEquals(0, r.getTotalCandidates());
        assertEquals(0, r.getTotalInterviews());
        assertNull(r.getAverageScore());
        assertTrue(r.getCandidates().isEmpty());
    }

    @Test
    @DisplayName("role is the first line of the job description, trimmed")
    void derivesRole() {
        when(interviewSessionRepository.findForRecruiter(RECRUITER_ID)).thenReturn(List.of(
                session(1L, alice, "completed", 80,
                        "Junior Java backend developer. Must know Spring Boot.\nAlso PostgreSQL.")
        ));

        assertEquals(
                "Junior Java backend developer",
                service.getOverview(RECRUITER_EMAIL, null).getCandidates().get(0).getRole()
        );
    }

    @Test
    @DisplayName("a blank job description still yields a usable label")
    void blankJobDescription() {
        when(interviewSessionRepository.findForRecruiter(RECRUITER_ID)).thenReturn(List.of(
                session(1L, alice, "completed", 80, "  ")
        ));

        assertEquals("Interview", service.getOverview(RECRUITER_EMAIL, null).getCandidates().get(0).getRole());
    }

    @Test
    @DisplayName("counts answered turns, not questions asked")
    void countsAnsweredTurns() {
        InterviewSession s = session(1L, alice, "completed", 80, "Backend Developer");
        s.addTurn(InterviewTurn.builder().question("Q1").answer("A1").build());
        s.addTurn(InterviewTurn.builder().question("Q2").answer("  ").build());
        s.addTurn(InterviewTurn.builder().question("Q3").answer(null).build());

        when(interviewSessionRepository.findForRecruiter(RECRUITER_ID)).thenReturn(List.of(s));

        assertEquals(1, service.getOverview(RECRUITER_EMAIL, null).getCandidates().get(0).getAnsweredCount());
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

        when(interviewSessionRepository.findForRecruiter(RECRUITER_ID)).thenReturn(List.of(s));

        var scores = service.getOverview(RECRUITER_EMAIL, null).getCandidates().get(0).getCategoryScores();

        assertEquals(2, scores.size());
        assertEquals("technical_knowledge", scores.get(0).getKey());
        assertEquals(75, scores.get(0).getScore());
    }

    @Test
    @DisplayName("a malformed scorecard is skipped, not fatal")
    void malformedScorecardIsSkipped() {
        InterviewSession s = session(1L, alice, "completed", 80, "Backend Developer");
        s.setFeedbackJson("{ this is not json");

        when(interviewSessionRepository.findForRecruiter(RECRUITER_ID)).thenReturn(List.of(s));

        RecruiterOverviewResponse r = service.getOverview(RECRUITER_EMAIL, null);

        assertEquals(1, r.getCandidates().size());
        assertTrue(r.getCandidates().get(0).getCategoryScores().isEmpty());
    }

    @Test
    @DisplayName("a session whose user vanished still lists")
    void toleratesMissingUser() {
        when(interviewSessionRepository.findForRecruiter(RECRUITER_ID)).thenReturn(List.of(
                session(1L, null, "completed", 80, "Backend Developer")
        ));

        var candidate = service.getOverview(RECRUITER_EMAIL, null).getCandidates().get(0);

        assertEquals("Unknown candidate", candidate.getCandidateName());
        assertNull(candidate.getCandidateEmail());
    }
}
