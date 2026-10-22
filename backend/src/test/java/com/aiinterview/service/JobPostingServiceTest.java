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
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.repository.JobPostingRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.impl.JobPostingServiceImpl;
import com.fasterxml.jackson.databind.JsonNode;
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

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
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
                .build());

        assertTrue(created.isOpen());
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
    @DisplayName("a code replaces the job text and forces exam mode")
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
        assertEquals("my cv", forwarded.get("candidate_resume").asText());
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
