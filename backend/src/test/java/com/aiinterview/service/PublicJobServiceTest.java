package com.aiinterview.service;

import com.aiinterview.dto.PublicJobDetailDto;
import com.aiinterview.dto.PublicJobDto;
import com.aiinterview.entity.ApplicationStatus;
import com.aiinterview.entity.JobApplication;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.JobPublicationStatus;
import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.JobApplicationRepository;
import com.aiinterview.repository.JobPostingRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.impl.PublicJobServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Tests for what candidates can read under Public Jobs.
 *
 * <p>The listing filter itself is the repository query (published and
 * not archived); these check that only that query is used, and that
 * nothing private - the invite code above all - is in a response.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PublicJobServiceTest {

    private static final String CANDIDATE = "cara@example.com";

    @Mock
    private JobPostingRepository jobPostingRepository;

    @Mock
    private JobApplicationRepository jobApplicationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private InterviewEligibilityService interviewEligibilityService;

    @InjectMocks
    private PublicJobServiceImpl service;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    private User candidate;
    private JobPosting job;

    @BeforeEach
    void setUp() {
        candidate = User.builder().id(20L).name("Cara").email(CANDIDATE).role(Role.CANDIDATE).build();
        User recruiter = User.builder().id(10L).name("Rita").email("rita@example.com").role(Role.RECRUITER).build();

        job = JobPosting.builder()
                .id(5L)
                .recruiter(recruiter)
                .title("Java Backend Intern")
                .company("Example Co")
                .jobField("backend_development")
                .jobDescription("Build REST APIs in Spring Boot with PostgreSQL.")
                .inviteCode("ABCD-EF23")
                .open(true)
                .publicationStatus(JobPublicationStatus.PUBLISHED)
                .publishedAt(LocalDateTime.now())
                .requiredSkills(new ArrayList<>(List.of("java", "postgresql")))
                .build();

        when(userRepository.findByEmail(CANDIDATE)).thenReturn(Optional.of(candidate));
        when(jobPostingRepository.findByPublicationStatusAndArchivedFalseOrderByPublishedAtDesc(
                JobPublicationStatus.PUBLISHED)).thenReturn(List.of(job));
        when(jobPostingRepository.findByIdAndPublicationStatusAndArchivedFalse(5L, JobPublicationStatus.PUBLISHED))
                .thenReturn(Optional.of(job));
        when(jobApplicationRepository.findByJobPostingIdAndCandidateId(any(), any()))
                .thenReturn(Optional.empty());
    }

    @Test
    @DisplayName("the list shows published jobs, closed ones marked closed")
    void listsPublishedJobs() {
        job.setOpen(false);

        List<PublicJobDto> jobs = service.listPublished();

        assertEquals(1, jobs.size());
        assertEquals("Java Backend Intern", jobs.get(0).getTitle());
        assertFalse(jobs.get(0).isOpen());
    }

    @Test
    @DisplayName("no public response carries the invite code or the recruiter's email")
    void nothingPrivateIsExposed() throws Exception {
        String list = objectMapper.writeValueAsString(service.listPublished());
        String detail = objectMapper.writeValueAsString(service.getPublished(CANDIDATE, 5L));

        for (String body : List.of(list, detail)) {
            assertFalse(body.contains("ABCD-EF23"), body);
            assertFalse(body.toLowerCase().contains("invitecode"), body);
            assertFalse(body.contains("rita@example.com"), body);
        }
    }

    @Test
    @DisplayName("a job that is not listed cannot be read by its id")
    void unlistedJobIsNotFound() {
        // Draft, archived and missing all come back empty from the
        // listed-only lookup.
        when(jobPostingRepository.findByIdAndPublicationStatusAndArchivedFalse(6L, JobPublicationStatus.PUBLISHED))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.getPublished(CANDIDATE, 6L));
    }

    @Test
    @DisplayName("the detail shows the candidate's own application, so they cannot apply twice")
    void detailShowsOwnApplication() {
        JobApplication mine = JobApplication.builder()
                .id(77L)
                .jobPosting(job)
                .candidate(candidate)
                .status(ApplicationStatus.APPLIED)
                .build();

        when(jobApplicationRepository.findByJobPostingIdAndCandidateId(5L, 20L)).thenReturn(Optional.of(mine));
        when(interviewEligibilityService.describeAccess(mine)).thenReturn(
                new InterviewEligibilityService.InterviewAccess(false, false, null, "Under review"));

        PublicJobDetailDto detail = service.getPublished(CANDIDATE, 5L);

        assertEquals(77L, detail.getApplicationId());
        assertEquals("APPLIED", detail.getApplicationStatus());
        assertFalse(detail.isInterviewAvailable());
    }

    @Test
    @DisplayName("a candidate who has not applied sees no application")
    void detailWithoutApplication() {
        PublicJobDetailDto detail = service.getPublished(CANDIDATE, 5L);

        assertNull(detail.getApplicationId());
        assertNull(detail.getApplicationStatus());
        assertEquals("Rita", detail.getRecruiterName());
    }
}
